-- v1.25.16 Migration: QC test configs + culture_type_qc_requirements + unit in inventory_movements
-- Run this in Supabase Dashboard SQL Editor: https://supabase.com/dashboard/project/cyyqzuuozuzlhdlzvohh/sql

-- ==================== 1. QC Test Configs (справочник тестов) ====================

CREATE TABLE IF NOT EXISTS qc_test_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  methodology TEXT,
  unit TEXT,
  ref_min NUMERIC,
  ref_max NUMERIC,
  result_type TEXT DEFAULT 'BINARY',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO qc_test_configs (code, name, result_type, sort_order) VALUES
  ('MYCOPLASMA', 'Микоплазма', 'BINARY', 1),
  ('STERILITY', 'Стерильность', 'BINARY', 2),
  ('LAL', 'LAL-тест', 'NUMERIC', 3),
  ('VIA', 'Жизнеспособность', 'NUMERIC', 4)
ON CONFLICT (code) DO NOTHING;

-- ==================== 2. Culture Type QC Requirements ====================

CREATE TABLE IF NOT EXISTS culture_type_qc_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  culture_type_id UUID REFERENCES culture_types(id) ON DELETE CASCADE,
  qc_test_config_id UUID REFERENCES qc_test_configs(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  UNIQUE(culture_type_id, qc_test_config_id)
);

-- ==================== 3. RLS Policies ====================

ALTER TABLE qc_test_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE culture_type_qc_requirements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for qc_test_configs') THEN
    CREATE POLICY "Allow all for qc_test_configs" ON qc_test_configs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for culture_type_qc_requirements') THEN
    CREATE POLICY "Allow all for culture_type_qc_requirements" ON culture_type_qc_requirements FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== 4. Unit column in inventory_movements ====================

ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS unit TEXT;

-- Done!
