-- Migration: Add Donations, Tissue Types, extend Donors
-- Date: 01.02.2026

-- 1. tissue_types
CREATE TABLE IF NOT EXISTS tissue_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tissue_form TEXT DEFAULT 'SOLID',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Extend donors
ALTER TABLE donors ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS created_by UUID;

-- Rename gender → sex if gender exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='donors' AND column_name='gender' 
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name='donors' AND column_name='sex')) 
  THEN
    ALTER TABLE donors RENAME COLUMN gender TO sex;
  END IF;
END $$;

-- 3. donations
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    donor_id UUID NOT NULL REFERENCES donors(id),
    collected_at DATE NOT NULL,
    tissue_type_id UUID REFERENCES tissue_types(id),
    tissue_form TEXT,
    tissue_volume_ml NUMERIC,
    tissue_weight_g NUMERIC,
    consent_received BOOLEAN DEFAULT false,
    consent_document TEXT,
    contract_number TEXT,
    contract_date DATE,
    inf_hiv TEXT DEFAULT 'PENDING',
    inf_hbv TEXT DEFAULT 'PENDING',
    inf_hcv TEXT DEFAULT 'PENDING',
    inf_syphilis TEXT DEFAULT 'PENDING',
    status TEXT DEFAULT 'QUARANTINE',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. cultures.donation_id
ALTER TABLE cultures ADD COLUMN IF NOT EXISTS donation_id UUID REFERENCES donations(id);

-- 5. lots extensions
ALTER TABLE lots ADD COLUMN IF NOT EXISTS parent_lot_id UUID REFERENCES lots(id);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS source_container_id UUID REFERENCES containers(id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_cultures_donation_id ON cultures(donation_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_lots_parent_lot_id ON lots(parent_lot_id);

-- 7. Trigger for auto donation status
CREATE OR REPLACE FUNCTION update_donation_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.inf_hiv = 'NEGATIVE' AND NEW.inf_hbv = 'NEGATIVE'
       AND NEW.inf_hcv = 'NEGATIVE' AND NEW.inf_syphilis = 'NEGATIVE' THEN
        NEW.status = 'APPROVED';
    ELSIF NEW.inf_hiv = 'POSITIVE' OR NEW.inf_hbv = 'POSITIVE'
          OR NEW.inf_hcv = 'POSITIVE' OR NEW.inf_syphilis = 'POSITIVE' THEN
        NEW.status = 'REJECTED';
    ELSE
        NEW.status = 'QUARANTINE';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_donation_status_trigger ON donations;
CREATE TRIGGER update_donation_status_trigger
    BEFORE INSERT OR UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION update_donation_status();

-- 8. Seed tissue_types
INSERT INTO tissue_types (code, name, tissue_form, is_active) VALUES
('ADIPOSE', 'Жировая ткань', 'SOLID', true),
('CARTILAGE', 'Хрящевая ткань', 'SOLID', true),
('BONE', 'Костная ткань', 'SOLID', true),
('BONE_MARROW', 'Костный мозг', 'LIQUID', true),
('BLOOD', 'Кровь', 'LIQUID', true),
('SKIN', 'Кожа', 'SOLID', true),
('MUSCLE', 'Мышечная ткань', 'SOLID', true),
('PLACENTA', 'Плацента', 'SOLID', true),
('CORD_BLOOD', 'Пуповинная кровь', 'LIQUID', true)
ON CONFLICT (code) DO NOTHING;

-- 9. RLS for new tables
ALTER TABLE tissue_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tissue_types_read" ON tissue_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "donations_read" ON donations FOR SELECT TO authenticated USING (true);
CREATE POLICY "donations_insert" ON donations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "donations_update" ON donations FOR UPDATE TO authenticated USING (true);
