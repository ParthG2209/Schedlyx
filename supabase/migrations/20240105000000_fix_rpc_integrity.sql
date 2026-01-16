-- supabase/migrations/20240105000000_fix_rpc_integrity.sql
-- Fix RPC Integrity Violations
-- This migration addresses critical double-booking vulnerabilities

-- =====================================================
-- FIX 1: Add session_id parameter to get_available_slots
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_available_slots(UUID);

-- Recreate with session_id parameter to exclude caller's own locks
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
  price DECIMAL(10, 2)
) AS $$
#variable_conflict use_column
BEGIN
  -- Clean up expired locks first
  PERFORM public.release_expired_locks();
  
  RETURN QUERY
  SELECT 
    ts.id AS slot_id,
    ts.start_time,
    ts.end_time,
    ts.total_capacity,
    -- FIXED: Exclude caller's own locks from deduction
    (ts.available_count - COALESCE(
      (SELECT SUM(sl.quantity) 
       FROM public.slot_locks sl
       WHERE sl.slot_id = ts.id 
         AND sl.is_active = true 
         AND sl.expires_at > NOW()
         -- Exclude locks belonging to the current session
         AND (p_session_id IS NULL OR sl.session_id != p_session_id)), 
      0
    ))::INTEGER AS available_count,
    ts.price
  FROM public.time_slots ts
  WHERE ts.event_id = p_event_id
    AND ts.status = 'available'
    AND ts.start_time > NOW()
    AND ts.available_count > 0
  ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIX 2: Add server-side lock validation to complete_slot_booking
-- =====================================================

