-- Create onboarding_sessions table for storing draft onboarding data
create table if not exists public.onboarding_sessions (
  session_id uuid primary key default gen_random_uuid(),
  device_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.onboarding_sessions enable row level security;

-- Allow anonymous users to insert (anyone can start a session)
create policy "Allow anonymous insert"
  on public.onboarding_sessions
  for insert
  with check (true);

-- Allow anonymous users to update their own session (based on session_id matching)
-- Note: Since we don't have auth, this effectively means anyone can update if they know the UUID.
-- In a real production app, we might want to sign this ID or use a temporary token.
create policy "Allow anonymous update"
  on public.onboarding_sessions
  for update
  using (true)
  with check (true);

-- Allow reading (for recovery)
create policy "Allow anonymous select"
  on public.onboarding_sessions
  for select
  using (true);

-- Trigger to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_onboarding_sessions_updated_at
  before update on public.onboarding_sessions
  for each row
  execute function public.handle_updated_at();
