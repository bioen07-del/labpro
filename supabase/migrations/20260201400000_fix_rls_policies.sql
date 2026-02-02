-- Migration: Fix RLS policies for all tables
-- Date: 01.02.2026
-- Issue: 403 Forbidden errors on donors, donations, and other tables
-- Fix: Add proper SELECT, INSERT, UPDATE policies for authenticated users

-- ============================================
-- DONORS
-- ============================================
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read" ON donors;
DROP POLICY IF EXISTS "Operator+ read" ON donors;
DROP POLICY IF EXISTS "Authenticated insert" ON donors;
DROP POLICY IF EXISTS "Authenticated update" ON donors;
DROP POLICY IF EXISTS "donors_select" ON donors;
DROP POLICY IF EXISTS "donors_insert" ON donors;
DROP POLICY IF EXISTS "donors_update" ON donors;

CREATE POLICY "donors_select" ON donors FOR SELECT TO authenticated USING (true);
CREATE POLICY "donors_insert" ON donors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "donors_update" ON donors FOR UPDATE TO authenticated USING (true);

-- ============================================
-- DONATIONS
-- ============================================
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read" ON donations;
DROP POLICY IF EXISTS "Authenticated insert" ON donations;
DROP POLICY IF EXISTS "Authenticated update" ON donations;
DROP POLICY IF EXISTS "donations_read" ON donations;
DROP POLICY IF EXISTS "donations_insert" ON donations;
DROP POLICY IF EXISTS "donations_update" ON donations;
DROP POLICY IF EXISTS "donations_select" ON donations;

CREATE POLICY "donations_select" ON donations FOR SELECT TO authenticated USING (true);
CREATE POLICY "donations_insert" ON donations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "donations_update" ON donations FOR UPDATE TO authenticated USING (true);

-- ============================================
-- TISSUE_TYPES
-- ============================================
ALTER TABLE tissue_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read" ON tissue_types;
DROP POLICY IF EXISTS "tissue_types_read" ON tissue_types;
DROP POLICY IF EXISTS "tissue_types_select" ON tissue_types;

CREATE POLICY "tissue_types_select" ON tissue_types FOR SELECT TO authenticated USING (true);

