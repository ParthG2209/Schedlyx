-- supabase/migrations/20240101000004_fix_quantity_validation.sql
-- FIX #2: Update complete_slot_booking RPC to accept and validate quantity parameter
-- This migration adds quantity validation to the booking completion flow

-- Drop existing function
DROP FUNCTION IF EXISTS public.complete_slot_booking(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

-- =====================================================
-- RPC: COMPLETE SLOT BOOKING (FIXED)
-- =====================================================
-- FIX #2: Added p_quantity parameter with validation
-- Converts lock to confirmed booking with quantity re-validation
CREATE OR REPLACE FUNCTION public.complete_slot_booking(
  p_lock_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT NULL  -- ✅ FIX #2: Added quantity parameter
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_lock RECORD;
  v_slot RECORD;
  v_lock_validation RECORD;
  v_quantity_to_book INTEGER;
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
  
  -- FIX #2: Determine quantity to book
  -- If quantity provided, validate it matches lock quantity
  -- Otherwise use lock quantity (backward compatible)
  IF p_quantity IS NOT NULL THEN
    -- Validate provided quantity matches lock quantity
    IF p_quantity != v_lock.quantity THEN
      RAISE EXCEPTION 'Quantity mismatch: requested %, locked %', p_quantity, v_lock.quantity;
    END IF;
    v_quantity_to_book := p_quantity;
  ELSE
    -- Use lock quantity (backward compatible behavior)
    v_quantity_to_book := v_lock.quantity;
  END IF;
  
  -- Additional validation: quantity must be positive
  IF v_quantity_to_book <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity: %', v_quantity_to_book;
  END IF;
  
  -- Get slot details with row lock
  SELECT * INTO v_slot
  FROM public.time_slots
  WHERE id = v_lock.slot_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
  
  -- FIX #2: Final capacity check with explicit quantity
  IF v_slot.booked_count + v_quantity_to_book > v_slot.total_capacity THEN
    RAISE EXCEPTION 'Insufficient capacity. Requested: %, Available: %', 
      v_quantity_to_book, 
      (v_slot.total_capacity - v_slot.booked_count);
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
    CASE 
      WHEN p_notes IS NOT NULL THEN p_notes 
      WHEN v_quantity_to_book > 1 THEN format('Group booking: %s seats', v_quantity_to_book)
      ELSE NULL 
    END,
    NOW()
  RETURNING id INTO v_booking_id;
  
  -- FIX #2: Update slot booked count with explicit quantity
  UPDATE public.time_slots
  SET 
    booked_count = booked_count + v_quantity_to_book,
    status = CASE 
      WHEN booked_count + v_quantity_to_book >= total_capacity THEN 'full'
      ELSE 'available'
    END
  WHERE id = v_slot.id;
  
  -- Release lock
  UPDATE public.slot_locks
  SET 
    is_active = false,
    released_at = NOW()
  WHERE id = p_lock_id;
  
  -- Log the booking with quantity
  INSERT INTO public.audit_log (
    action,
    entity_type,
    entity_id,
    new_data
  ) VALUES (
    'create',
    'booking',
    v_booking_id,
    jsonb_build_object(
      'lock_id', p_lock_id,
      'slot_id', v_slot.id,
      'quantity', v_quantity_to_book,
      'email', p_email
    )
  );
  
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE FUNCTION COMMENT
-- =====================================================
COMMENT ON FUNCTION public.complete_slot_booking IS 
  'FIX #2: Converts a valid lock into a confirmed booking with quantity validation. ' ||
  'Accepts optional p_quantity parameter to explicitly validate booking quantity. ' ||
  'If not provided, uses lock quantity for backward compatibility.';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify the function signature is updated
SELECT 
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS parameters
FROM pg_proc
WHERE proname = 'complete_slot_booking'
  AND pronamespace = 'public'::regnamespace;

-- Expected output should show p_quantity INTEGER DEFAULT NULL in parameters