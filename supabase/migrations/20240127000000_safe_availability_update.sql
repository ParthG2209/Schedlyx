-- Migration: 20240127000000_safe_availability_update.sql
-- Description: Implement atomic update for availability and prevent overlaps

-- 1. Create a composite type for availability input
CREATE TYPE public.availability_slot_input AS (
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  is_enabled BOOLEAN
);

-- 2. Create RPC function for atomic updates with validation
CREATE OR REPLACE FUNCTION public.update_user_availability(
  p_slots public.availability_slot_input[]
)
RETURNS VOID AS $$
DECLARE
  slot public.availability_slot_input;
  other_slot public.availability_slot_input;
  v_user_id UUID;
  i INT;
  j INT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Input Validation Loop
  -- We iterate to check for overlaps within the provided slots
  IF array_length(p_slots, 1) > 0 THEN
    FOR i IN 1..array_length(p_slots, 1) LOOP
      slot := p_slots[i];
      
      -- Basic range validation
      IF slot.start_time >= slot.end_time THEN
         RAISE EXCEPTION 'Start time must be before end time for day %', slot.day_of_week;
      END IF;

      -- Overlap validation against other slots
      FOR j IN (i + 1)..array_length(p_slots, 1) LOOP
        other_slot := p_slots[j];
        
        -- Check if slots are on the same day and both enabled
        IF slot.day_of_week = other_slot.day_of_week AND slot.is_enabled AND other_slot.is_enabled THEN
          -- Overlap condition: StartA < EndB AND EndA > StartB
          IF (slot.start_time < other_slot.end_time) AND (slot.end_time > other_slot.start_time) THEN
             RAISE EXCEPTION 'Overlapping time slots detected on day %', slot.day_of_week;
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Transactional Update
  -- 1. Delete existing slots for the user
  DELETE FROM public.availabilities WHERE user_id = v_user_id;
  
  -- 2. Insert new slots
  IF array_length(p_slots, 1) > 0 THEN
    INSERT INTO public.availabilities (user_id, day_of_week, start_time, end_time, is_enabled)
    SELECT 
      v_user_id,
      s.day_of_week,
      s.start_time,
      s.end_time,
      s.is_enabled
    FROM unnest(p_slots) s;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
