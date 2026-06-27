-- Shifts Table for Staff Attendance Tracking
CREATE TABLE IF NOT EXISTS shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  duration_minutes INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-calculate duration on clock out
CREATE OR REPLACE FUNCTION calculate_shift_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL AND OLD.clock_out IS NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_clock_out
BEFORE UPDATE ON shifts
FOR EACH ROW EXECUTE FUNCTION calculate_shift_duration();

-- RLS Policies
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read shifts
CREATE POLICY "Authenticated users can read shifts" ON shifts
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own shift, admins can insert any
CREATE POLICY "Users can clock in" ON shifts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own shift, admins can update any
CREATE POLICY "Users can clock out their own shift" ON shifts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
