-- Booking Slots System Migration
-- Adds slot-based booking capabilities similar to BookMyShow

-- =====================================================
-- TIME SLOTS TABLE
-- =====================================================
-- Individual bookable time slots for events
CREATE TABLE public.time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Time Information
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Capacity Management
  total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
  booked_count INTEGER DEFAULT 0 CHECK (booked_count >= 0),
  available_count INTEGER GENERATED ALWAYS AS (total_capacity - booked_count) STORED,
  
  -- Slot Status
  status TEXT NOT NULL DEFAULT 'available',
  is_locked BOOLEAN DEFAULT false, -- Temporarily lock during high-demand booking
  locked_until TIMESTAMPTZ,
  
  -- Pricing (optional for future)
  price DECIMAL(10, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT time_slots_time_check CHECK (end_time > start_time),
  CONSTRAINT time_slots_status_check CHECK (status IN ('available', 'full', 'cancelled')),
  CONSTRAINT time_slots_capacity_check CHECK (booked_count <= total_capacity)
);

-- =====================================================
-- SLOT LOCKS TABLE (Temporary Holds)
-- =====================================================
-- Temporary holds on slots during booking process
CREATE TABLE public.slot_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- For anonymous users
  
  -- Lock Details
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  released_at TIMESTAMPTZ,
  
  CONSTRAINT slot_locks_expires_check CHECK (expires_at > locked_at)
);

-- =====================================================
-- BOOKING ATTEMPTS TABLE (Audit Trail)
-- =====================================================
-- Track all booking attempts for analytics
CREATE TABLE public.booking_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Attempt Details
  email TEXT,
  status TEXT NOT NULL,
  failure_reason TEXT,
  
  -- Timestamps
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT booking_attempts_status_check CHECK (status IN ('success', 'failed', 'abandoned'))
);

-- =====================================================
-- UPDATE BOOKINGS TABLE
-- =====================================================
-- Add slot_id reference to existing bookings table
ALTER TABLE public.bookings 
  ADD COLUMN slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
  ADD COLUMN booking_reference TEXT UNIQUE,
  ADD COLUMN expires_at TIMESTAMPTZ,
  ADD COLUMN confirmed_at TIMESTAMPTZ;

-- Generate unique booking references
CREATE OR REPLACE FUNCTION generate_booking_reference() 
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_time_slots_event_id ON public.time_slots(event_id);
CREATE INDEX idx_time_slots_start_time ON public.time_slots(start_time);
CREATE INDEX idx_time_slots_status ON public.time_slots(status);
CREATE INDEX idx_time_slots_available_count ON public.time_slots(available_count) WHERE available_count > 0;

CREATE INDEX idx_slot_locks_slot_id ON public.slot_locks(slot_id);
CREATE INDEX idx_slot_locks_expires_at ON public.slot_locks(expires_at) WHERE is_active = true;
CREATE INDEX idx_slot_locks_session_id ON public.slot_locks(session_id);

CREATE INDEX idx_booking_attempts_event_id ON public.booking_attempts(event_id);
CREATE INDEX idx_booking_attempts_attempted_at ON public.booking_attempts(attempted_at DESC);

CREATE INDEX idx_bookings_slot_id ON public.bookings(slot_id);
CREATE INDEX idx_bookings_reference ON public.bookings(booking_reference);

-- =====================================================
-- SLOT AVAILABILITY FUNCTIONS
-- =====================================================

-- Get available slots for an event
CREATE OR REPLACE FUNCTION get_available_slots(p_event_id UUID)
RETURNS TABLE (
  slot_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_capacity INTEGER,
  available_count INTEGER,
  price DECIMAL(10, 2)
) AS $$
BEGIN
  -- Clean up expired locks first
  PERFORM release_expired_locks();
  
  RETURN QUERY
  SELECT 
    ts.id,
    ts.start_time,
    ts.end_time,
    ts.total_capacity,
    ts.available_count - COALESCE(
      (SELECT SUM(quantity) 
       FROM slot_locks 
       WHERE slot_id = ts.id 
         AND is_active = true 
         AND expires_at > NOW()), 
      0
    )::INTEGER as available,
    ts.price
  FROM time_slots ts
  WHERE ts.event_id = p_event_id
    AND ts.status = 'available'
    AND ts.start_time > NOW()
    AND ts.available_count > 0
  ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql;

