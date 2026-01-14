-- supabase/migrations/20240101000000_initial_schema.sql
-- Schedlyx Database Schema - Initial Migration
-- UPDATED: Slug generation fix to prevent 409 Conflict errors

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
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
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'meeting',
  duration INTEGER NOT NULL CHECK (duration > 0),
  buffer_time INTEGER DEFAULT 0 CHECK (buffer_time >= 0),
  location TEXT,
  is_online BOOLEAN DEFAULT false,
  meeting_url TEXT,
  max_attendees INTEGER CHECK (max_attendees IS NULL OR max_attendees > 0),
  min_attendees INTEGER DEFAULT 1 CHECK (min_attendees > 0),
  current_attendees INTEGER DEFAULT 0 CHECK (current_attendees >= 0),
  requires_approval BOOLEAN DEFAULT false,
  allow_cancellation BOOLEAN DEFAULT true,
  cancellation_deadline INTEGER DEFAULT 24,
  booking_window_start INTEGER DEFAULT 0,
  booking_window_end INTEGER DEFAULT 2160,
  available_days TEXT[] DEFAULT '{}',
  time_slots JSONB DEFAULT '{"start": "09:00", "end": "17:00"}'::jsonb,
  recurring_schedule JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT DEFAULT 'public',
  custom_fields JSONB DEFAULT '[]'::jsonb,
  confirmation_message TEXT,
  reminder_settings JSONB DEFAULT '{"enabled": true, "hours_before": [24, 1]}'::jsonb,
  tags TEXT[],
  color TEXT DEFAULT '#2563eb',
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT events_type_check CHECK (type IN ('meeting', 'workshop', 'conference', 'consultation', 'interview', 'webinar', 'other')),
  CONSTRAINT events_status_check CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  CONSTRAINT events_visibility_check CHECK (visibility IN ('public', 'private', 'unlisted')),
  CONSTRAINT events_max_min_attendees_check CHECK (max_attendees IS NULL OR max_attendees >= min_attendees)
);

-- [Event Sessions, Bookings, Waitlist, and other tables follow original turn 0 content...]

-- =====================================================
-- EVENT SLUG GENERATION TRIGGER
-- FIXED: Use random suffix to avoid 409 Conflict if NEW.id is null
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
    ) || '-' || lower(substr(md5(random()::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_events_slug BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.generate_event_slug();

-- [Rest of triggers and indexes follow original turn 0 content...]