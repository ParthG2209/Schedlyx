-- supabase/migrations/20240101000003_booking_system_rpcs.sql
-- CRITICAL BOOKING SYSTEM RPCs
-- These functions are REQUIRED for the booking system to work
-- DO NOT modify without updating bookingService.ts documentation

-- =====================================================
-- TIME SLOTS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
  booked_count INTEGER DEFAULT 0 CHECK (booked_count >= 0),
  available_count INTEGER GENERATED ALWAYS AS (total_capacity - booked_count) STORED,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'full', 'cancelled')),
  is_locked BOOLEAN DEFAULT false,
  locked_until TIMESTAMPTZ,
  price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT time_slots_time_check CHECK (end_time > start_time),
  CONSTRAINT time_slots_capacity_check CHECK (booked_count <= total_capacity)
);

CREATE INDEX IF NOT EXISTS idx_time_slots_event_id ON public.time_slots(event_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_start_time ON public.time_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_time_slots_status ON public.time_slots(status);

-- =====================================================
-- SLOT LOCKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.slot_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT slot_locks_expiry_check CHECK (expires_at > locked_at)
);

CREATE INDEX IF NOT EXISTS idx_slot_locks_slot_id ON public.slot_locks(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_locks_session_id ON public.slot_locks(session_id);
CREATE INDEX IF NOT EXISTS idx_slot_locks_is_active ON public.slot_locks(is_active);
CREATE INDEX IF NOT EXISTS idx_slot_locks_expires_at ON public.slot_locks(expires_at);

-- =====================================================
-- BOOKINGS TABLE UPDATES
-- =====================================================
-- Add slot_id and booking_reference if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='bookings' AND column_name='slot_id') THEN
    ALTER TABLE public.bookings ADD COLUMN slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL;
    CREATE INDEX idx_bookings_slot_id ON public.bookings(slot_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='bookings' AND column_name='booking_reference') THEN
    ALTER TABLE public.bookings ADD COLUMN booking_reference TEXT UNIQUE;
    CREATE INDEX idx_bookings_reference ON public.bookings(booking_reference);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='bookings' AND column_name='confirmed_at') THEN
    ALTER TABLE public.bookings ADD COLUMN confirmed_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- AUTO-GENERATE BOOKING REFERENCE
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := 'BK-' || 
      TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_booking_reference_trigger ON public.bookings;
CREATE TRIGGER generate_booking_reference_trigger 
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.generate_booking_reference();

-- =====================================================
-- RPC: GET AVAILABLE SLOTS
-- =====================================================
-- Returns slots with capacity accounting for active locks
-- Excludes locks held by current session
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_event_id UUID,
  p_session_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  slot_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_capacity INTEGER,
  available_count INTEGER,
  price DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.id AS slot_id,
    ts.start_time,
    ts.end_time,
    ts.total_capacity,
    -- Calculate available: capacity - booked - active_locks (excluding current session)
    GREATEST(0, ts.total_capacity - ts.booked_count - COALESCE(
      (SELECT SUM(sl.quantity)
       FROM public.slot_locks sl
       WHERE sl.slot_id = ts.id
         AND sl.is_active = true
         AND sl.expires_at > NOW()
         AND (p_session_id IS NULL OR sl.session_id != p_session_id)
      ), 0
    ))::INTEGER AS available_count,
    ts.price
  FROM public.time_slots ts
  WHERE ts.event_id = p_event_id
    AND ts.status = 'available'
    AND ts.start_time > NOW()
  ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: CREATE SLOT LOCK
