-- supabase/migrations/20240103000000_seed_mock_data.sql
-- Seed Mock Data: Adds Sarah Johnson and Product Strategy Workshop

DO $$
DECLARE
    v_user_id UUID;
    v_event_id UUID;
BEGIN
    -- 1. Use an existing user or create a temporary ID for the profile
    -- NOTE: In a real environment, this ID must exist in auth.users
    -- For this script, we assume you have at least one user in auth.users
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- 2. Create the Organizer Profile
        INSERT INTO public.profiles (
          id, email, first_name, last_name, role, avatar_url, organization
        ) VALUES (
          v_user_id, 
          'sarah.johnson@example.com', 
          'Sarah', 
          'Johnson', 
          'Senior Product Manager', 
          'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
          'Tech Hub'
        ) ON CONFLICT (id) DO UPDATE SET 
          role = EXCLUDED.role, 
          avatar_url = EXCLUDED.avatar_url;

        -- 3. Create the Product Strategy Workshop Event
        INSERT INTO public.events (
          user_id, title, description, type, duration, location, 
          is_online, max_attendees, current_attendees, status, visibility,
          available_days, time_slots, custom_fields
        ) VALUES (
          v_user_id,
          'Product Strategy Workshop',
          'Join us for an interactive workshop where we''ll dive deep into product strategy, roadmap planning, and user research methodologies.',
          'workshop',
          120,
          'Conference Room A, Tech Hub',
          false,
          25,
          18,
          'active',
          'public',
          ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          '{"start": "09:00", "end": "17:00"}'::jsonb,
          '[
            {"time": "09:00", "item": "Welcome & Introductions"},
            {"time": "10:30", "item": "Strategy Fundamentals"},
            {"time": "13:00", "item": "Roadmap Exercise"}
          ]'::jsonb
        ) RETURNING id INTO v_event_id;

        -- 4. Generate future slots for the next 14 days
        PERFORM public.generate_event_slots(
          v_event_id, 
          CURRENT_DATE, 
          (CURRENT_DATE + INTERVAL '14 days')::DATE, 
          10
        );
    END IF;
END $$;