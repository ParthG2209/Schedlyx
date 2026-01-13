-- supabase/migrations/20240101000000_initial_schema.sql
-- Schedlyx Database Schema - Initial Migration
-- This creates the foundation for the scheduling platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
-- Extended user profile data (complements auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  phone TEXT,
  organization TEXT,
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- EVENTS TABLE
-- =====================================================
-- Core events table for all scheduling types
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Basic Information
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'meeting',
  
  -- Scheduling Details
  duration INTEGER NOT NULL CHECK (duration > 0), -- in minutes
  buffer_time INTEGER DEFAULT 0 CHECK (buffer_time >= 0), -- buffer between bookings
  
  -- Location
  location TEXT,
  is_online BOOLEAN DEFAULT false,
  meeting_url TEXT,
  
  -- Capacity
  max_attendees INTEGER CHECK (max_attendees IS NULL OR max_attendees > 0),
  min_attendees INTEGER DEFAULT 1 CHECK (min_attendees > 0),
  current_attendees INTEGER DEFAULT 0 CHECK (current_attendees >= 0),
  
  -- Booking Rules
  requires_approval BOOLEAN DEFAULT false,
  allow_cancellation BOOLEAN DEFAULT true,
  cancellation_deadline INTEGER DEFAULT 24, -- hours before event
  booking_window_start INTEGER DEFAULT 0, -- hours from now bookings can start
  booking_window_end INTEGER DEFAULT 2160, -- hours from now bookings can end (90 days)
  
  -- Availability
  available_days TEXT[] DEFAULT '{}',
  time_slots JSONB DEFAULT '{"start": "09:00", "end": "17:00"}'::jsonb,
  recurring_schedule JSONB, -- For complex recurring patterns
  
  -- Status and Visibility
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT DEFAULT 'public', -- public, private, unlisted
  
  -- Additional Settings
  custom_fields JSONB DEFAULT '[]'::jsonb,
  confirmation_message TEXT,
  reminder_settings JSONB DEFAULT '{"enabled": true, "hours_before": [24, 1]}'::jsonb,
  
  -- Metadata
  tags TEXT[],
  color TEXT DEFAULT '#2563eb',
  cover_image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT events_type_check CHECK (type IN ('meeting', 'workshop', 'conference', 'consultation', 'interview', 'webinar', 'other')),
  CONSTRAINT events_status_check CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  CONSTRAINT events_visibility_check CHECK (visibility IN ('public', 'private', 'unlisted')),
  CONSTRAINT events_max_min_attendees_check CHECK (max_attendees IS NULL OR max_attendees >= min_attendees)
);

-- =====================================================
-- EVENT SESSIONS TABLE
-- =====================================================
-- Specific time slots/sessions for events
CREATE TABLE public.event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Session Details
  title TEXT,
  description TEXT,
  
  -- Time
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Capacity (inherits from event if not specified)
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0 CHECK (current_attendees >= 0),
  
  -- Location (can override event location)
  location TEXT,
  meeting_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled',
  
  -- Speakers/Hosts
  hosts UUID[] DEFAULT '{}',
  speakers JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT event_sessions_time_check CHECK (end_time > start_time),
  CONSTRAINT event_sessions_status_check CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled'))
);

-- =====================================================
-- BOOKINGS/REGISTRATIONS TABLE
-- =====================================================
-- Individual bookings for events or sessions
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.event_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Attendee Information (for non-authenticated users)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Booking Details
  date DATE NOT NULL,
  time TIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Additional Data
  notes TEXT,
  custom_responses JSONB DEFAULT '{}'::jsonb,
  
  -- Attendance
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  attended BOOLEAN DEFAULT false,
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Payment (for future use)
  payment_status TEXT DEFAULT 'free',
  payment_amount DECIMAL(10, 2),
  payment_currency TEXT DEFAULT 'USD',
  
  -- Metadata
  source TEXT, -- web, mobile, api, admin
  referrer TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT bookings_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
  CONSTRAINT bookings_payment_status_check CHECK (payment_status IN ('free', 'pending', 'paid', 'refunded', 'failed'))
);

