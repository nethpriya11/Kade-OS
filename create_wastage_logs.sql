create table wastage_logs (
  id uuid default gen_random_uuid() primary key,
  ingredient_id uuid references ingredients(id) not null,
  quantity numeric not null,
  reason text,
  cost_at_time numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table wastage_logs enable row level security;

create policy "Enable read access for all users" on wastage_logs for select using (true);
create policy "Enable insert access for all users" on wastage_logs for insert with check (true);
