-- Allow admins to manage all profiles (update roles, names, delete)
create policy "Admins can manage all profiles." on public.profiles
  for all using (
    auth.uid() in (select id from public.profiles where role = 'admin')
  );