-- Create slot lock (hold a slot temporarily)
CREATE OR REPLACE FUNCTION create_slot_lock(
  p_slot_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_lock_duration_minutes INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  v_lock_id UUID;
  v_available INTEGER;
BEGIN
  -- Check availability including current locks
  SELECT available_count - COALESCE(
    (SELECT SUM(quantity) 
     FROM slot_locks 
     WHERE slot_id = p_slot_id 
       AND is_active = true 
       AND expires_at > NOW()), 
    0
  ) INTO v_available
  FROM time_slots
  WHERE id = p_slot_id;
  
  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient slots available';
  END IF;
  
  -- Create lock
  INSERT INTO slot_locks (
    slot_id, user_id, session_id, quantity, 
    expires_at
  ) VALUES (
    p_slot_id, p_user_id, p_session_id, p_quantity,
    NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL
  ) RETURNING id INTO v_lock_id;
  
  RETURN v_lock_id;
END;
$$ LANGUAGE plpgsql;

-- Release slot lock
CREATE OR REPLACE FUNCTION release_slot_lock(p_lock_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE slot_locks
  SET is_active = false, released_at = NOW()
  WHERE id = p_lock_id AND is_active = true;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Release expired locks (called periodically)
CREATE OR REPLACE FUNCTION release_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE slot_locks
  SET is_active = false, released_at = NOW()
  WHERE is_active = true 
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BOOKING FUNCTIONS (BookMyShow-style)
-- =====================================================

-- Complete booking (converts lock to confirmed booking)
CREATE OR REPLACE FUNCTION complete_slot_booking(
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
  v_event_id UUID;
  v_reference TEXT;
BEGIN
  -- Get lock details
  SELECT * INTO v_lock
  FROM slot_locks
  WHERE id = p_lock_id 
    AND is_active = true 
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lock not found or expired';
  END IF;
  
  -- Get slot and event details
  SELECT ts.*, ts.event_id INTO v_slot
  FROM time_slots ts
  WHERE ts.id = v_lock.slot_id;
  
  v_event_id := v_slot.event_id;
  
  -- Generate unique reference
  LOOP
    v_reference := generate_booking_reference();
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM bookings WHERE booking_reference = v_reference
    );
  END LOOP;
  
  -- Create booking
  INSERT INTO bookings (
    event_id, slot_id, user_id,
    first_name, last_name, email, phone,
    date, time, timezone,
    status, notes,
    booking_reference, confirmed_at
  ) VALUES (
    v_event_id, v_lock.slot_id, v_lock.user_id,
    p_first_name, p_last_name, p_email, p_phone,
    v_slot.start_time::DATE, v_slot.start_time::TIME, 'UTC',
    'confirmed', p_notes,
    v_reference, NOW()
  ) RETURNING id INTO v_booking_id;
  
  -- Update slot booked count
  UPDATE time_slots
  SET booked_count = booked_count + v_lock.quantity,
      updated_at = NOW()
  WHERE id = v_lock.slot_id;
  
  -- Update slot status if full
  UPDATE time_slots
  SET status = 'full'
  WHERE id = v_lock.slot_id 
    AND available_count = 0;
  
  -- Release the lock
  PERFORM release_slot_lock(p_lock_id);
  
  -- Log successful attempt
  INSERT INTO booking_attempts (
    event_id, slot_id, user_id, email, status
  ) VALUES (
    v_event_id, v_lock.slot_id, v_lock.user_id, p_email, 'success'
  );
  
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Cancel booking and restore slot
CREATE OR REPLACE FUNCTION cancel_slot_booking(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
    AND status = 'confirmed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or already cancelled';
  END IF;
  
  -- Update booking status
  UPDATE bookings
  SET status = 'cancelled', cancelled_at = NOW()
  WHERE id = p_booking_id;
  
  -- Restore slot availability
  IF v_booking.slot_id IS NOT NULL THEN
    UPDATE time_slots
    SET booked_count = GREATEST(0, booked_count - 1),
        status = 'available',
        updated_at = NOW()
    WHERE id = v_booking.slot_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTOMATIC SLOT GENERATION
-- =====================================================

-- Generate time slots for an event
CREATE OR REPLACE FUNCTION generate_event_slots(
  p_event_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_capacity_per_slot INTEGER DEFAULT 10
)
RETURNS INTEGER AS $$
DECLARE
  v_event RECORD;
  v_current_date DATE;
  v_slot_start TIME;
  v_slot_end TIME;
  v_day_name TEXT;
  v_slots_created INTEGER := 0;
BEGIN
  -- Get event details
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Loop through dates
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    v_day_name := TO_CHAR(v_current_date, 'Day');
    v_day_name := TRIM(v_day_name);
    
    -- Check if this day is available
    IF v_day_name = ANY(v_event.available_days) THEN
      -- Generate slots for this day
      v_slot_start := (v_event.time_slots->>'start')::TIME;
      v_slot_end := v_slot_start + (v_event.duration || ' minutes')::INTERVAL;
      
      WHILE v_slot_end <= (v_event.time_slots->>'end')::TIME LOOP
        -- Create slot
        INSERT INTO time_slots (
          event_id, start_time, end_time, total_capacity
        ) VALUES (
          p_event_id,
          v_current_date + v_slot_start,
          v_current_date + v_slot_end,
          p_capacity_per_slot
        );
        
        v_slots_created := v_slots_created + 1;
        
        -- Move to next slot
        v_slot_start := v_slot_end + (v_event.buffer_time || ' minutes')::INTERVAL;
        v_slot_end := v_slot_start + (v_event.duration || ' minutes')::INTERVAL;
      END LOOP;
    END IF;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN v_slots_created;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update time_slots updated_at
CREATE TRIGGER update_time_slots_updated_at 
  BEFORE UPDATE ON public.time_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON public.time_slots TO anon, authenticated;
GRANT SELECT ON public.slot_locks TO authenticated;
GRANT SELECT ON public.booking_attempts TO authenticated;

GRANT INSERT ON public.time_slots TO authenticated;
GRANT INSERT, UPDATE ON public.slot_locks TO anon, authenticated;
GRANT INSERT ON public.booking_attempts TO anon, authenticated;

GRANT EXECUTE ON FUNCTION get_available_slots(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_slot_lock(UUID, UUID, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION release_slot_lock(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_slot_booking(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_slot_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_event_slots(UUID, DATE, DATE, INTEGER) TO authenticated;