ы в супабейс-- LabPro Database Migration
-- Date: 2026-02-01
-- Purpose: Align schema with frontend code
-- Safe migration with idempotent checks

-- 1. Check and rename containers.status -> container_status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'containers' AND column_name = 'status') THEN
    ALTER TABLE containers RENAME COLUMN status TO container_status;
  END IF;
END $$;

-- 2. Check and rename containers.type_id -> container_type_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'containers' AND column_name = 'type_id') THEN
    ALTER TABLE containers RENAME COLUMN type_id TO container_type_id;
  END IF;
END $$;

-- 3. Add passage_count to containers if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'containers' AND column_name = 'passage_count') THEN
    ALTER TABLE containers ADD COLUMN passage_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 4. Add freezing_date to cryo_vials if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cryo_vials' AND column_name = 'freezing_date') THEN
    ALTER TABLE cryo_vials ADD COLUMN freezing_date DATE;
  END IF;
END $$;

-- 5. Add lot_id to cryo_vials if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cryo_vials' AND column_name = 'lot_id') THEN
    ALTER TABLE cryo_vials ADD COLUMN lot_id UUID REFERENCES lots(id);
  END IF;
END $$;

-- 6. Add current_volume_ml to ready_media if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ready_media' AND column_name = 'current_volume_ml') THEN
    ALTER TABLE ready_media ADD COLUMN current_volume_ml DECIMAL(10,2);
  END IF;
END $$;

-- 7. Add current_temperature to equipment if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'current_temperature') THEN
    ALTER TABLE equipment ADD COLUMN current_temperature DECIMAL(5,1);
  END IF;
END $$;

-- 8. Create equipment_logs table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_logs') THEN
    CREATE TABLE equipment_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
      temperature DECIMAL(5,1),
      notes TEXT,
      logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- 9. Add missing fields to operation_containers
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operation_containers' AND column_name = 'notes') THEN ALTER TABLE operation_containers ADD COLUMN notes TEXT; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operation_containers' AND column_name = 'medium_id') THEN ALTER TABLE operation_containers ADD COLUMN medium_id UUID REFERENCES ready_media(id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operation_containers' AND column_name = 'volume_ml') THEN ALTER TABLE operation_containers ADD COLUMN volume_ml DECIMAL(10,2); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operation_containers' AND column_name = 'split_ratio') THEN ALTER TABLE operation_containers ADD COLUMN split_ratio VARCHAR(20); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operation_containers' AND column_name = 'new_confluent_percent') THEN ALTER TABLE operation_containers ADD COLUMN new_confluent_percent INTEGER; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operation_containers' AND column_name = 'seeded_cells') THEN ALTER TABLE operation_containers ADD COLUMN seeded_cells DECIMAL(15,2); END IF; END $$;

-- 10. Update check_lot_closure function
DROP TRIGGER IF EXISTS trigger_check_lot_closure ON containers;
DROP FUNCTION IF EXISTS check_lot_closure();

CREATE OR REPLACE FUNCTION check_lot_closure()
RETURNS TRIGGER AS $$
DECLARE
  v_active_containers INTEGER;
  v_lot_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'containers' AND NEW.container_status = 'DISPOSE' THEN
    v_lot_id := NEW.lot_id;
    SELECT COUNT(*) INTO v_active_containers
    FROM containers
    WHERE lot_id = v_lot_id AND container_status != 'DISPOSE';
    IF v_active_containers = 0 THEN
      UPDATE lots SET status = 'CLOSED', end_date = NOW()::date WHERE id = v_lot_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_check_lot_closure
  AFTER UPDATE ON containers
  FOR EACH ROW
  WHEN (NEW.container_status = 'DISPOSE')
  EXECUTE FUNCTION check_lot_closure();

-- 11. Create increment_passage_count function
CREATE OR REPLACE FUNCTION increment_passage_count(row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE containers SET passage_count = COALESCE(passage_count, 0) + 1 WHERE id = row_id;
END;
$$ language 'plpgsql';

-- 12. Create indexes
CREATE INDEX IF NOT EXISTS idx_containers_container_status ON containers(container_status);
CREATE INDEX IF NOT EXISTS idx_cryo_vials_lot ON cryo_vials(lot_id);
CREATE INDEX IF NOT EXISTS idx_ready_media_current_volume ON ready_media(current_volume_ml) WHERE current_volume_ml IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_current_temp ON equipment(current_temperature) WHERE current_temperature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_logs_equipment ON equipment_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_logged_at ON equipment_logs(logged_at);

-- 13. Add cells_count to cryo_vials if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cryo_vials' AND column_name = 'cells_count') THEN
    ALTER TABLE cryo_vials ADD COLUMN cells_count BIGINT;
  END IF;
END $$;

-- 14. Add status to cryo_vials if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cryo_vials' AND column_name = 'status') THEN
    ALTER TABLE cryo_vials ADD COLUMN status VARCHAR(20) DEFAULT 'IN_STOCK';
  END IF;
END $$;

-- 15. Add cryo_vials_count and total_cells to banks if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banks' AND column_name = 'cryo_vials_count') THEN
    ALTER TABLE banks ADD COLUMN cryo_vials_count INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banks' AND column_name = 'total_cells') THEN
    ALTER TABLE banks ADD COLUMN total_cells BIGINT;
  END IF;
END $$;

-- 16. Add cells_per_vial to banks if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banks' AND column_name = 'cells_per_vial') THEN
    ALTER TABLE banks ADD COLUMN cells_per_vial BIGINT;
  END IF;
END $$;

-- 17. Add missing fields to operations table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operations' AND column_name = 'operator_id') THEN
    ALTER TABLE operations ADD COLUMN operator_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operations' AND column_name = 'completed_at') THEN
    ALTER TABLE operations ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 18. Create update_cryo_vial_status function
CREATE OR REPLACE FUNCTION update_cryo_vial_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'THAWED' THEN
    UPDATE cryo_vials SET status = 'THAWED', thaw_date = NOW()::date WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 19. Enable RLS for equipment_logs
ALTER TABLE equipment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated access" ON equipment_logs FOR ALL USING (auth.role() IN ('authenticated'));

-- 20. Enable RLS for cryo_vials
ALTER TABLE cryo_vials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated access" ON cryo_vials FOR ALL USING (auth.role() IN ('authenticated'));

-- 21. Enable RLS for banks
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated access" ON banks FOR ALL USING (auth.role() IN ('authenticated'));
