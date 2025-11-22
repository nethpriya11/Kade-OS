-- Enable Realtime for orders and wastage_logs
begin;
  -- Check if publication exists, if not create it (usually exists by default)
  -- But we can just try to add tables to it.
  
  -- Add tables to the publication
  alter publication supabase_realtime add table orders;
  alter publication supabase_realtime add table wastage_logs;
commit;
