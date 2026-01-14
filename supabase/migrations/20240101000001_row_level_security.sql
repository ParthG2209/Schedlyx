-- supabase/migrations/20240101000001_row_level_security.sql
-- Row Level Security (RLS) Policies for Schedlyx
-- FIXED: Added guest user policies for bookings (email-based access)

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can view public profiles
CREATE POLICY "Anyone can view public profiles"
  ON public.profiles FOR SELECT
  USING (is_active = true);

-- =====================================================
-- EVENTS POLICIES
-- =====================================================

-- Users can view their own events
CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view public active events
CREATE POLICY "Anyone can view public active events"
  ON public.events FOR SELECT
  USING (
    status = 'active' 
    AND visibility = 'public'
  );

-- Anyone can view unlisted events (if they have the link)
CREATE POLICY "Anyone can view unlisted events"
  ON public.events FOR SELECT
  USING (
    status = 'active' 
    AND visibility = 'unlisted'
  );

-- Users can create their own events
CREATE POLICY "Users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own events
CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own events
CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- EVENT SESSIONS POLICIES
-- =====================================================

-- Users can view sessions of their own events
CREATE POLICY "Users can view own event sessions"
  ON public.event_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_sessions.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Anyone can view sessions of public active events
CREATE POLICY "Anyone can view public event sessions"
  ON public.event_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_sessions.event_id
        AND events.status = 'active'
        AND events.visibility IN ('public', 'unlisted')
    )
  );

-- Users can create sessions for their own events
CREATE POLICY "Users can create sessions for own events"
  ON public.event_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_sessions.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Users can update sessions of their own events
CREATE POLICY "Users can update own event sessions"
  ON public.event_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_sessions.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Users can delete sessions of their own events
CREATE POLICY "Users can delete own event sessions"
  ON public.event_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_sessions.event_id
        AND events.user_id = auth.uid()
    )
  );

-- =====================================================
-- BOOKINGS POLICIES
-- FIXED: Added guest user policies for email-based access
-- =====================================================

-- Event owners can view all bookings for their events
CREATE POLICY "Event owners can view all bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = bookings.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Authenticated users can view their own bookings (user_id match)
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

-- FIXED: Guests can view their own bookings using email
-- This allows non-authenticated users to view bookings they created
CREATE POLICY "Guests can view own booking by email"
  ON public.bookings FOR SELECT
  USING (
    user_id IS NULL 
    AND email = current_setting('request.jwt.claim.email', true)
  );

-- Anyone can create bookings for public events (authenticated or guest)
CREATE POLICY "Anyone can create bookings for public events"
  ON public.bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = bookings.event_id
        AND events.status = 'active'
        AND events.visibility IN ('public', 'unlisted')
    )
  );

-- Authenticated users can update their own bookings
CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- FIXED: Guests can cancel their own bookings using email
-- This allows non-authenticated users to cancel bookings they created
CREATE POLICY "Guests can cancel own booking"
  ON public.bookings FOR UPDATE
  USING (
    user_id IS NULL 
    AND email = current_setting('request.jwt.claim.email', true)
  )
  WITH CHECK (status = 'cancelled');

-- Event owners can update bookings for their events
CREATE POLICY "Event owners can update bookings"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = bookings.event_id
        AND events.user_id = auth.uid()
    )
  );

-- =====================================================
-- WAITLIST POLICIES
-- =====================================================

-- Event owners can view waitlist for their events
CREATE POLICY "Event owners can view waitlist"
  ON public.waitlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = waitlist.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist entries"
  ON public.waitlist FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can join waitlist for public events
CREATE POLICY "Anyone can join public event waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = waitlist.event_id
        AND events.status = 'active'
        AND events.visibility IN ('public', 'unlisted')
    )
  );

-- Event owners can manage waitlist
CREATE POLICY "Event owners can manage waitlist"
  ON public.waitlist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = waitlist.event_id
        AND events.user_id = auth.uid()
    )
  );

-- =====================================================
-- AVAILABILITY OVERRIDES POLICIES
-- =====================================================

-- Users can view their own availability overrides
CREATE POLICY "Users can view own availability overrides"
  ON public.availability_overrides FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own availability overrides
CREATE POLICY "Users can create own availability overrides"
  ON public.availability_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own availability overrides
