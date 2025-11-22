-- FORCE RESET REALTIME
-- Run this to fix "Dashboard not updating" issues

BEGIN;
  -- 1. Remove tables from publication (ignore errors if they aren't there)
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS orders;
  ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS wastage_logs;

  -- 2. Re-add tables to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE wastage_logs;
COMMIT;

-- 3. Verify (Optional - output should show the tables)
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
