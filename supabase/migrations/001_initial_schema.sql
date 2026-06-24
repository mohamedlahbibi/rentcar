-- ─────────────────────────────────────────────────────────────
-- DriveEasy Rentals — Initial Schema
-- Run this in the Supabase SQL editor (or via supabase db push)
-- ─────────────────────────────────────────────────────────────

-- ── Clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id       UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name     TEXT NOT NULL,
  email    TEXT NOT NULL UNIQUE,
  phone    TEXT NOT NULL,
  cin      TEXT NOT NULL UNIQUE,
  permis_id TEXT NOT NULL UNIQUE,
  address  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Staff (admin / manager) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role  TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Cars ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cars (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  year          INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('Citadine', 'SUV', 'Berline', 'Utilitaire')),
  fuel          TEXT NOT NULL CHECK (fuel IN ('Essence', 'Diesel', 'Électrique', 'Hybride')),
  transmission  TEXT NOT NULL CHECK (transmission IN ('Manuelle', 'Automatique')),
  seats         INTEGER NOT NULL,
  mileage       INTEGER NOT NULL DEFAULT 0,
  price_per_day NUMERIC(10,2) NOT NULL,
  color         TEXT NOT NULL,
  matricule     TEXT NOT NULL UNIQUE,
  is_available  BOOLEAN DEFAULT TRUE,
  images        TEXT[] DEFAULT '{}',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reservations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
  car_id           UUID REFERENCES cars(id) ON DELETE RESTRICT NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  total_price      NUMERIC(10,2) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING','CONFIRMED','REJECTED','COMPLETED','CANCELLED')),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_overlap CHECK (start_date < end_date)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Maintenance Records ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_records (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id            UUID REFERENCES cars(id) ON DELETE CASCADE NOT NULL,
  date              DATE NOT NULL,
  type              TEXT NOT NULL,
  km_at_service     INTEGER NOT NULL,
  next_service_km   INTEGER,
  next_service_date DATE,
  cost              NUMERIC(10,2),
  provider          TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contracts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id      UUID REFERENCES reservations(id) ON DELETE RESTRICT UNIQUE NOT NULL,
  fuel_level          TEXT,
  km_at_pickup        INTEGER,
  car_condition_notes TEXT,
  deposit             NUMERIC(10,2),
  additional_notes    TEXT,
  generated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars               ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts          ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a staff member?
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- Cars: everyone can read, only staff can write
CREATE POLICY "cars_read_all"   ON cars FOR SELECT USING (TRUE);
CREATE POLICY "cars_write_staff" ON cars FOR ALL USING (is_staff());

-- Users: can read/update own row; staff can read all
CREATE POLICY "users_own"       ON users FOR ALL USING (id = auth.uid());
CREATE POLICY "users_staff_read" ON users FOR SELECT USING (is_staff());

-- Reservations: client sees own; staff sees all
CREATE POLICY "reservations_own"        ON reservations FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "reservations_own_insert" ON reservations FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "reservations_own_cancel" ON reservations FOR UPDATE
  USING (client_id = auth.uid() AND status = 'PENDING');
CREATE POLICY "reservations_staff"      ON reservations FOR ALL USING (is_staff());

-- Maintenance: staff only
CREATE POLICY "maintenance_staff" ON maintenance_records FOR ALL USING (is_staff());

-- Contracts: staff only
CREATE POLICY "contracts_staff" ON contracts FOR ALL USING (is_staff());

-- Staff table: only staff can read
CREATE POLICY "staff_self" ON staff FOR SELECT USING (id = auth.uid());
CREATE POLICY "staff_admin_all" ON staff FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE id = auth.uid() AND role = 'ADMIN'));

-- ─────────────────────────────────────────────────────────────
-- Seed: dev data (optional — remove before production)
-- ─────────────────────────────────────────────────────────────

INSERT INTO cars (brand, model, year, type, fuel, transmission, seats, mileage, price_per_day, color, matricule, is_available, notes)
VALUES
  ('Renault',  'Clio 5',   2023, 'Citadine',   'Essence', 'Automatique', 5, 18500, 125, 'Bleu nuit',      '214 TN 7821', TRUE,  'Compacte premium pour ville et aéroport.'),
  ('Hyundai',  'Tucson',   2022, 'SUV',        'Diesel',  'Automatique', 5, 40200, 240, 'Gris graphite',  '211 TN 4420', TRUE,  'SUV confortable pour longues distances.'),
  ('Toyota',   'Corolla',  2021, 'Berline',    'Hybride', 'Automatique', 5, 52000, 190, 'Blanc perle',    '208 TN 5539', FALSE, 'Très économique, idéale business.'),
  ('Peugeot',  'Partner',  2020, 'Utilitaire', 'Diesel',  'Manuelle',    3, 73500, 165, 'Argent',         '205 TN 9014', TRUE,  'Volume utile pour livraisons locales.')
ON CONFLICT (matricule) DO NOTHING;
