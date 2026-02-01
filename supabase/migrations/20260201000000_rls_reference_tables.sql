-- Add RLS policies for reference tables (справочники)
-- Run this migration after the main schema

-- Enable RLS on reference tables
ALTER TABLE culture_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE morphology_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispose_reasons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-run)
DROP POLICY IF EXISTS "Authenticated read" ON culture_types;
DROP POLICY IF EXISTS "Authenticated read" ON container_types;
DROP POLICY IF EXISTS "Authenticated read" ON morphology_types;
DROP POLICY IF EXISTS "Authenticated read" ON dispose_reasons;

-- Create RLS policies for authenticated users to read reference tables
CREATE POLICY "Authenticated read" ON culture_types
  FOR SELECT USING (auth.role() IN ('authenticated'));

CREATE POLICY "Authenticated read" ON container_types
  FOR SELECT USING (auth.role() IN ('authenticated'));

CREATE POLICY "Authenticated read" ON morphology_types
  FOR SELECT USING (auth.role() IN ('authenticated'));

CREATE POLICY "Authenticated read" ON dispose_reasons
  FOR SELECT USING (auth.role() IN ('authenticated'));

-- Enable RLS and add policies for entity tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomenclatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Entity tables policies (read all, insert/update/delete based on role)
CREATE POLICY "Authenticated read" ON users FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Admin full access" ON users FOR ALL USING (auth.role() IN ('authenticated')) WITH CHECK (auth.role() IN ('authenticated'));

CREATE POLICY "Authenticated read" ON donors FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Operator+ read" ON donors FOR SELECT USING (auth.role() IN ('authenticated'));

CREATE POLICY "Authenticated read" ON nomenclatures FOR SELECT USING (auth.role() IN ('authenticated'));

CREATE POLICY "Authenticated read" ON equipment FOR SELECT USING (auth.role() IN ('authenticated'));

CREATE POLICY "Authenticated read" ON positions FOR SELECT USING (auth.role() IN ('authenticated'));

-- Sample & Storage tables
ALTER TABLE tissues ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cryo_vials ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read" ON tissues FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON cultures FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON lots FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON banks FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON cryo_vials FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON containers FOR SELECT USING (auth.role() IN ('authenticated'));

-- Operations tables
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read" ON operations FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON operation_containers FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON operation_media FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON operation_metrics FOR SELECT USING (auth.role() IN ('authenticated'));

-- Inventory tables
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ready_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read" ON batches FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON batch_reservations FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON inventory_movements FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON ready_media FOR SELECT USING (auth.role() IN ('authenticated'));

-- QC & Tasks tables
ALTER TABLE qc_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read" ON qc_tests FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON tasks FOR SELECT USING (auth.role() IN ('authenticated'));

-- Orders tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read" ON orders FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON order_items FOR SELECT USING (auth.role() IN ('authenticated'));

-- Audit & Logs tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read" ON audit_logs FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Authenticated read" ON equipment_logs FOR SELECT USING (auth.role() IN ('authenticated'));
