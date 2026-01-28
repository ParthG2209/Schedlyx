-- supabase/migrations/20240102000000_booking_slots_system.sql
-- Booking Slots System Migration
-- FIXED: Atomic booking guarantees with proper constraints

-- =====================================================
-- TIME SLOTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  is_locked BOOLEAN DEFAULT false,
  locked_until TIMESTAMPTZ,
  
  -- Pricing
  price DECIMAL(10, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT time_slots_time_check CHECK (end_time > start_time),
  CONSTRAINT time_slots_status_check CHECK (status IN ('available', 'full', 'cancelled')),
  CONSTRAINT time_slots_capacity_check CHECK (booked_count <= total_capacity)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_slots_event_id ON public.time_slots(event_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_status ON public.time_slots(status) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_time_slots_start_time ON public.time_slots(start_time) WHERE start_time > NOW();
CREATE INDEX IF NOT EXISTS idx_time_slots_availability 
  ON public.time_slots(event_id, status, start_time) 
  WHERE status = 'available' AND start_time > NOW();

-- =====================================================
-- SLOT LOCKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.slot_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- Lock Details
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  released_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT slot_locks_expires_check CHECK (expires_at > locked_at)
);

-- Indexes for lock queries
CREATE INDEX IF NOT EXISTS idx_slot_locks_slot_id ON public.slot_locks(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_locks_session_id ON public.slot_locks(session_id);
CREATE INDEX IF NOT EXISTS idx_slot_locks_active_lookup 
  ON public.slot_locks(slot_id, is_active, expires_at) 
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_slot_locks_session 
  ON public.slot_locks(session_id, is_active, expires_at) 
  WHERE is_active = true;

-- =====================================================
-- BOOKING ATTEMPTS TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.booking_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT,
  status TEXT NOT NULL,
  failure_reason TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT booking_attempts_status_check CHECK (status IN ('success', 'failed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_booking_attempts_event_id ON public.booking_attempts(event_id);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_status ON public.booking_attempts(status);

-- =====================================================
-- UPDATE BOOKINGS TABLE
-- =====================================================
DO $$ 
BEGIN
  -- Add slot_id reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bookings' AND column_name='slot_id'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL;
  END IF;
  
  -- Add booking reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bookings' AND column_name='booking_reference'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN booking_reference TEXT UNIQUE;
  END IF;
  
  -- Add expiration tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bookings' AND column_name='expires_at'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  
  -- Add confirmation tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bookings' AND column_name='confirmed_at'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN confirmed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index for booking reference lookups
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON public.bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON public.time_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.time_slots IS 
'Time slots for events. Capacity is managed atomically through RPCs.';

COMMENT ON TABLE public.slot_locks IS 
'Temporary locks on slots during booking flow. Automatically expire after duration.';

COMMENT ON TABLE public.booking_attempts IS 
'Audit trail of all booking attempts including failures.';

COMMENT ON COLUMN public.time_slots.available_count IS 
'Generated column: total_capacity - booked_count. Always accurate.';

COMMENT ON COLUMN public.slot_locks.session_id IS 
'Browser session ID to track locks across page refreshes.';