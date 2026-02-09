-- ============================================
-- Equipment Schema Redesign: Monitoring System
-- ============================================
-- Changes:
-- 1. Remove current_temperature from equipment (no real-time monitoring)
-- 2. Add inventory_number to equipment
-- 3. Extend equipment_logs to support humidity, CO2, O2 (monitoring readings)
-- 4. Create equipment_monitoring_params table (defines which params each equipment type needs)
-- 5. Add RLS policies

-- ============================================
-- 1. MODIFY EQUIPMENT TABLE
-- ============================================

-- Remove current_temperature (user explicitly said "не нужны, так как нет мониторинга")
ALTER TABLE equipment DROP COLUMN IF EXISTS current_temperature;

-- Add inventory number
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS inventory_number TEXT;

-- ============================================
-- 2. EXTEND EQUIPMENT_LOGS → MONITORING READINGS
-- ============================================

-- Add new monitoring columns to equipment_logs
ALTER TABLE equipment_logs ADD COLUMN IF NOT EXISTS humidity NUMERIC;       -- Влажность (%)
ALTER TABLE equipment_logs ADD COLUMN IF NOT EXISTS co2_level NUMERIC;      -- Содержание CO2 (%)
ALTER TABLE equipment_logs ADD COLUMN IF NOT EXISTS o2_level NUMERIC;       -- Содержание O2 (%)
ALTER TABLE equipment_logs ADD COLUMN IF NOT EXISTS logged_by UUID;         -- Кто записал

-- ============================================
-- 3. EQUIPMENT MONITORING PARAMS (what to monitor per equipment type)
-- ============================================

CREATE TABLE IF NOT EXISTS equipment_monitoring_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_type TEXT NOT NULL,             -- INCUBATOR, FRIDGE, FREEZER, etc.
    param_key TEXT NOT NULL,                  -- temperature, humidity, co2_level, o2_level
    param_label TEXT NOT NULL,                -- Человекочитаемое название
    unit TEXT NOT NULL,                       -- °C, %, etc.
    min_value NUMERIC,                        -- Минимально допустимое
    max_value NUMERIC,                        -- Максимально допустимое
    is_required BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(equipment_type, param_key)
);

-- ============================================
-- 4. SEED MONITORING PARAMS
-- ============================================

-- Инкубатор CO2: температура 37°C, CO2 5%, влажность 95%
INSERT INTO equipment_monitoring_params (equipment_type, param_key, param_label, unit, min_value, max_value, is_required, sort_order) VALUES
('INCUBATOR', 'temperature', 'Температура', '°C', 35.0, 39.0, true, 1),
('INCUBATOR', 'co2_level', 'Содержание CO2', '%', 4.0, 6.0, true, 2),
('INCUBATOR', 'humidity', 'Влажность', '%', 90.0, 99.0, false, 3);

-- Холодильник: температура 2-8°C
INSERT INTO equipment_monitoring_params (equipment_type, param_key, param_label, unit, min_value, max_value, is_required, sort_order) VALUES
('FRIDGE', 'temperature', 'Температура', '°C', 2.0, 8.0, true, 1);

-- Морозильник -20: температура -25..-15°C
INSERT INTO equipment_monitoring_params (equipment_type, param_key, param_label, unit, min_value, max_value, is_required, sort_order) VALUES
('FREEZER', 'temperature', 'Температура', '°C', -25.0, -15.0, true, 1);

-- Морозильник -80: температура -86..-70°C (тот же тип FREEZER, но у конкретного оборудования будут свои границы)
-- Оператор может сам добавить параметры через UI

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- equipment_monitoring_params
ALTER TABLE equipment_monitoring_params ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monitoring_params_select" ON equipment_monitoring_params FOR SELECT TO authenticated USING (true);
CREATE POLICY "monitoring_params_insert" ON equipment_monitoring_params FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "monitoring_params_update" ON equipment_monitoring_params FOR UPDATE TO authenticated USING (true);
CREATE POLICY "monitoring_params_delete" ON equipment_monitoring_params FOR DELETE TO authenticated USING (true);

-- equipment_logs (ensure full CRUD)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipment_logs' AND policyname = 'equipment_logs_select') THEN
    CREATE POLICY "equipment_logs_select" ON equipment_logs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipment_logs' AND policyname = 'equipment_logs_insert') THEN
    CREATE POLICY "equipment_logs_insert" ON equipment_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 6. INDEX FOR MONITORING QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_equipment_logs_equipment_logged
  ON equipment_logs(equipment_id, logged_at DESC);
