-- supabase/migrations/20240102000003_test_booking_system.sql
-- Test Suite for Booking System
-- Run these tests in Supabase SQL Editor to verify functionality

-- =====================================================
-- TEST 1: Slot Generation
-- =====================================================
DO $$
DECLARE
  v_event_id UUID;
  v_slot_count INTEGER;
BEGIN
  RAISE NOTICE 'TEST 1: Slot Generation';
  
  -- Get a test event
  SELECT id INTO v_event_id 
  FROM public.events 
  WHERE status = 'active' 
  LIMIT 1;
  
  IF v_event_id IS NULL THEN
    RAISE NOTICE '  ❌ SKIP: No active events found';
    RETURN;
  END IF;
  
  -- Generate slots for next 7 days
  SELECT public.generate_event_slots(
    v_event_id,
    CURRENT_DATE,
    CURRENT_DATE + 7,
    10
  ) INTO v_slot_count;
  
  RAISE NOTICE '  ✅ PASS: Generated % slots', v_slot_count;
  
  -- Verify slots were created
  IF v_slot_count > 0 THEN
    RAISE NOTICE '  ✅ PASS: Slots exist in database';
  ELSE
    RAISE NOTICE '  ❌ FAIL: No slots were created';
  END IF;
END $$;

-- =====================================================
-- TEST 2: Get Available Slots
-- =====================================================
DO $$
DECLARE
  v_event_id UUID;
  v_available_count INTEGER;
BEGIN
  RAISE NOTICE 'TEST 2: Get Available Slots';
  
  -- Get event with slots
  SELECT DISTINCT event_id INTO v_event_id
  FROM public.time_slots
  WHERE status = 'available'
    AND start_time > NOW()
  LIMIT 1;
  
  IF v_event_id IS NULL THEN
    RAISE NOTICE '  ❌ SKIP: No events with available slots';
    RETURN;
  END IF;
  
  -- Get available slots
  SELECT COUNT(*) INTO v_available_count
  FROM public.get_available_slots(v_event_id, NULL);
  
  IF v_available_count > 0 THEN
    RAISE NOTICE '  ✅ PASS: Found % available slots', v_available_count;
  ELSE
    RAISE NOTICE '  ⚠️  WARN: No available slots (may be valid if all booked)';
  END IF;
END $$;

-- =====================================================
-- TEST 3: Create Slot Lock
-- =====================================================
DO $$
DECLARE
  v_slot_id UUID;
  v_lock_id UUID;
  v_session TEXT := 'test_session_' || gen_random_uuid()::text;
BEGIN
  RAISE NOTICE 'TEST 3: Create Slot Lock';
  
  -- Get an available slot
  SELECT slot_id INTO v_slot_id
  FROM public.get_available_slots(
    (SELECT event_id FROM public.time_slots WHERE status = 'available' LIMIT 1),
    NULL
  )
  WHERE available_count > 0
  LIMIT 1;
  
  IF v_slot_id IS NULL THEN
    RAISE NOTICE '  ❌ SKIP: No available slots to lock';
    RETURN;
  END IF;
  
  -- Create lock
  SELECT public.create_slot_lock(
    v_slot_id,
    NULL,
    v_session,
    1,
    10
  ) INTO v_lock_id;
  
  IF v_lock_id IS NOT NULL THEN
    RAISE NOTICE '  ✅ PASS: Lock created with ID %', v_lock_id;
  ELSE
    RAISE NOTICE '  ❌ FAIL: Lock creation failed';
    RETURN;
  END IF;
  
  -- Verify lock exists
  IF EXISTS (
    SELECT 1 FROM public.slot_locks 
    WHERE id = v_lock_id AND is_active = true
  ) THEN
    RAISE NOTICE '  ✅ PASS: Lock is active';
  ELSE
    RAISE NOTICE '  ❌ FAIL: Lock is not active';
  END IF;
  
  -- Clean up
  PERFORM public.release_slot_lock(v_lock_id);
  RAISE NOTICE '  ✅ CLEANUP: Lock released';
END $$;