-- =====================================================
-- WAITLIST TABLE
-- =====================================================
-- Waitlist for fully booked events
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.event_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Waitlist Details
  position INTEGER NOT NULL,
  notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ,
  converted_to_booking BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT waitlist_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- =====================================================
-- AVAILABILITY OVERRIDES TABLE
-- =====================================================
-- Override default availability for specific dates
CREATE TABLE public.availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Date Range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Time Range (null means all day)
  start_time TIME,
  end_time TIME,
  
  -- Override Type
  type TEXT NOT NULL DEFAULT 'unavailable',
  
  -- Details
  reason TEXT,
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT availability_overrides_type_check CHECK (type IN ('unavailable', 'available', 'busy')),
  CONSTRAINT availability_overrides_date_check CHECK (end_date >= start_date)
);

-- =====================================================
-- CALENDAR INTEGRATIONS TABLE
-- =====================================================
-- External calendar connections
CREATE TABLE public.calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Provider Details
  provider TEXT NOT NULL,
  provider_calendar_id TEXT NOT NULL,
  
  -- OAuth Tokens (encrypted)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Settings
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'both', -- import, export, both
  last_sync_at TIMESTAMPTZ,
  
  -- Metadata
  calendar_name TEXT,
  calendar_color TEXT,
  is_primary BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT calendar_integrations_provider_check CHECK (provider IN ('google', 'outlook', 'apple', 'other')),
  CONSTRAINT calendar_integrations_sync_direction_check CHECK (sync_direction IN ('import', 'export', 'both')),
  CONSTRAINT calendar_integrations_unique_provider UNIQUE (user_id, provider, provider_calendar_id)
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
-- System notifications and alerts
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification Details
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related Entities
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Delivery
  sent_via_email BOOLEAN DEFAULT false,
  sent_via_sms BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  
  -- Metadata
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT notifications_type_check CHECK (type IN (
    'booking_created', 'booking_confirmed', 'booking_cancelled', 
    'booking_reminder', 'event_updated', 'event_cancelled',
    'payment_received', 'waitlist_spot_available', 'system_update'
  ))
);

-- =====================================================
-- EVENT ANALYTICS TABLE
-- =====================================================
-- Track event performance metrics
CREATE TABLE public.event_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Date
  date DATE NOT NULL,
  
  -- Metrics
  views INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  bookings_confirmed INTEGER DEFAULT 0,
  bookings_cancelled INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  attendees INTEGER DEFAULT 0,
  
  -- Conversion Metrics
  conversion_rate DECIMAL(5, 2),
  attendance_rate DECIMAL(5, 2),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT event_analytics_unique_date UNIQUE (event_id, date)
);

-- =====================================================
-- AUDIT LOG TABLE
-- =====================================================
-- Track important changes for compliance and debugging
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Actor
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Action Details
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Changes
  old_data JSONB,
  new_data JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT audit_log_action_check CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export')),
  CONSTRAINT audit_log_entity_type_check CHECK (entity_type IN ('profile', 'event', 'booking', 'session', 'integration'))
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Profiles
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Events
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_type ON public.events(type);
CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_events_visibility ON public.events(visibility);
CREATE INDEX idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX idx_events_tags ON public.events USING GIN(tags);

-- Event Sessions
CREATE INDEX idx_event_sessions_event_id ON public.event_sessions(event_id);
CREATE INDEX idx_event_sessions_start_time ON public.event_sessions(start_time);
CREATE INDEX idx_event_sessions_status ON public.event_sessions(status);

