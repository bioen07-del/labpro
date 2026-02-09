-- Migration: Add INSERT/UPDATE/DELETE policies for reference tables
-- Date: 09.02.2026
-- Purpose: Allow authenticated users to manage reference data (previously read-only)

-- ============================================
-- CULTURE TYPES
-- ============================================
DROP POLICY IF EXISTS "culture_types_insert" ON culture_types;
DROP POLICY IF EXISTS "culture_types_update" ON culture_types;
DROP POLICY IF EXISTS "culture_types_delete" ON culture_types;
CREATE POLICY "culture_types_insert" ON culture_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "culture_types_update" ON culture_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "culture_types_delete" ON culture_types FOR DELETE TO authenticated USING (true);

-- ============================================
-- CONTAINER TYPES
-- ============================================
DROP POLICY IF EXISTS "container_types_insert" ON container_types;
DROP POLICY IF EXISTS "container_types_update" ON container_types;
DROP POLICY IF EXISTS "container_types_delete" ON container_types;
CREATE POLICY "container_types_insert" ON container_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "container_types_update" ON container_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "container_types_delete" ON container_types FOR DELETE TO authenticated USING (true);

-- ============================================
-- TISSUE TYPES
-- ============================================
DROP POLICY IF EXISTS "tissue_types_insert" ON tissue_types;
DROP POLICY IF EXISTS "tissue_types_update" ON tissue_types;
DROP POLICY IF EXISTS "tissue_types_delete" ON tissue_types;
CREATE POLICY "tissue_types_insert" ON tissue_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tissue_types_update" ON tissue_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tissue_types_delete" ON tissue_types FOR DELETE TO authenticated USING (true);

-- ============================================
-- MORPHOLOGY TYPES
-- ============================================
DROP POLICY IF EXISTS "morphology_types_insert" ON morphology_types;
DROP POLICY IF EXISTS "morphology_types_update" ON morphology_types;
DROP POLICY IF EXISTS "morphology_types_delete" ON morphology_types;
CREATE POLICY "morphology_types_insert" ON morphology_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "morphology_types_update" ON morphology_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "morphology_types_delete" ON morphology_types FOR DELETE TO authenticated USING (true);

-- ============================================
-- DISPOSE REASONS
-- ============================================
DROP POLICY IF EXISTS "dispose_reasons_insert" ON dispose_reasons;
DROP POLICY IF EXISTS "dispose_reasons_update" ON dispose_reasons;
DROP POLICY IF EXISTS "dispose_reasons_delete" ON dispose_reasons;
CREATE POLICY "dispose_reasons_insert" ON dispose_reasons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dispose_reasons_update" ON dispose_reasons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dispose_reasons_delete" ON dispose_reasons FOR DELETE TO authenticated USING (true);

-- ============================================
-- NOMENCLATURES
-- ============================================
DROP POLICY IF EXISTS "nomenclatures_insert" ON nomenclatures;
DROP POLICY IF EXISTS "nomenclatures_update" ON nomenclatures;
DROP POLICY IF EXISTS "nomenclatures_delete" ON nomenclatures;
CREATE POLICY "nomenclatures_insert" ON nomenclatures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nomenclatures_update" ON nomenclatures FOR UPDATE TO authenticated USING (true);
CREATE POLICY "nomenclatures_delete" ON nomenclatures FOR DELETE TO authenticated USING (true);

-- ============================================
-- EQUIPMENT
-- ============================================
DROP POLICY IF EXISTS "equipment_insert" ON equipment;
DROP POLICY IF EXISTS "equipment_update" ON equipment;
DROP POLICY IF EXISTS "equipment_delete" ON equipment;
CREATE POLICY "equipment_insert" ON equipment FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "equipment_update" ON equipment FOR UPDATE TO authenticated USING (true);
CREATE POLICY "equipment_delete" ON equipment FOR DELETE TO authenticated USING (true);

-- ============================================
-- POSITIONS
-- ============================================
DROP POLICY IF EXISTS "positions_insert" ON positions;
DROP POLICY IF EXISTS "positions_update" ON positions;
DROP POLICY IF EXISTS "positions_delete" ON positions;
CREATE POLICY "positions_insert" ON positions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "positions_update" ON positions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "positions_delete" ON positions FOR DELETE TO authenticated USING (true);

-- ============================================
-- CULTURE TYPE ↔ TISSUE TYPES (link table)
-- ============================================
ALTER TABLE culture_type_tissue_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "culture_type_tissue_types_select" ON culture_type_tissue_types;
DROP POLICY IF EXISTS "culture_type_tissue_types_insert" ON culture_type_tissue_types;
DROP POLICY IF EXISTS "culture_type_tissue_types_update" ON culture_type_tissue_types;
DROP POLICY IF EXISTS "culture_type_tissue_types_delete" ON culture_type_tissue_types;
CREATE POLICY "culture_type_tissue_types_select" ON culture_type_tissue_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "culture_type_tissue_types_insert" ON culture_type_tissue_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "culture_type_tissue_types_update" ON culture_type_tissue_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "culture_type_tissue_types_delete" ON culture_type_tissue_types FOR DELETE TO authenticated USING (true);
