-- Migration: monitoring per-equipment + RLS для CRUD справочников
-- Date: 2026-02-09

-- ============================================
-- 1. equipment_monitoring_params: привязка к конкретному оборудованию
-- ============================================

-- Добавляем equipment_id
ALTER TABLE equipment_monitoring_params
  ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE;

-- Удаляем старый constraint (по типу оборудования)
ALTER TABLE equipment_monitoring_params
  DROP CONSTRAINT IF EXISTS equipment_monitoring_params_equipment_type_param_key_key;

-- Новый constraint: уникальность по equipment_id + param_key
ALTER TABLE equipment_monitoring_params
  ADD CONSTRAINT equipment_monitoring_params_equipment_param_key
  UNIQUE(equipment_id, param_key);

-- Миграция данных: копируем дефолтные параметры для каждого существующего оборудования
-- Для каждого equipment, копируем параметры по его типу (если equipment_id ещё не задан)
INSERT INTO equipment_monitoring_params (equipment_id, equipment_type, param_key, param_label, unit, min_value, max_value, is_required, sort_order)
SELECT e.id, emp.equipment_type, emp.param_key, emp.param_label, emp.unit, emp.min_value, emp.max_value, emp.is_required, emp.sort_order
FROM equipment e
JOIN equipment_monitoring_params emp ON emp.equipment_type = e.type AND emp.equipment_id IS NULL
ON CONFLICT (equipment_id, param_key) DO NOTHING;

-- Удаляем старые записи без equipment_id (дефолтные шаблоны)
DELETE FROM equipment_monitoring_params WHERE equipment_id IS NULL;

-- ============================================
-- 2. RLS-политики для CRUD справочников
-- ============================================

-- container_types
ALTER TABLE container_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "container_types_select" ON container_types;
DROP POLICY IF EXISTS "container_types_insert" ON container_types;
DROP POLICY IF EXISTS "container_types_update" ON container_types;
CREATE POLICY "container_types_select" ON container_types FOR SELECT USING (true);
CREATE POLICY "container_types_insert" ON container_types FOR INSERT WITH CHECK (true);
CREATE POLICY "container_types_update" ON container_types FOR UPDATE USING (true);

-- culture_types
ALTER TABLE culture_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "culture_types_select" ON culture_types;
DROP POLICY IF EXISTS "culture_types_insert" ON culture_types;
DROP POLICY IF EXISTS "culture_types_update" ON culture_types;
CREATE POLICY "culture_types_select" ON culture_types FOR SELECT USING (true);
CREATE POLICY "culture_types_insert" ON culture_types FOR INSERT WITH CHECK (true);
CREATE POLICY "culture_types_update" ON culture_types FOR UPDATE USING (true);

-- tissue_types
ALTER TABLE tissue_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tissue_types_select" ON tissue_types;
DROP POLICY IF EXISTS "tissue_types_insert" ON tissue_types;
DROP POLICY IF EXISTS "tissue_types_update" ON tissue_types;
CREATE POLICY "tissue_types_select" ON tissue_types FOR SELECT USING (true);
CREATE POLICY "tissue_types_insert" ON tissue_types FOR INSERT WITH CHECK (true);
CREATE POLICY "tissue_types_update" ON tissue_types FOR UPDATE USING (true);

-- morphology_types
ALTER TABLE morphology_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "morphology_types_select" ON morphology_types;
DROP POLICY IF EXISTS "morphology_types_insert" ON morphology_types;
DROP POLICY IF EXISTS "morphology_types_update" ON morphology_types;
CREATE POLICY "morphology_types_select" ON morphology_types FOR SELECT USING (true);
CREATE POLICY "morphology_types_insert" ON morphology_types FOR INSERT WITH CHECK (true);
CREATE POLICY "morphology_types_update" ON morphology_types FOR UPDATE USING (true);

-- dispose_reasons
ALTER TABLE dispose_reasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dispose_reasons_select" ON dispose_reasons;
DROP POLICY IF EXISTS "dispose_reasons_insert" ON dispose_reasons;
DROP POLICY IF EXISTS "dispose_reasons_update" ON dispose_reasons;
CREATE POLICY "dispose_reasons_select" ON dispose_reasons FOR SELECT USING (true);
CREATE POLICY "dispose_reasons_insert" ON dispose_reasons FOR INSERT WITH CHECK (true);
CREATE POLICY "dispose_reasons_update" ON dispose_reasons FOR UPDATE USING (true);

-- nomenclatures
ALTER TABLE nomenclatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nomenclatures_select" ON nomenclatures;
DROP POLICY IF EXISTS "nomenclatures_insert" ON nomenclatures;
DROP POLICY IF EXISTS "nomenclatures_update" ON nomenclatures;
CREATE POLICY "nomenclatures_select" ON nomenclatures FOR SELECT USING (true);
CREATE POLICY "nomenclatures_insert" ON nomenclatures FOR INSERT WITH CHECK (true);
CREATE POLICY "nomenclatures_update" ON nomenclatures FOR UPDATE USING (true);

-- equipment_monitoring_params (already enabled in previous migration, refresh)
DROP POLICY IF EXISTS "monitoring_params_select" ON equipment_monitoring_params;
DROP POLICY IF EXISTS "monitoring_params_insert" ON equipment_monitoring_params;
DROP POLICY IF EXISTS "monitoring_params_update" ON equipment_monitoring_params;
DROP POLICY IF EXISTS "monitoring_params_delete" ON equipment_monitoring_params;
CREATE POLICY "monitoring_params_select" ON equipment_monitoring_params FOR SELECT USING (true);
CREATE POLICY "monitoring_params_insert" ON equipment_monitoring_params FOR INSERT WITH CHECK (true);
CREATE POLICY "monitoring_params_update" ON equipment_monitoring_params FOR UPDATE USING (true);
CREATE POLICY "monitoring_params_delete" ON equipment_monitoring_params FOR DELETE USING (true);
