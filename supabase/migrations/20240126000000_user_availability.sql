-- supabase/migrations/20240126000000_user_availability.sql
-- User Availability Management Migration

-- =====================================================
-- AVAILABILITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.availabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Day of week: 0 (Sunday) to 6 (Saturday)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  -- Time ranges
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT availabilities_time_check CHECK (end_time > start_time)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_availabilities_user_id ON public.availabilities(user_id);

-- Enable RLS
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Users can view their own availability
CREATE POLICY "Users can view their own availability"
  ON public.availabilities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own availability
CREATE POLICY "Users can insert their own availability"
  ON public.availabilities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own availability
CREATE POLICY "Users can update their own availability"
  ON public.availabilities
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own availability
CREATE POLICY "Users can delete their own availability"
  ON public.availabilities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Public can view availability of other users (for booking pages)
-- This is restricted to prevent scraping raw schedules.
-- Instead of broad select, we should ideally use an RPC or scoped view.
-- For now, we restrict this to users who have at least one public event.
CREATE POLICY "Public can view user availability"
  ON public.availabilities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.user_id = availabilities.user_id
      AND events.is_public = true
    )
  );