-- =====================================================
-- Atomically checks capacity and creates lock
-- Fails if insufficient capacity available
CREATE OR REPLACE FUNCTION public.create_slot_lock(
  p_slot_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_lock_duration_minutes INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  v_lock_id UUID;
  v_slot RECORD;
  v_total_locked INTEGER;
  v_available INTEGER;
BEGIN
  -- Get slot details with row lock
  SELECT * INTO v_slot
  FROM public.time_slots
  WHERE id = p_slot_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
  
  IF v_slot.status != 'available' THEN
    RAISE EXCEPTION 'Slot is not available for booking';
  END IF;
  
  -- Calculate total active locks
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_locked
  FROM public.slot_locks
  WHERE slot_id = p_slot_id
    AND is_active = true
    AND expires_at > NOW();
  
  -- Calculate available capacity
  v_available := v_slot.total_capacity - v_slot.booked_count - v_total_locked;
  
  -- Check if sufficient capacity
  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient capacity. Available: %, Requested: %', v_available, p_quantity;
  END IF;
  
  -- Create lock
  INSERT INTO public.slot_locks (
    slot_id, user_id, session_id, quantity, expires_at
  ) VALUES (
    p_slot_id,
    p_user_id,
    p_session_id,
    p_quantity,
    NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL
  ) RETURNING id INTO v_lock_id;
  
  RETURN v_lock_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: VERIFY LOCK
-- =====================================================
-- Checks if lock is still valid
-- Returns expiry time and validation reason
CREATE OR REPLACE FUNCTION public.verify_lock(
  p_lock_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  reason TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_lock RECORD;
BEGIN
  -- Get lock details
  SELECT * INTO v_lock
  FROM public.slot_locks
  WHERE id = p_lock_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Lock not found'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check if lock is active
  IF NOT v_lock.is_active THEN
    RETURN QUERY SELECT false, 'Lock has been released'::TEXT, v_lock.expires_at;
    RETURN;
  END IF;
  
  -- Check if lock has expired
  IF v_lock.expires_at <= NOW() THEN
    -- Auto-deactivate expired lock
    UPDATE public.slot_locks
    SET is_active = false, released_at = NOW()
    WHERE id = p_lock_id;
    
    RETURN QUERY SELECT false, 'Lock has expired'::TEXT, v_lock.expires_at;
    RETURN;
  END IF;
  
  -- Lock is valid
  RETURN QUERY SELECT true, NULL::TEXT, v_lock.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: RELEASE SLOT LOCK
-- =====================================================
-- Explicitly releases a lock before expiry
-- Idempotent - safe to call multiple times
CREATE OR REPLACE FUNCTION public.release_slot_lock(
  p_lock_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.slot_locks
  SET 
    is_active = false,
    released_at = NOW()
  WHERE id = p_lock_id
    AND is_active = true;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: COMPLETE SLOT BOOKING
-- =====================================================
-- Converts lock to confirmed booking
-- Re-validates lock and capacity atomically
CREATE OR REPLACE FUNCTION public.complete_slot_booking(
  p_lock_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_lock RECORD;
  v_slot RECORD;
  v_lock_validation RECORD;
BEGIN
  -- Verify lock is valid
  SELECT * INTO v_lock_validation
  FROM public.verify_lock(p_lock_id);
  
  IF NOT v_lock_validation.is_valid THEN
    RAISE EXCEPTION 'Lock is invalid: %', v_lock_validation.reason;
  END IF;
  
  -- Get lock details
  SELECT * INTO v_lock
  FROM public.slot_locks
  WHERE id = p_lock_id
  FOR UPDATE;
  
  -- Get slot details with row lock
  SELECT * INTO v_slot
  FROM public.time_slots
  WHERE id = v_lock.slot_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
  
  -- Final capacity check
  IF v_slot.booked_count + v_lock.quantity > v_slot.total_capacity THEN
    RAISE EXCEPTION 'Insufficient capacity. Capacity may have changed.';
  END IF;
  
  -- Create booking
  INSERT INTO public.bookings (
    event_id,
    slot_id,
    user_id,
    first_name,
    last_name,
    email,
    phone,
    date,
    time,
    status,
    notes,
    confirmed_at
  )
  SELECT 
    v_slot.event_id,
    v_slot.id,
    v_lock.user_id,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    v_slot.start_time::DATE,
    v_slot.start_time::TIME,
    'confirmed',
    p_notes,
    NOW()
  RETURNING id INTO v_booking_id;
  
  -- Update slot booked count
  UPDATE public.time_slots
  SET 
    booked_count = booked_count + v_lock.quantity,
    status = CASE 
      WHEN booked_count + v_lock.quantity >= total_capacity THEN 'full'
      ELSE 'available'
    END
  WHERE id = v_slot.id;
  
  -- Release lock
  UPDATE public.slot_locks
  SET 
    is_active = false,
    released_at = NOW()
  WHERE id = p_lock_id;
  
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: CAN BOOK EVENT (Pre-flight check)
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_book_event(
  p_event_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE (
  can_book BOOLEAN,
  reason TEXT,
  available_slots INTEGER
) AS $$
DECLARE
  v_total_available INTEGER;
BEGIN
  -- Sum available capacity across all slots
  SELECT COALESCE(SUM(
    GREATEST(0, ts.total_capacity - ts.booked_count - COALESCE(
      (SELECT SUM(sl.quantity)
       FROM public.slot_locks sl
       WHERE sl.slot_id = ts.id
         AND sl.is_active = true
         AND sl.expires_at > NOW()
      ), 0
    ))
  ), 0) INTO v_total_available
  FROM public.time_slots ts
  WHERE ts.event_id = p_event_id
    AND ts.status = 'available'
    AND ts.start_time > NOW();
  
  IF v_total_available = 0 THEN
    RETURN QUERY SELECT false, 'No available slots'::TEXT, 0;
  ELSIF v_total_available < p_quantity THEN
    RETURN QUERY SELECT false, 
      format('Only %s seat(s) available', v_total_available)::TEXT,
      v_total_available;
  ELSE
    RETURN QUERY SELECT true, NULL::TEXT, v_total_available;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP EXPIRED LOCKS (Scheduled job)
-- =====================================================
-- Run this periodically via pg_cron or external scheduler
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  v_cleaned INTEGER;
BEGIN
  UPDATE public.slot_locks
  SET 
    is_active = false,
    released_at = NOW()
  WHERE is_active = true
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_cleaned = ROW_COUNT;
  RETURN v_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENABLE RLS ON NEW TABLES
-- =====================================================
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_locks ENABLE ROW LEVEL SECURITY;

-- Anyone can view available slots
CREATE POLICY "Anyone can view available slots"
  ON public.time_slots FOR SELECT
  USING (status = 'available' AND start_time > NOW());

-- Event owners can manage slots
CREATE POLICY "Event owners can manage slots"
  ON public.time_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = time_slots.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Users can view their own locks
CREATE POLICY "Users can view own locks"
  ON public.slot_locks FOR SELECT
  USING (
    user_id = auth.uid() OR
    session_id = current_setting('request.jwt.claim.session_id', true)
  );

-- System can manage locks (via RPCs)
-- No additional policies needed - RPCs run as SECURITY DEFINER

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_available_slots TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_slot_lock TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_lock TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_slot_lock TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_slot_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_book_event TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_locks TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION public.get_available_slots IS 'Returns available slots with capacity accounting for active locks';
COMMENT ON FUNCTION public.create_slot_lock IS 'Atomically creates a slot lock after checking capacity';
COMMENT ON FUNCTION public.verify_lock IS 'Verifies if a lock is still valid';
COMMENT ON FUNCTION public.release_slot_lock IS 'Explicitly releases a lock before expiry';
COMMENT ON FUNCTION public.complete_slot_booking IS 'Converts a valid lock into a confirmed booking';
COMMENT ON FUNCTION public.can_book_event IS 'Pre-flight check for booking eligibility';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after migration to verify everything is set up

-- Check if all RPCs exist
SELECT 
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS parameters
FROM pg_proc
WHERE proname IN (
  'get_available_slots',
  'create_slot_lock',
  'verify_lock',
  'release_slot_lock',
  'complete_slot_booking',
  'can_book_event'
)
ORDER BY proname;

-- Check if tables exist
SELECT 
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('time_slots', 'slot_locks', 'bookings')
  AND schemaname = 'public'
ORDER BY tablename;

-- Check RLS policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('time_slots', 'slot_locks')
ORDER BY tablename, policyname;