-- ============================================
-- CULTURES (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON cultures;
DROP POLICY IF EXISTS "Authenticated read cultures" ON cultures;
DROP POLICY IF EXISTS "cultures_select" ON cultures;
DROP POLICY IF EXISTS "cultures_insert" ON cultures;
DROP POLICY IF EXISTS "cultures_update" ON cultures;

CREATE POLICY "cultures_select" ON cultures FOR SELECT TO authenticated USING (true);
CREATE POLICY "cultures_insert" ON cultures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cultures_update" ON cultures FOR UPDATE TO authenticated USING (true);

-- ============================================
-- LOTS (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON lots;
DROP POLICY IF EXISTS "lots_select" ON lots;
DROP POLICY IF EXISTS "lots_insert" ON lots;
DROP POLICY IF EXISTS "lots_update" ON lots;

CREATE POLICY "lots_select" ON lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "lots_insert" ON lots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lots_update" ON lots FOR UPDATE TO authenticated USING (true);

-- ============================================
-- BANKS (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON banks;
DROP POLICY IF EXISTS "banks_select" ON banks;
DROP POLICY IF EXISTS "banks_insert" ON banks;
DROP POLICY IF EXISTS "banks_update" ON banks;

CREATE POLICY "banks_select" ON banks FOR SELECT TO authenticated USING (true);
CREATE POLICY "banks_insert" ON banks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "banks_update" ON banks FOR UPDATE TO authenticated USING (true);

-- ============================================
-- CONTAINERS (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON containers;
DROP POLICY IF EXISTS "containers_select" ON containers;
DROP POLICY IF EXISTS "containers_insert" ON containers;
DROP POLICY IF EXISTS "containers_update" ON containers;

CREATE POLICY "containers_select" ON containers FOR SELECT TO authenticated USING (true);
CREATE POLICY "containers_insert" ON containers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "containers_update" ON containers FOR UPDATE TO authenticated USING (true);

-- ============================================
-- CRYO_VIALS (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON cryo_vials;
DROP POLICY IF EXISTS "cryo_vials_select" ON cryo_vials;
DROP POLICY IF EXISTS "cryo_vials_insert" ON cryo_vials;
DROP POLICY IF EXISTS "cryo_vials_update" ON cryo_vials;

CREATE POLICY "cryo_vials_select" ON cryo_vials FOR SELECT TO authenticated USING (true);
CREATE POLICY "cryo_vials_insert" ON cryo_vials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cryo_vials_update" ON cryo_vials FOR UPDATE TO authenticated USING (true);

-- ============================================
-- OPERATIONS (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON operations;
DROP POLICY IF EXISTS "operations_select" ON operations;
DROP POLICY IF EXISTS "operations_insert" ON operations;
DROP POLICY IF EXISTS "operations_update" ON operations;

CREATE POLICY "operations_select" ON operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "operations_insert" ON operations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "operations_update" ON operations FOR UPDATE TO authenticated USING (true);

-- ============================================
-- OPERATION_CONTAINERS (fix: add INSERT)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON operation_containers;
DROP POLICY IF EXISTS "operation_containers_select" ON operation_containers;
DROP POLICY IF EXISTS "operation_containers_insert" ON operation_containers;

CREATE POLICY "operation_containers_select" ON operation_containers FOR SELECT TO authenticated USING (true);
CREATE POLICY "operation_containers_insert" ON operation_containers FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- OPERATION_MEDIA (fix: add INSERT)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON operation_media;
DROP POLICY IF EXISTS "operation_media_select" ON operation_media;
DROP POLICY IF EXISTS "operation_media_insert" ON operation_media;

CREATE POLICY "operation_media_select" ON operation_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "operation_media_insert" ON operation_media FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- OPERATION_METRICS (fix: add INSERT)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON operation_metrics;
DROP POLICY IF EXISTS "operation_metrics_select" ON operation_metrics;
DROP POLICY IF EXISTS "operation_metrics_insert" ON operation_metrics;

CREATE POLICY "operation_metrics_select" ON operation_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "operation_metrics_insert" ON operation_metrics FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- BATCHES (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON batches;
DROP POLICY IF EXISTS "batches_select" ON batches;
DROP POLICY IF EXISTS "batches_insert" ON batches;
DROP POLICY IF EXISTS "batches_update" ON batches;

CREATE POLICY "batches_select" ON batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "batches_insert" ON batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "batches_update" ON batches FOR UPDATE TO authenticated USING (true);

-- ============================================
-- BATCH_RESERVATIONS (fix: add INSERT)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON batch_reservations;
DROP POLICY IF EXISTS "batch_reservations_select" ON batch_reservations;
DROP POLICY IF EXISTS "batch_reservations_insert" ON batch_reservations;

CREATE POLICY "batch_reservations_select" ON batch_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "batch_reservations_insert" ON batch_reservations FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- READY_MEDIA (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON ready_media;
DROP POLICY IF EXISTS "ready_media_select" ON ready_media;
DROP POLICY IF EXISTS "ready_media_insert" ON ready_media;
DROP POLICY IF EXISTS "ready_media_update" ON ready_media;

CREATE POLICY "ready_media_select" ON ready_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "ready_media_insert" ON ready_media FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ready_media_update" ON ready_media FOR UPDATE TO authenticated USING (true);

-- ============================================
-- QC_TESTS (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON qc_tests;
DROP POLICY IF EXISTS "qc_tests_select" ON qc_tests;
DROP POLICY IF EXISTS "qc_tests_insert" ON qc_tests;
DROP POLICY IF EXISTS "qc_tests_update" ON qc_tests;

CREATE POLICY "qc_tests_select" ON qc_tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "qc_tests_insert" ON qc_tests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "qc_tests_update" ON qc_tests FOR UPDATE TO authenticated USING (true);

-- ============================================
-- TASKS (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON tasks;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;

CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (true);

-- ============================================
-- ORDERS (fix: add INSERT, UPDATE)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON orders;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;

CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated USING (true);

-- ============================================
-- ORDER_ITEMS (fix: add INSERT)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON order_items;
DROP POLICY IF EXISTS "order_items_select" ON order_items;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;

CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- AUDIT_LOGS (fix: add INSERT)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- REFERENCE TABLES (read-only for authenticated)
-- ============================================
DROP POLICY IF EXISTS "Authenticated read" ON culture_types;
DROP POLICY IF EXISTS "Authenticated read" ON container_types;
DROP POLICY IF EXISTS "Authenticated read" ON morphology_types;
DROP POLICY IF EXISTS "Authenticated read" ON dispose_reasons;
DROP POLICY IF EXISTS "Authenticated read" ON nomenclatures;
DROP POLICY IF EXISTS "Authenticated read" ON equipment;
DROP POLICY IF EXISTS "Authenticated read" ON positions;
DROP POLICY IF EXISTS "Authenticated read" ON users;
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Authenticated read" ON equipment_logs;
DROP POLICY IF EXISTS "Authenticated read" ON inventory_movements;

CREATE POLICY "culture_types_select" ON culture_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "container_types_select" ON container_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "morphology_types_select" ON morphology_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "dispose_reasons_select" ON dispose_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "nomenclatures_select" ON nomenclatures FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_select" ON equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "positions_select" ON positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_all" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "equipment_logs_select" ON equipment_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "equipment_logs_insert" ON equipment_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inventory_movements_select" ON inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_movements_insert" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true);
