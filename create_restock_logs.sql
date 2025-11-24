-- Create restock_logs table
create table public.restock_logs (
  id uuid default uuid_generate_v4() primary key,
  ingredient_id uuid references public.ingredients(id) on delete cascade,
  quantity numeric not null,
  cost_per_unit numeric not null,
  total_cost numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies (optional but good practice)
alter table public.restock_logs enable row level security;

create policy "Enable read access for all users" on public.restock_logs
  for select using (true);

create policy "Enable insert access for all users" on public.restock_logs
  for insert with check (true);
