-- supabase/migrations/20240101000002_helper_functions.sql
-- Helper functions and stored procedures for Schedlyx

-- =====================================================
-- BOOKING MANAGEMENT FUNCTIONS
-- =====================================================

-- Create a booking with automatic capacity management
CREATE OR REPLACE FUNCTION public.create_booking(
  p_event_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_time TIME DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_custom_responses JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_event RECORD;
  v_current_count INTEGER;
BEGIN
  -- Get event details
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Check if event is active
  IF v_event.status != 'active' THEN
    RAISE EXCEPTION 'Event is not active';
  END IF;
  
  -- Check capacity
  IF v_event.max_attendees IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.bookings
    WHERE event_id = p_event_id
      AND status IN ('confirmed', 'pending');
    
    IF v_current_count >= v_event.max_attendees THEN
      RAISE EXCEPTION 'Event is at maximum capacity';
    END IF;
  END IF;
  
  -- Create the booking
  INSERT INTO public.bookings (
    event_id, session_id, first_name, last_name, email, phone,
    date, time, notes, custom_responses,
    status, user_id
  ) VALUES (
    p_event_id, p_session_id, p_first_name, p_last_name, p_email, p_phone,
    p_date, p_time, p_notes, p_custom_responses,
    CASE WHEN v_event.requires_approval THEN 'pending' ELSE 'confirmed' END,
    auth.uid()
  ) RETURNING id INTO v_booking_id;
  
  -- Update current attendees count
  UPDATE public.events
  SET current_attendees = current_attendees + 1
  WHERE id = p_event_id;
  
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel a booking
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking RECORD;
  v_event RECORD;
  v_hours_until_event INTEGER;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Check if booking can be cancelled
  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled';
  END IF;
  
  -- Get event details
  SELECT * INTO v_event FROM public.events WHERE id = v_booking.event_id;
  
  -- Check if cancellation is allowed
  IF NOT v_event.allow_cancellation THEN
    RAISE EXCEPTION 'Cancellation not allowed for this event';
  END IF;
  
  -- Check cancellation deadline
  v_hours_until_event := EXTRACT(EPOCH FROM (
    (v_booking.date + v_booking.time) - NOW()
  )) / 3600;
  
  IF v_hours_until_event < v_event.cancellation_deadline THEN
    RAISE EXCEPTION 'Cancellation deadline has passed';
  END IF;
  
  -- Cancel the booking
  UPDATE public.bookings
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_cancellation_reason
  WHERE id = p_booking_id;
  
  -- Update current attendees count
  UPDATE public.events
  SET current_attendees = GREATEST(0, current_attendees - 1)
  WHERE id = v_booking.event_id;
  
  -- Check waitlist
  PERFORM public.process_waitlist(v_booking.event_id, v_booking.session_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- WAITLIST MANAGEMENT FUNCTIONS
-- =====================================================

-- Add to waitlist
CREATE OR REPLACE FUNCTION public.add_to_waitlist(
  p_event_id UUID,
  p_session_id UUID DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_waitlist_id UUID;
  v_position INTEGER;
BEGIN
  -- Get next position
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_position
  FROM public.waitlist
  WHERE event_id = p_event_id
    AND (p_session_id IS NULL OR session_id = p_session_id);
  
  -- Add to waitlist
  INSERT INTO public.waitlist (
    event_id, session_id, first_name, last_name, email, phone,
    notes, position, user_id
  ) VALUES (
    p_event_id, p_session_id, p_first_name, p_last_name, p_email, p_phone,
    p_notes, v_position, auth.uid()
  ) RETURNING id INTO v_waitlist_id;
  
  RETURN v_waitlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process waitlist when spot becomes available
CREATE OR REPLACE FUNCTION public.process_waitlist(
  p_event_id UUID,
  p_session_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_next_waitlist RECORD;
BEGIN
  -- Get next person on waitlist
  SELECT * INTO v_next_waitlist
  FROM public.waitlist
  WHERE event_id = p_event_id
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND notified = FALSE
    AND converted_to_booking = FALSE
  ORDER BY position
  LIMIT 1;
  
  IF FOUND THEN
    -- Mark as notified
    UPDATE public.waitlist
    SET 
      notified = TRUE,
      notified_at = NOW()
    WHERE id = v_next_waitlist.id;
    
    -- Create notification
    INSERT INTO public.notifications (
      user_id, type, title, message, event_id
    ) VALUES (
      v_next_waitlist.user_id,
      'waitlist_spot_available',
      'Spot Available!',
      'A spot has opened up for the event you''re waitlisted for.',
      p_event_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AVAILABILITY FUNCTIONS
-- =====================================================

-- Get available time slots for a date
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_event_id UUID,
  p_date DATE
)
RETURNS TABLE (
  slot_time TIME,
  available BOOLEAN
) AS $$
DECLARE
  v_event RECORD;
  v_day_name TEXT;
  v_start_time TIME;
  v_end_time TIME;
  v_current_time TIME;
BEGIN
  -- Get event details
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Get day name
  v_day_name := TO_CHAR(p_date, 'Day');
  v_day_name := TRIM(v_day_name);
  
  -- Check if day is available
  IF NOT (v_day_name = ANY(v_event.available_days)) THEN
    RETURN;
  END IF;
  
  -- Get time range
  v_start_time := (v_event.time_slots->>'start')::TIME;
  v_end_time := (v_event.time_slots->>'end')::TIME;
  
  -- Generate slots
  v_current_time := v_start_time;
  
  WHILE v_current_time < v_end_time LOOP
    RETURN QUERY
    SELECT 
      v_current_time,
      NOT EXISTS (
        SELECT 1 FROM public.bookings
        WHERE event_id = p_event_id
          AND date = p_date
          AND time = v_current_time
          AND status IN ('confirmed', 'pending')
      );
    
    v_current_time := v_current_time + (v_event.duration || ' minutes')::INTERVAL;
    
    -- Add buffer time
    IF v_event.buffer_time > 0 THEN
      v_current_time := v_current_time + (v_event.buffer_time || ' minutes')::INTERVAL;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is available at a specific time
-- NOTE ON BEHAVIOR:
-- This function enforces user-defined weekly availability (from public.availabilities).
-- 1. If a user HAS NOT defined any weekly availability, they are assumed to be 
--    available (subject to existing bookings and overrides).
-- 2. Once a user defines AT LEAST ONE availability slot, this function becomes 
--    RESTRICTIVE. The user is then considered UNAVAILABLE for all times NOT 
--    explicitly covered by an enabled availability slot.
-- 3. This means adding a single slot (e.g., Monday 9-5) will effectively block 
--    the rest of the week for that user.
CREATE OR REPLACE FUNCTION public.is_user_available(
  p_user_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check for existing bookings
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.events e ON e.id = b.event_id
    WHERE e.user_id = p_user_id
      AND b.date = p_date
      AND b.status IN ('confirmed', 'pending')
      AND (
        (b.time >= p_start_time AND b.time < p_end_time)
        OR (b.time + (e.duration || ' minutes')::INTERVAL > p_start_time 
            AND b.time + (e.duration || ' minutes')::INTERVAL <= p_end_time)
      )
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check for availability overrides
  IF EXISTS (
    SELECT 1 FROM public.availability_overrides
    WHERE user_id = p_user_id
      AND start_date <= p_date
      AND end_date >= p_date
      AND type = 'unavailable'
      AND (
        (start_time IS NULL AND end_time IS NULL)
        OR (start_time <= p_start_time AND end_time >= p_end_time)
      )
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check for weekly availability
  -- If any weekly availability is set for this user, they must fit within one of the slots
  IF EXISTS (SELECT 1 FROM public.availabilities WHERE user_id = p_user_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.availabilities
      WHERE user_id = p_user_id
        AND day_of_week = EXTRACT(DOW FROM p_date)
        AND is_enabled = true
        AND start_time <= p_start_time
        AND end_time >= p_end_time
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Update event analytics for a date
CREATE OR REPLACE FUNCTION public.update_event_analytics(
  p_event_id UUID,
  p_date DATE
)
RETURNS VOID AS $$
DECLARE
  v_bookings_created INTEGER;
  v_bookings_confirmed INTEGER;
  v_bookings_cancelled INTEGER;
  v_no_shows INTEGER;
  v_attendees INTEGER;
BEGIN
  -- Count bookings
  SELECT 
    COUNT(*) FILTER (WHERE created_at::DATE = p_date),
    COUNT(*) FILTER (WHERE status = 'confirmed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'no_show'),
    COUNT(*) FILTER (WHERE status = 'completed' AND attended = TRUE)
  INTO 
    v_bookings_created,
    v_bookings_confirmed,
    v_bookings_cancelled,
    v_no_shows,
    v_attendees
  FROM public.bookings
  WHERE event_id = p_event_id
    AND date = p_date;
  
  -- Insert or update analytics
  INSERT INTO public.event_analytics (
    event_id, date, bookings_created, bookings_confirmed,
    bookings_cancelled, no_shows, attendees
  ) VALUES (
    p_event_id, p_date, v_bookings_created, v_bookings_confirmed,
    v_bookings_cancelled, v_no_shows, v_attendees
  )
  ON CONFLICT (event_id, date) DO UPDATE SET
    bookings_created = EXCLUDED.bookings_created,
    bookings_confirmed = EXCLUDED.bookings_confirmed,
    bookings_cancelled = EXCLUDED.bookings_cancelled,
    no_shows = EXCLUDED.no_shows,
    attendees = EXCLUDED.attendees,
    conversion_rate = CASE 
      WHEN EXCLUDED.bookings_created > 0 
      THEN (EXCLUDED.bookings_confirmed::DECIMAL / EXCLUDED.bookings_created * 100)
      ELSE 0 
    END,
    attendance_rate = CASE 
      WHEN EXCLUDED.bookings_confirmed > 0 
      THEN (EXCLUDED.attendees::DECIMAL / EXCLUDED.bookings_confirmed * 100)
      ELSE 0 
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get event summary statistics
CREATE OR REPLACE FUNCTION public.get_event_stats(p_event_id UUID)
RETURNS TABLE (
  total_bookings BIGINT,
  confirmed_bookings BIGINT,
  pending_bookings BIGINT,
  cancelled_bookings BIGINT,
  attendance_rate NUMERIC,
  avg_booking_lead_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'confirmed') > 0
      THEN (COUNT(*) FILTER (WHERE attended = TRUE)::NUMERIC / 
            COUNT(*) FILTER (WHERE status = 'confirmed') * 100)
      ELSE 0
    END as attendance_rate,
    AVG((date + time) - created_at) as avg_booking_lead_time
  FROM public.bookings
  WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUDIT LOG FUNCTION
-- =====================================================

-- Create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    user_id, action, entity_type, entity_id, old_data, new_data
  ) VALUES (
    auth.uid(), p_action, p_entity_type, p_entity_id, p_old_data, p_new_data
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTIFICATION FUNCTIONS
-- =====================================================

-- Create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, event_id, booking_id, data
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_event_id, p_booking_id, p_data
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEARCH FUNCTIONS
-- =====================================================

-- Search events with full-text search
CREATE OR REPLACE FUNCTION public.search_events(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  type TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.type,
    ts_rank(
      to_tsvector('english', e.title || ' ' || COALESCE(e.description, '')),
      plainto_tsquery('english', p_query)
    ) as relevance
  FROM public.events e
  WHERE 
    e.status = 'active'
    AND e.visibility = 'public'
    AND (
      to_tsvector('english', e.title || ' ' || COALESCE(e.description, '')) @@ 
      plainto_tsquery('english', p_query)
    )
  ORDER BY relevance DESC, e.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.create_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_to_waitlist TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_waitlist TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_slots TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_available TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_events TO anon, authenticated;