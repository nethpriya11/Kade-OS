-- 1. Ensure profiles table exists
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  full_name text,
  role text default 'staff' check (role in ('admin', 'staff')),
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- 3. Re-create policies (drop first to avoid errors)
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- 4. Create or Replace the Trigger Function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, role, full_name)
  values (
    new.id, 
    split_part(new.email, '@', 1), -- Extract username from email
    'staff', -- Default role
    split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing; -- Prevent errors if profile exists
  return new;
end;
$$ language plpgsql security definer;

-- 5. Re-create the Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Backfill missing profiles for existing users
insert into public.profiles (id, username, role, full_name)
select 
  id, 
  split_part(email, '@', 1), 
  'staff', 
  split_part(email, '@', 1)
from auth.users
where id not in (select id from public.profiles);