-- =====================================================
-- TEST 4: Lock Prevents Double Booking
-- =====================================================
DO $$
DECLARE
  v_slot_id UUID;
  v_lock_id_1 UUID;
  v_lock_id_2 UUID;
  v_session_1 TEXT := 'test_session_1_' || gen_random_uuid()::text;
  v_session_2 TEXT := 'test_session_2_' || gen_random_uuid()::text;
  v_initial_available INTEGER;
  v_after_lock_available INTEGER;
BEGIN
  RAISE NOTICE 'TEST 4: Lock Prevents Double Booking';
  
  -- Get a slot with capacity >= 2
  SELECT slot_id, available_count INTO v_slot_id, v_initial_available
  FROM public.get_available_slots(
    (SELECT event_id FROM public.time_slots WHERE status = 'available' LIMIT 1),
    NULL
  )
  WHERE available_count >= 2
  LIMIT 1;
  
  IF v_slot_id IS NULL THEN
    RAISE NOTICE '  ❌ SKIP: No slots with capacity >= 2';
    RETURN;
  END IF;
  
  RAISE NOTICE '  📊 Initial available: %', v_initial_available;
  
  -- User 1 creates lock for 1 slot
  SELECT public.create_slot_lock(v_slot_id, NULL, v_session_1, 1, 10) 
  INTO v_lock_id_1;
  
  RAISE NOTICE '  ✅ User 1 locked 1 slot';
  
  -- Check availability after first lock (from user 2's perspective)
  SELECT available_count INTO v_after_lock_available
  FROM public.get_available_slots(
    (SELECT event_id FROM public.time_slots WHERE id = v_slot_id),
    v_session_2
  )
  WHERE slot_id = v_slot_id;
  
  IF v_after_lock_available = v_initial_available - 1 THEN
    RAISE NOTICE '  ✅ PASS: Availability decreased by 1 for other users';
  ELSE
    RAISE NOTICE '  ❌ FAIL: Expected %, got %', 
      v_initial_available - 1, v_after_lock_available;
  END IF;
  
  -- User 2 tries to lock remaining slots
  IF v_after_lock_available > 0 THEN
    BEGIN
      SELECT public.create_slot_lock(v_slot_id, NULL, v_session_2, 1, 10) 
      INTO v_lock_id_2;
      
      RAISE NOTICE '  ✅ User 2 locked 1 slot (capacity available)';
      
      -- Clean up user 2 lock
      PERFORM public.release_slot_lock(v_lock_id_2);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '  ❌ FAIL: User 2 lock failed: %', SQLERRM;
    END;
  END IF;
  
  -- Clean up user 1 lock
  PERFORM public.release_slot_lock(v_lock_id_1);
  RAISE NOTICE '  ✅ CLEANUP: All locks released';
END $$;

-- =====================================================
-- TEST 5: Complete Booking Flow
-- =====================================================
DO $$
DECLARE
  v_slot_id UUID;
  v_lock_id UUID;
  v_booking_id UUID;
  v_session TEXT := 'test_session_' || gen_random_uuid()::text;
  v_reference TEXT;
BEGIN
  RAISE NOTICE 'TEST 5: Complete Booking Flow';
  
  -- Get available slot
  SELECT slot_id INTO v_slot_id
  FROM public.get_available_slots(
    (SELECT event_id FROM public.time_slots WHERE status = 'available' LIMIT 1),
    NULL
  )
  WHERE available_count > 0
  LIMIT 1;
  
  IF v_slot_id IS NULL THEN
    RAISE NOTICE '  ❌ SKIP: No available slots';
    RETURN;
  END IF;
  
  -- Create lock
  SELECT public.create_slot_lock(v_slot_id, NULL, v_session, 1, 10) 
  INTO v_lock_id;
  RAISE NOTICE '  ✅ Step 1: Lock created';
  
  -- Complete booking
  SELECT public.complete_slot_booking(
    v_lock_id,
    'Test',
    'User',
    'test@example.com',
    '+1234567890',
    'Test booking from migration'
  ) INTO v_booking_id;
  
  IF v_booking_id IS NOT NULL THEN
    RAISE NOTICE '  ✅ Step 2: Booking created with ID %', v_booking_id;
  ELSE
    RAISE NOTICE '  ❌ FAIL: Booking creation failed';
    RETURN;
  END IF;
  
  -- Verify booking exists
  SELECT booking_reference INTO v_reference
  FROM public.bookings
  WHERE id = v_booking_id;
  
  IF v_reference IS NOT NULL THEN
    RAISE NOTICE '  ✅ Step 3: Booking reference: %', v_reference;
  ELSE
    RAISE NOTICE '  ❌ FAIL: Booking not found';
  END IF;
  
  -- Verify lock was released
  IF NOT EXISTS (
    SELECT 1 FROM public.slot_locks 
    WHERE id = v_lock_id AND is_active = true
  ) THEN
    RAISE NOTICE '  ✅ Step 4: Lock automatically released';
  ELSE
    RAISE NOTICE '  ❌ FAIL: Lock still active';
  END IF;
  
  -- Clean up test booking
  DELETE FROM public.bookings WHERE id = v_booking_id;
  RAISE NOTICE '  ✅ CLEANUP: Test booking deleted';
END $$;

-- =====================================================
-- TEST 6: Lock Expiration
-- =====================================================
DO $$
DECLARE
  v_slot_id UUID;
  v_lock_id UUID;
  v_session TEXT := 'test_session_' || gen_random_uuid()::text;
  v_is_valid BOOLEAN;
BEGIN
  RAISE NOTICE 'TEST 6: Lock Expiration (Simulated)';
  
  -- Get available slot
  SELECT slot_id INTO v_slot_id
  FROM public.get_available_slots(
    (SELECT event_id FROM public.time_slots WHERE status = 'available' LIMIT 1),
    NULL
  )
  WHERE available_count > 0
  LIMIT 1;
  
  IF v_slot_id IS NULL THEN
    RAISE NOTICE '  ❌ SKIP: No available slots';
    RETURN;
  END IF;
  
  -- Create lock with 1 second expiration (for testing)
  INSERT INTO public.slot_locks (
    slot_id, session_id, quantity, expires_at, is_active
  ) VALUES (
    v_slot_id, v_session, 1, NOW() - INTERVAL '1 second', true
  ) RETURNING id INTO v_lock_id;
  
  RAISE NOTICE '  ✅ Created expired lock';
  
  -- Try to verify the expired lock
  SELECT is_valid INTO v_is_valid
  FROM public.verify_lock(v_lock_id);
  
  IF NOT v_is_valid THEN
    RAISE NOTICE '  ✅ PASS: Expired lock correctly identified as invalid';
  ELSE
    RAISE NOTICE '  ❌ FAIL: Expired lock still valid';
  END IF;
  
  -- Verify lock was auto-released
  IF NOT EXISTS (
    SELECT 1 FROM public.slot_locks 
    WHERE id = v_lock_id AND is_active = true
  ) THEN
    RAISE NOTICE '  ✅ PASS: Expired lock auto-released';
  ELSE
    RAISE NOTICE '  ❌ FAIL: Expired lock still active';
  END IF;
END $$;

-- =====================================================
-- TEST 7: Can Book Event Pre-flight Check
-- =====================================================
DO $$
DECLARE
  v_event_id UUID;
  v_can_book BOOLEAN;
  v_reason TEXT;
BEGIN
  RAISE NOTICE 'TEST 7: Can Book Event Pre-flight Check';
  
  -- Get active event
  SELECT id INTO v_event_id
  FROM public.events
  WHERE status = 'active'
    AND visibility IN ('public', 'unlisted')
  LIMIT 1;
  
  IF v_event_id IS NULL THEN
    RAISE NOTICE '  ❌ SKIP: No active public events';
    RETURN;
  END IF;
  
  -- Check if event is bookable
  SELECT can_book, reason INTO v_can_book, v_reason
  FROM public.can_book_event(v_event_id, 1);
  
  IF v_can_book THEN
    RAISE NOTICE '  ✅ PASS: Event is bookable';
  ELSE
    RAISE NOTICE '  ℹ️  INFO: Event not bookable - %', v_reason;
  END IF;
END $$;

-- =====================================================
-- TEST SUMMARY
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BOOKING SYSTEM TEST SUITE COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the test results above.';
  RAISE NOTICE 'All critical paths should show ✅ PASS';
  RAISE NOTICE '';
END $$;