DROP FUNCTION IF EXISTS public.complete_slot_booking(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

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
  v_reference TEXT;
BEGIN
  -- FIXED: Strict lock validation
  SELECT * INTO v_lock 
  FROM public.slot_locks 
  WHERE id = p_lock_id 
    AND is_active = true 
    AND expires_at > NOW();
    
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Lock not found or expired. Please select a new slot.'; 
  END IF;
  
  -- Get slot details
  SELECT * INTO v_slot FROM public.time_slots WHERE id = v_lock.slot_id;
  
  -- FIXED: Double-check capacity before confirming
  IF (v_slot.available_count - COALESCE(
    (SELECT SUM(sl.quantity) 
     FROM public.slot_locks sl
     WHERE sl.slot_id = v_lock.slot_id 
       AND sl.is_active = true 
       AND sl.expires_at > NOW()
       AND sl.id != p_lock_id), 
    0
  )) < v_lock.quantity THEN
    RAISE EXCEPTION 'Insufficient capacity available. Slot may have been booked by another user.';
  END IF;
  
  -- Generate unique booking reference
  LOOP
    v_reference := upper(substr(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_reference = v_reference);
  END LOOP;
  
  -- Create booking
  INSERT INTO public.bookings (
    event_id, slot_id, user_id, first_name, last_name, email, phone,
    date, time, timezone, status, notes, booking_reference, confirmed_at
  ) VALUES (
    v_slot.event_id, v_lock.slot_id, v_lock.user_id, p_first_name, p_last_name, p_email, p_phone,
    v_slot.start_time::DATE, v_slot.start_time::TIME, 'UTC', 'confirmed', p_notes, v_reference, NOW()
  ) RETURNING id INTO v_booking_id;
  
  -- Update slot capacity
  UPDATE public.time_slots 
  SET booked_count = booked_count + v_lock.quantity,
      updated_at = NOW()
  WHERE id = v_lock.slot_id;
  
  -- Update slot status if full
  UPDATE public.time_slots 
  SET status = 'full',
      updated_at = NOW()
  WHERE id = v_lock.slot_id 
    AND available_count = 0;
  
  -- Release the lock
  PERFORM public.release_slot_lock(p_lock_id);
  
  -- Log successful booking
  INSERT INTO public.booking_attempts (
    event_id, slot_id, user_id, email, status, attempted_at
  ) VALUES (
    v_slot.event_id, v_lock.slot_id, v_lock.user_id, p_email, 'success', NOW()
  );
  
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIX 3: Enhanced create_slot_lock with better validation
-- =====================================================

DROP FUNCTION IF EXISTS public.create_slot_lock(UUID, UUID, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.create_slot_lock(
  p_slot_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_lock_duration_minutes INTEGER DEFAULT 10
)
RETURNS UUID AS $$
#variable_conflict use_column
DECLARE
  v_lock_id UUID;
  v_available INTEGER;
  v_slot RECORD;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;
  
  -- Get slot details
  SELECT * INTO v_slot FROM public.time_slots WHERE id = p_slot_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
  
  -- Check if slot is available
  IF v_slot.status != 'available' THEN
    RAISE EXCEPTION 'Slot is not available for booking';
  END IF;
  
  -- Check if slot is in the future
  IF v_slot.start_time <= NOW() THEN
    RAISE EXCEPTION 'Cannot book slots in the past';
  END IF;
  
  -- FIXED: Calculate true availability including active locks (excluding caller's own)
  SELECT (v_slot.available_count - COALESCE(
    (SELECT SUM(sl.quantity) 
     FROM public.slot_locks sl
     WHERE sl.slot_id = p_slot_id 
       AND sl.is_active = true 
       AND sl.expires_at > NOW()
       AND (p_session_id IS NULL OR sl.session_id != p_session_id)), 
    0
  )) INTO v_available;
  
  -- Check capacity
  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient slots available. Only % slot(s) remaining.', v_available;
  END IF;
  
  -- Release any existing locks for this session on this slot
  IF p_session_id IS NOT NULL THEN
    UPDATE public.slot_locks
    SET is_active = false, released_at = NOW()
    WHERE slot_id = p_slot_id
      AND session_id = p_session_id
      AND is_active = true;
  END IF;
  
  -- Create new lock
  INSERT INTO public.slot_locks (
    slot_id, user_id, session_id, quantity, 
    expires_at, is_active
  ) VALUES (
    p_slot_id, p_user_id, p_session_id, p_quantity,
    NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL,
    true
  ) RETURNING id INTO v_lock_id;
  
  RETURN v_lock_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIX 4: Add function to check booking eligibility
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
  v_event RECORD;
  v_slot_count INTEGER;
BEGIN
  -- Get event details
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Event not found', 0;
    RETURN;
  END IF;
  
  -- Check event status
  IF v_event.status != 'active' THEN
    RETURN QUERY SELECT false, 'Event is not active', 0;
    RETURN;
  END IF;
  
  -- Check visibility
  IF v_event.visibility NOT IN ('public', 'unlisted') THEN
    RETURN QUERY SELECT false, 'Event is not publicly available', 0;
    RETURN;
  END IF;
  
  -- Count available slots
  SELECT COUNT(*) INTO v_slot_count
  FROM public.time_slots ts
  WHERE ts.event_id = p_event_id
    AND ts.status = 'available'
    AND ts.start_time > NOW()
    AND (ts.available_count - COALESCE(
      (SELECT SUM(sl.quantity) 
       FROM public.slot_locks sl
       WHERE sl.slot_id = ts.id 
         AND sl.is_active = true 
         AND sl.expires_at > NOW()), 
      0
    )) >= p_quantity;
  
  IF v_slot_count = 0 THEN
    RETURN QUERY SELECT false, 'No available slots', 0;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, 'Event is available for booking', v_slot_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIX 5: Add function to verify lock validity
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_lock(p_lock_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  reason TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_lock RECORD;
BEGIN
  SELECT * INTO v_lock 
  FROM public.slot_locks 
  WHERE id = p_lock_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Lock not found', NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  IF NOT v_lock.is_active THEN
    RETURN QUERY SELECT false, 'Lock has been released', v_lock.expires_at;
    RETURN;
  END IF;
  
  IF v_lock.expires_at <= NOW() THEN
    -- Auto-release expired lock
    UPDATE public.slot_locks
    SET is_active = false, released_at = NOW()
    WHERE id = p_lock_id;
    
    RETURN QUERY SELECT false, 'Lock has expired', v_lock.expires_at;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'Lock is valid', v_lock.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_available_slots(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_slot_lock(UUID, UUID, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_slot_booking(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_book_event(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_lock(UUID) TO anon, authenticated;

-- =====================================================
-- UPDATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for active locks query
CREATE INDEX IF NOT EXISTS idx_slot_locks_active_lookup 
ON public.slot_locks(slot_id, is_active, expires_at) 
WHERE is_active = true;

-- Index for session-based lock lookup
CREATE INDEX IF NOT EXISTS idx_slot_locks_session 
ON public.slot_locks(session_id, is_active, expires_at) 
WHERE is_active = true;

-- Index for slot availability query
CREATE INDEX IF NOT EXISTS idx_time_slots_availability 
ON public.time_slots(event_id, status, start_time) 
WHERE status = 'available' AND start_time > NOW();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION public.get_available_slots(UUID, TEXT) IS 
'Returns available slots for an event, excluding the caller''s own locks when session_id is provided. This is the ONLY safe way to check slot availability.';

COMMENT ON FUNCTION public.create_slot_lock(UUID, UUID, TEXT, INTEGER, INTEGER) IS 
'Creates a temporary lock on one or more slots. Validates availability including active locks. Lock expires after specified duration.';

COMMENT ON FUNCTION public.complete_slot_booking(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS 
'Completes a booking using a valid lock. Server-side validation ensures lock is still valid and capacity is available.';

COMMENT ON FUNCTION public.can_book_event(UUID, INTEGER) IS 
'Pre-flight check to determine if an event is bookable. Should be called before showing booking UI.';

COMMENT ON FUNCTION public.verify_lock(UUID) IS 
'Verifies if a lock is still valid. Used for real-time lock status checks during booking flow.';