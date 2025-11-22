-- Function to decrement stock safely
create or replace function decrement_stock(row_id uuid, amount numeric)
returns void as $$
begin
  update public.ingredients
  set current_stock = current_stock - amount
  where id = row_id;
end;
$$ language plpgsql;
