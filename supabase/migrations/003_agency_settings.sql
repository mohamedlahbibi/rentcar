-- Agency settings (single row)
CREATE TABLE IF NOT EXISTS agency_settings (
  id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  return_hour TEXT NOT NULL DEFAULT '10:00',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default row
INSERT INTO agency_settings (id, return_hour) VALUES (1, '10:00')
ON CONFLICT (id) DO NOTHING;

-- Only staff (admin/manager) can update; everyone can read
ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON agency_settings FOR SELECT USING (true);
CREATE POLICY "staff update" ON agency_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid()));
