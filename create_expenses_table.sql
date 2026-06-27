-- Expenses Table for Business Cost Tracking
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('Rent', 'Utilities', 'Salaries', 'Ingredients', 'Equipment', 'Marketing', 'Repairs', 'Other')),
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read expenses" ON expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert expenses" ON expenses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete expenses" ON expenses
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