CREATE POLICY "Users can update own availability overrides"
  ON public.availability_overrides FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own availability overrides
CREATE POLICY "Users can delete own availability overrides"
  ON public.availability_overrides FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- CALENDAR INTEGRATIONS POLICIES
-- =====================================================

-- Users can view their own calendar integrations
CREATE POLICY "Users can view own calendar integrations"
  ON public.calendar_integrations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own calendar integrations
CREATE POLICY "Users can create own calendar integrations"
  ON public.calendar_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own calendar integrations
CREATE POLICY "Users can update own calendar integrations"
  ON public.calendar_integrations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own calendar integrations
CREATE POLICY "Users can delete own calendar integrations"
  ON public.calendar_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can create notifications (via service role)
-- No policy needed - handled by service role

-- =====================================================
-- EVENT ANALYTICS POLICIES
-- =====================================================

-- Event owners can view analytics for their events
CREATE POLICY "Event owners can view analytics"
  ON public.event_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_analytics.event_id
        AND events.user_id = auth.uid()
    )
  );

-- System can create/update analytics (via service role)
-- No policy needed - handled by service role

-- =====================================================
-- AUDIT LOG POLICIES
-- =====================================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- System can create audit logs (via service role)
-- No policy needed - handled by service role

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Check if user is event owner
CREATE OR REPLACE FUNCTION public.is_event_owner(event_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events
    WHERE id = event_uuid
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if event is public
CREATE OR REPLACE FUNCTION public.is_event_public(event_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events
    WHERE id = event_uuid
      AND status = 'active'
      AND visibility IN ('public', 'unlisted')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can book event
CREATE OR REPLACE FUNCTION public.can_book_event(event_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  event_record RECORD;
  booking_count INTEGER;
BEGIN
  -- Get event details
  SELECT * INTO event_record
  FROM public.events
  WHERE id = event_uuid;
  
  -- Check if event exists and is active
  IF NOT FOUND OR event_record.status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  -- Check visibility
  IF event_record.visibility NOT IN ('public', 'unlisted') THEN
    RETURN FALSE;
  END IF;
  
  -- Check capacity
  IF event_record.max_attendees IS NOT NULL THEN
    SELECT COUNT(*) INTO booking_count
    FROM public.bookings
    WHERE event_id = event_uuid
      AND status IN ('confirmed', 'pending');
    
    IF booking_count >= event_record.max_attendees THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.event_sessions TO anon, authenticated;
GRANT SELECT, INSERT ON public.bookings TO anon, authenticated;
GRANT SELECT, INSERT ON public.waitlist TO anon, authenticated;

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.events TO authenticated;
GRANT ALL ON public.event_sessions TO authenticated;
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.waitlist TO authenticated;
GRANT ALL ON public.availability_overrides TO authenticated;
GRANT ALL ON public.calendar_integrations TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT SELECT ON public.event_analytics TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_event_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_public(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_book_event(UUID) TO anon, authenticated;

-- =====================================================
-- CRITICAL FIX: Add RLS Policies for time_slots and slot_locks
-- =====================================================

-- Enable RLS on time_slots (if not already enabled)
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_locks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view available time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Event owners can manage time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Users can view their own slot locks" ON public.slot_locks;
DROP POLICY IF EXISTS "Anyone can create slot locks" ON public.slot_locks;

-- =====================================================
-- TIME SLOTS POLICIES
-- =====================================================

-- Allow everyone (including anonymous users) to view available time slots
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
-- =====================================================

-- Users can view their own slot locks
CREATE POLICY "Users can view their own slot locks"
  ON public.slot_locks FOR SELECT
  TO anon, authenticated
  USING (
    user_id = auth.uid() 
    OR session_id = current_setting('request.jwt.claim.session_id', true)
  );

-- Anyone can create slot locks (needed for booking flow)
CREATE POLICY "Anyone can create slot locks"
  ON public.slot_locks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can update their own slot locks
CREATE POLICY "Users can update own slot locks"
  ON public.slot_locks FOR UPDATE
  TO anon, authenticated
  USING (
    user_id = auth.uid() 
    OR session_id = current_setting('request.jwt.claim.session_id', true)
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

-- Grant permissions on booking_attempts table (if it exists)
GRANT SELECT, INSERT ON public.booking_attempts TO anon, authenticated;