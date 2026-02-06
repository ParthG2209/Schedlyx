
-- Create enums if they don't exist
do $$ begin
    create type calendar_provider as enum ('google', 'outlook', 'apple', 'other');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type sync_direction as enum ('import', 'export', 'both');
exception
    when duplicate_object then null;
end $$;

-- Create table
create table if not exists public.calendar_integrations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  provider calendar_provider not null,
  provider_calendar_id text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  sync_enabled boolean default true,
  sync_direction sync_direction default 'both',
  last_sync_at timestamptz,
  calendar_name text,
  calendar_color text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Prevent duplicate active integrations for same provider/calendar
  unique(user_id, provider, provider_calendar_id)
);

-- Enable RLS
alter table public.calendar_integrations enable row level security;

-- Policies
create policy "Users can view their own integrations"
  on public.calendar_integrations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own integrations"
  on public.calendar_integrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own integrations"
  on public.calendar_integrations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own integrations"
  on public.calendar_integrations for delete
  using (auth.uid() = user_id);
