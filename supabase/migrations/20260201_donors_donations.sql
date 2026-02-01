-- LabPro: Доноры и Донации
-- Дата: 01.02.2026
-- Добавляет сущность Donation и расширяет Donor

-- ============================================
-- 1. ENUMS
-- ============================================

DROP TYPE IF EXISTS donation_status CASCADE;
DROP TYPE IF EXISTS infection_test_result CASCADE;

CREATE TYPE donation_status AS ENUM ('QUARANTINE', 'APPROVED', 'REJECTED');
CREATE TYPE infection_test_result AS ENUM ('PENDING', 'NEGATIVE', 'POSITIVE');

-- ============================================
-- 2. Справочник TISSUE_TYPES
-- ============================================

CREATE TABLE IF NOT EXISTS tissue_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    tissue_form VARCHAR(20) NOT NULL CHECK (tissue_form IN ('SOLID', 'LIQUID')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Заполняем справочник
INSERT INTO tissue_types (code, name, tissue_form) VALUES
('SKIN', 'Кожа (дерма)', 'SOLID'),
('FAT', 'Жировая ткань', 'SOLID'),
('CARTILAGE', 'Хрящевая ткань', 'SOLID'),
('BONE_MARROW', 'Костный мозг', 'LIQUID'),
('BLOOD', 'Кровь', 'LIQUID'),
('MUSCLE', 'Мышечная ткань', 'SOLID'),
('PLACENTA', 'Плацента', 'SOLID'),
('CORD_BLOOD', 'Пуповинная кровь', 'LIQUID')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 3. Расширение таблицы DONORS
-- ============================================

-- Добавляем новые колонки
ALTER TABLE donors ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS sex VARCHAR(10);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS email VARCHAR(200);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Удаляем старые колонки (которые переносятся в Donation)
ALTER TABLE donors DROP COLUMN IF EXISTS gender;
ALTER TABLE donors DROP COLUMN IF EXISTS blood_type;
ALTER TABLE donors DROP COLUMN IF EXISTS consent_date;
ALTER TABLE donors DROP COLUMN IF EXISTS consent_number;
ALTER TABLE donors DROP COLUMN IF EXISTS status;
ALTER TABLE donors DROP COLUMN IF EXISTS tissue_type;
ALTER TABLE donors DROP COLUMN IF EXISTS collection_date;

-- ============================================
-- 4. Таблица DONATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tissue_type_id UUID REFERENCES tissue_types(id),
    tissue_form VARCHAR(20) CHECK (tissue_form IN ('SOLID', 'LIQUID')),
    tissue_volume_ml DECIMAL(10, 2),
    tissue_weight_g DECIMAL(10, 3),
    consent_received BOOLEAN NOT NULL DEFAULT false,
    consent_document TEXT,
    contract_number VARCHAR(100),
    contract_date DATE,
    inf_hiv infection_test_result NOT NULL DEFAULT 'PENDING',
    inf_hbv infection_test_result NOT NULL DEFAULT 'PENDING',
    inf_hcv infection_test_result NOT NULL DEFAULT 'PENDING',
    inf_syphilis infection_test_result NOT NULL DEFAULT 'PENDING',
    status donation_status NOT NULL DEFAULT 'QUARANTINE',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Индексы для donations
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_collected_at ON donations(collected_at);

-- ============================================
-- 5. Обновление таблицы CULTURES
-- ============================================

ALTER TABLE cultures ADD COLUMN IF NOT EXISTS donation_id UUID REFERENCES donations(id);

-- Создаём индекс
CREATE INDEX IF NOT EXISTS idx_cultures_donation_id ON cultures(donation_id);

-- ============================================
-- 6. Функции автогенерации кодов
-- ============================================

-- Генерация кода донора D-XXXX
CREATE OR REPLACE FUNCTION generate_donor_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'D-' || LPAD(
      (SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 3) AS INTEGER)), 0) + 1
       FROM donors WHERE code ~ '^D-[0-9]+$')::TEXT,
      4, '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS trg_donor_code ON donors;
CREATE TRIGGER trg_donor_code
  BEFORE INSERT ON donors
  FOR EACH ROW EXECUTE FUNCTION generate_donor_code();

-- Генерация кода донации DN-XXXX
CREATE OR REPLACE FUNCTION generate_donation_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'DN-' || LPAD(
      (SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)), 0) + 1
       FROM donations WHERE code ~ '^DN-[0-9]+$')::TEXT,
      4, '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS trg_donation_code ON donations;
CREATE TRIGGER trg_donation_code
  BEFORE INSERT ON donations
  FOR EACH ROW EXECUTE FUNCTION generate_donation_code();

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- tissue_types - только чтение для authenticated
ALTER TABLE tissue_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON tissue_types;
CREATE POLICY "Authenticated read" ON tissue_types
  FOR SELECT USING (auth.role() IN ('authenticated'));

-- donations - полный доступ для authenticated (SELECT, INSERT, UPDATE)
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON donations;
DROP POLICY IF EXISTS "Authenticated insert" ON donations;
DROP POLICY IF EXISTS "Authenticated update" ON donations;

CREATE POLICY "Authenticated read" ON donations
  FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated insert" ON donations
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated update" ON donations
  FOR UPDATE USING (auth.role() IN ('authenticated'));

-- donors - добавляем RLS
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON donors;
DROP POLICY IF EXISTS "Authenticated insert" ON donors;
DROP POLICY IF EXISTS "Authenticated update" ON donors;

CREATE POLICY "Authenticated read" ON donors
  FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated insert" ON donors
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated update" ON donors
  FOR UPDATE USING (auth.role() IN ('authenticated'));

-- cultures - добавляем RLS для donation_id
ALTER TABLE cultures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read cultures" ON cultures;
CREATE POLICY "Authenticated read cultures" ON cultures
  FOR SELECT USING (auth.role() IN ('authenticated'));

-- ============================================
-- 8. Функция обновления статуса донации
-- ============================================

CREATE OR REPLACE FUNCTION update_donation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Автоматическое определение статуса на основе тестов
  IF NEW.inf_hiv IN ('POSITIVE') OR 
     NEW.inf_hbv IN ('POSITIVE') OR 
     NEW.inf_hcv IN ('POSITIVE') OR 
     NEW.inf_syphilis IN ('POSITIVE') THEN
    NEW.status := 'REJECTED';
  ELSIF NEW.inf_hiv = 'NEGATIVE' AND 
        NEW.inf_hbv = 'NEGATIVE' AND 
        NEW.inf_hcv = 'NEGATIVE' AND 
        NEW.inf_syphilis = 'NEGATIVE' THEN
    NEW.status := 'APPROVED';
  ELSE
    NEW.status := 'QUARANTINE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на автоматическое обновление статуса
DROP TRIGGER IF EXISTS trg_update_donation_status ON donations;
CREATE TRIGGER trg_update_donation_status
  BEFORE UPDATE OF inf_hiv, inf_hbv, inf_hcv, inf_syphilis
  ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donation_status();
