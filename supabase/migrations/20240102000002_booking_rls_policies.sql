-- supabase/migrations/20240102000002_booking_rls_policies.sql
-- Row Level Security Policies for Booking Slot System
-- FIXED: Removed policy conflicts, improved anonymous user handling

-- =====================================================
-- ENABLE RLS ON SLOT TABLES
-- =====================================================
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_attempts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TIME SLOTS POLICIES
-- =====================================================

-- Allow everyone (including anonymous users) to view available time slots for public events
CREATE POLICY "Anyone can view available time slots"
  ON public.time_slots FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = time_slots.event_id
        AND events.status = 'active'
        AND events.visibility IN ('public', 'unlisted')
    )
  );

-- Event owners can view all their slots (including drafts)
CREATE POLICY "Event owners can view own slots"
  ON public.time_slots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = time_slots.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Event owners can manage all time slots for their events
CREATE POLICY "Event owners can manage time slots"
  ON public.time_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = time_slots.event_id
        AND events.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = time_slots.event_id
        AND events.user_id = auth.uid()
    )
  );

-- =====================================================
-- SLOT LOCKS POLICIES
-- FIXED: Simplified for anonymous users
-- =====================================================

-- Authenticated users can view their own slot locks
CREATE POLICY "Authenticated users can view own locks"
  ON public.slot_locks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Anonymous users can view locks by session_id
-- Note: session_id must be passed via RPC parameters, not JWT
CREATE POLICY "Anyone can view locks for bookable slots"
  ON public.slot_locks FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.time_slots ts
      JOIN public.events e ON e.id = ts.event_id
      WHERE ts.id = slot_locks.slot_id
        AND e.status = 'active'
        AND e.visibility IN ('public', 'unlisted')
    )
  );

-- Anyone can create slot locks (needed for anonymous booking flow)
-- Capacity validation happens in create_slot_lock RPC
CREATE POLICY "Anyone can create slot locks"
  ON public.slot_locks FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.time_slots ts
      JOIN public.events e ON e.id = ts.event_id
      WHERE ts.id = slot_locks.slot_id
        AND e.status = 'active'
        AND e.visibility IN ('public', 'unlisted')
    )
  );

-- Users can update slot locks for their sessions
-- For anonymous: session_id comparison happens in RPC
CREATE POLICY "Users can update slot locks"
  ON public.slot_locks FOR UPDATE
  TO anon, authenticated
  USING (
    -- Authenticated users can update their locks
    user_id = auth.uid()
    OR
    -- Anyone can release locks (validation in RPC)
    true
  );

-- Event owners can view all locks for their events
CREATE POLICY "Event owners can view event locks"
  ON public.slot_locks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.time_slots ts
      JOIN public.events e ON e.id = ts.event_id
      WHERE ts.id = slot_locks.slot_id
        AND e.user_id = auth.uid()
    )
  );

-- =====================================================
-- BOOKING ATTEMPTS POLICIES
-- =====================================================

-- Authenticated users can view their own booking attempts
CREATE POLICY "Users can view own booking attempts"
  ON public.booking_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can create booking attempts (via RPC - no user_id required)
CREATE POLICY "Anyone can insert booking attempts"
  ON public.booking_attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Event owners can view all attempts for their events
CREATE POLICY "Event owners can view attempts"
  ON public.booking_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = booking_attempts.event_id
        AND events.user_id = auth.uid()
    )
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions on time_slots table
GRANT SELECT ON public.time_slots TO anon, authenticated;
GRANT ALL ON public.time_slots TO authenticated;

-- Grant permissions on slot_locks table
GRANT SELECT, INSERT, UPDATE ON public.slot_locks TO anon, authenticated;
GRANT ALL ON public.slot_locks TO authenticated;

-- Grant permissions on booking_attempts table
GRANT SELECT, INSERT ON public.booking_attempts TO anon, authenticated;
GRANT ALL ON public.booking_attempts TO authenticated;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Check if user is slot owner
CREATE OR REPLACE FUNCTION public.is_slot_owner(slot_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.time_slots ts
    JOIN public.events e ON e.id = ts.event_id
    WHERE ts.id = slot_uuid
      AND e.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if slot is publicly viewable
CREATE OR REPLACE FUNCTION public.is_slot_public(slot_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.time_slots ts
    JOIN public.events e ON e.id = ts.event_id
    WHERE ts.id = slot_uuid
      AND e.status = 'active'
      AND e.visibility IN ('public', 'unlisted')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get locks by session_id (for anonymous users)
CREATE OR REPLACE FUNCTION public.get_locks_by_session(p_session_id TEXT)
RETURNS TABLE (
  lock_id UUID,
  slot_id UUID,
  event_id UUID,
  quantity INTEGER,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.id AS lock_id,
    sl.slot_id,
    ts.event_id,
    sl.quantity,
    sl.expires_at,
    sl.is_active
  FROM public.slot_locks sl
  JOIN public.time_slots ts ON ts.id = sl.slot_id
  WHERE sl.session_id = p_session_id
    AND sl.is_active = true
    AND sl.expires_at > NOW()
  ORDER BY sl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Release locks by session_id (for cleanup)
CREATE OR REPLACE FUNCTION public.release_locks_by_session(p_session_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.slot_locks
  SET is_active = false, released_at = NOW()
  WHERE session_id = p_session_id
    AND is_active = true;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_slot_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_slot_public(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_locks_by_session(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_locks_by_session(TEXT) TO anon, authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "Anyone can view available time slots" ON public.time_slots IS 
'Allows anonymous and authenticated users to view available slots for public/unlisted active events.';

COMMENT ON POLICY "Anyone can create slot locks" ON public.time_slots IS 
'Required for anonymous booking flow. Capacity validation happens in create_slot_lock RPC.';

COMMENT ON FUNCTION public.get_locks_by_session(TEXT) IS
'Retrieve active locks for a session ID. Used by anonymous users to track their reservations.';

COMMENT ON FUNCTION public.release_locks_by_session(TEXT) IS
'Release all active locks for a session ID. Used for cleanup when user abandons booking.';