-- Bookings
CREATE INDEX idx_bookings_event_id ON public.bookings(event_id);
CREATE INDEX idx_bookings_session_id ON public.bookings(session_id);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_email ON public.bookings(email);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_date ON public.bookings(date);
CREATE INDEX idx_bookings_created_at ON public.bookings(created_at DESC);

-- Waitlist
CREATE INDEX idx_waitlist_event_id ON public.waitlist(event_id);
CREATE INDEX idx_waitlist_session_id ON public.waitlist(session_id);
CREATE INDEX idx_waitlist_email ON public.waitlist(email);
CREATE INDEX idx_waitlist_position ON public.waitlist(position);

-- Availability Overrides
CREATE INDEX idx_availability_overrides_user_id ON public.availability_overrides(user_id);
CREATE INDEX idx_availability_overrides_dates ON public.availability_overrides(start_date, end_date);

-- Calendar Integrations
CREATE INDEX idx_calendar_integrations_user_id ON public.calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_provider ON public.calendar_integrations(provider);

-- Notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Event Analytics
CREATE INDEX idx_event_analytics_event_id ON public.event_analytics(event_id);
CREATE INDEX idx_event_analytics_date ON public.event_analytics(date DESC);

-- Audit Log
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_sessions_updated_at BEFORE UPDATE ON public.event_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_availability_overrides_updated_at BEFORE UPDATE ON public.availability_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_analytics_updated_at BEFORE UPDATE ON public.event_analytics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- AUTO-CREATE PROFILE TRIGGER
-- =====================================================
-- Automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'firstName', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'lastName', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'avatar', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- EVENT SLUG GENERATION TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(
      regexp_replace(
        regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || substring(NEW.id::text from 1 for 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_events_slug BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.generate_event_slug();

-- =====================================================
-- BOOKING CAPACITY CHECK TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_booking_capacity()
RETURNS TRIGGER AS $$
DECLARE
  event_max_attendees INTEGER;
  session_max_attendees INTEGER;
  current_count INTEGER;
BEGIN
  -- Get event max attendees
  SELECT max_attendees INTO event_max_attendees
  FROM public.events
  WHERE id = NEW.event_id;
  
  -- Get session max attendees if applicable
  IF NEW.session_id IS NOT NULL THEN
    SELECT max_attendees INTO session_max_attendees
    FROM public.event_sessions
    WHERE id = NEW.session_id;
  END IF;
  
  -- Use session max if available, otherwise event max
  IF session_max_attendees IS NOT NULL THEN
    event_max_attendees := session_max_attendees;
  END IF;
  
  -- Check capacity if max is set
  IF event_max_attendees IS NOT NULL THEN
    IF NEW.session_id IS NOT NULL THEN
      SELECT COUNT(*) INTO current_count
      FROM public.bookings
      WHERE session_id = NEW.session_id
        AND status IN ('confirmed', 'pending');
    ELSE
      SELECT COUNT(*) INTO current_count
      FROM public.bookings
      WHERE event_id = NEW.event_id
        AND session_id IS NULL
        AND status IN ('confirmed', 'pending');
    END IF;
    
    IF current_count >= event_max_attendees THEN
      RAISE EXCEPTION 'Event or session is at maximum capacity';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_booking_capacity_trigger BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_capacity();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.profiles IS 'Extended user profile information';
COMMENT ON TABLE public.events IS 'Core events/scheduling configurations';
COMMENT ON TABLE public.event_sessions IS 'Specific time slots for events';
COMMENT ON TABLE public.bookings IS 'Individual bookings and registrations';
COMMENT ON TABLE public.waitlist IS 'Waitlist for fully booked events';
COMMENT ON TABLE public.availability_overrides IS 'Override default availability';
COMMENT ON TABLE public.calendar_integrations IS 'External calendar connections';
COMMENT ON TABLE public.notifications IS 'User notifications and alerts';
COMMENT ON TABLE public.event_analytics IS 'Event performance metrics';
COMMENT ON TABLE public.audit_log IS 'Audit trail for compliance';