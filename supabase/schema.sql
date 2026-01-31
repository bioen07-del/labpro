-- LabPro Database Schema
-- Generated: 30.01.2026
-- Version: 1.0

-- ============================================
-- ENUMS
-- ============================================

-- User roles
CREATE TYPE user_role AS ENUM (
  'OPERATOR',
  'LABORANT',
  'MANAGER',
  'QC_ADMIN',
  'ADMIN'
);

-- Culture status
CREATE TYPE culture_status AS ENUM (
  'ACTIVE',
  'ARCHIVED'
);

-- Lot status
CREATE TYPE lot_status AS ENUM (
  'ACTIVE',
  'DISPOSE',
  'CLOSED'
);

-- Container status
CREATE TYPE container_status AS ENUM (
  'ACTIVE',
  'IN_BANK',
  'DISPOSE'
);

-- Bank type
CREATE TYPE bank_type AS ENUM (
  'MCB',
  'WCB',
  'RWB'
);

-- Bank status
CREATE TYPE bank_status AS ENUM (
  'QUARANTINE',
  'APPROVED',
  'RESERVED',
  'ISSUED',
  'DISPOSE'
);

-- Cryo vial status
CREATE TYPE cryo_vial_status AS ENUM (
  'IN_STOCK',
  'RESERVED',
  'ISSUED'
);

-- Nomenclature category
CREATE TYPE nomenclature_category AS ENUM (
  'MEDIUM',
  'CONSUMABLE',
  'REAGENT',
  'EQUIP'
);

-- Batch status
CREATE TYPE batch_status AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'DISPOSE'
);

-- Ready medium status
CREATE TYPE ready_medium_status AS ENUM (
  'QUARANTINE',
  'ACTIVE',
  'EXPIRED',
  'DISPOSE'
);

-- Operation type
CREATE TYPE operation_type AS ENUM (
  'FEED',
  'PASSAGE',
  'FREEZE',
  'THAW',
  'OBSERVE',
  'DISPOSE',
  'QCREG'
);

-- Operation status
CREATE TYPE operation_status AS ENUM (
  'IN_PROGRESS',
  'COMPLETED'
);

-- Container role in operation
CREATE TYPE container_role AS ENUM (
  'SOURCE',
  'TARGET'
);

-- QC test type
CREATE TYPE qc_test_type AS ENUM (
  'MYCOPLASMA',
  'STERILITY',
  'LAL',
  'VIA'
);

-- QC test status
CREATE TYPE qc_test_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

-- QC result
CREATE TYPE qc_result AS ENUM (
  'PASSED',
  'FAILED'
);

-- Order type
CREATE TYPE order_type AS ENUM (
  'BANK_CREATION',
  'ISSUANCE'
);

-- Order status
CREATE TYPE order_status AS ENUM (
  'NEW',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

-- Order item status
CREATE TYPE order_item_status AS ENUM (
  'PENDING',
  'RESERVED',
  'ISSUED'
);

-- Equipment type
CREATE TYPE equipment_type AS ENUM (
  'INCUBATOR',
  'FRIDGE',
  'FREEZER',
  'CABINET',
  'RACK'
);

-- Equipment status
CREATE TYPE equipment_status AS ENUM (
  'ACTIVE',
  'MAINTENANCE',
  'BROKEN'
);

-- Task type
CREATE TYPE task_type AS ENUM (
  'INSPECT',
  'FEED',
  'QC_DUE',
  'FEFO',
  'ORDER_DUE',
  'MAINTENANCE'
);

-- Task target type
CREATE TYPE task_target_type AS ENUM (
  'CULTURE',
  'LOT',
  'CONTAINER',
  'BANK',
  'EQUIPMENT'
);

-- Task status
CREATE TYPE task_status AS ENUM (
  'PENDING',
  'COMPLETED',
  'CANCELLED'
);

-- Notification type
CREATE TYPE notification_type AS ENUM (
  'QC_READY',
  'ORDER_DEADLINE',
  'CRITICAL_FEFO',
  'EQUIPMENT_ALERT',
  'CONTAMINATION'
);

-- Audit action
CREATE TYPE audit_action AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGE'
);

-- Inventory movement type
CREATE TYPE inventory_movement_type AS ENUM (
  'RECEIVE',
  'CONSUME',
  'CORRECT_PLUS',
  'CORRECT_MINUS',
  'DISPOSE'
);

-- Sterilization method
CREATE TYPE sterilization_method AS ENUM (
  'FILTRATION',
  'AUTOCLAVE'
);

-- ============================================
-- TABLES: Reference Data (Справочники)
-- ============================================

-- Culture Types
CREATE TABLE culture_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  growth_rate DECIMAL(10, 4),
  optimal_confluent INTEGER,
  passage_interval_days INTEGER,
  freezing_protocol TEXT,
  thaw_protocol TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Container Types
CREATE TABLE container_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  surface_area_cm2 DECIMAL(10, 2),
  volume_ml DECIMAL(10, 2),
  is_cryo BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medium Types
CREATE TABLE medium_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  default_volume_ml DECIMAL(10, 2),
  storage_temp INTEGER,
  shelf_life_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operation Types
CREATE TABLE operation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  requires_containers BOOLEAN DEFAULT false,
  requires_mediums BOOLEAN DEFAULT false,
  requires_metrics BOOLEAN DEFAULT false,
  requires_position BOOLEAN DEFAULT false,
  is_disposable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Morphology Types
CREATE TABLE morphology_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QC Test Types
CREATE TABLE qc_test_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  duration_days INTEGER,
  target_types JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispose Reasons
CREATE TABLE dispose_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLES: Core Entities (Основные сущности)
-- ============================================

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(200) NOT NULL UNIQUE,
  full_name VARCHAR(200),
  role user_role NOT NULL DEFAULT 'OPERATOR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donors
CREATE TABLE donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  age INTEGER,
  gender VARCHAR(10),
  tissue_type VARCHAR(100),
  collection_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tissues
CREATE TABLE tissues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES donors(id),
  type VARCHAR(100) NOT NULL,
  weight_kg DECIMAL(10, 3),
  passage_yield DECIMAL(10, 4),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cultures
CREATE TABLE cultures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type_id UUID REFERENCES culture_types(id),
  donor_id UUID REFERENCES donors(id),
  tissue_id UUID REFERENCES tissues(id),
  status culture_status NOT NULL DEFAULT 'ACTIVE',
  description TEXT,
  coefficient DECIMAL(10, 4),
  coefficient_updated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lots
CREATE TABLE lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  culture_id UUID REFERENCES cultures(id) ON DELETE CASCADE,
  passage_number INTEGER NOT NULL DEFAULT 1,
  status lot_status NOT NULL DEFAULT 'ACTIVE',
  parent_lot_id UUID REFERENCES lots(id),
  source_container_id UUID,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Containers
CREATE TABLE containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  type_id UUID REFERENCES container_types(id),
  status container_status NOT NULL DEFAULT 'ACTIVE',
  parent_container_id UUID REFERENCES containers(id),
  position_id UUID,
  confluent_percent INTEGER CHECK (confluent_percent >= 0 AND confluent_percent <= 100),
  morphology VARCHAR(50),
  contaminated BOOLEAN DEFAULT false,
  placed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banks
CREATE TABLE banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  culture_id UUID REFERENCES cultures(id),
  lot_id UUID REFERENCES lots(id),
  bank_type bank_type NOT NULL,
  status bank_status NOT NULL DEFAULT 'QUARANTINE',
  cryo_vials_count INTEGER NOT NULL DEFAULT 0,
  cells_per_vial DECIMAL(15, 2),
  total_cells DECIMAL(15, 2),
  position_id UUID,
  qc_passed BOOLEAN DEFAULT false,
  freezing_date DATE,
  expiration_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cryo Vials
CREATE TABLE cryo_vials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  position_id UUID,
  status cryo_vial_status NOT NULL DEFAULT 'IN_STOCK',
  cells_count DECIMAL(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLES: Inventory (Инвентарь)
-- ============================================

-- Nomenclatures
CREATE TABLE nomenclatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  category nomenclature_category NOT NULL,
  unit VARCHAR(20) NOT NULL,
  storage_temp INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batches
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomenclature_id UUID REFERENCES nomenclatures(id) ON DELETE CASCADE,
  batch_number VARCHAR(50) NOT NULL,
  expiration_date DATE NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL,
  status batch_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nomenclature_id, batch_number)
);

-- Batch Reservations (для FEFO и операций)
CREATE TABLE batch_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  operation_id UUID,
  quantity DECIMAL(15, 3) NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE
);

-- Inventory Movements
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  operation_id UUID,
  movement_type inventory_movement_type NOT NULL,
  quantity_change DECIMAL(15, 3) NOT NULL,
  quantity_after DECIMAL(15, 3) NOT NULL,
  notes TEXT,
  moved_by UUID REFERENCES users(id),
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ready Media (Готовые среды)
CREATE TABLE ready_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  volume_ml DECIMAL(10, 2) NOT NULL,
  status ready_medium_status NOT NULL DEFAULT 'QUARANTINE',
  sterilization_method sterilization_method NOT NULL,
  expiration_date DATE NOT NULL,
  storage_position_id UUID,
  composition JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- TABLES: Operations (Операции)
-- ============================================

-- Operations
CREATE TABLE operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID REFERENCES lots(id),
  operation_type operation_type NOT NULL,
  status operation_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operation Containers
CREATE TABLE operation_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  container_id UUID REFERENCES containers(id),
  role container_role NOT NULL,
  confluent_percent INTEGER CHECK (confluent_percent >= 0 AND confluent_percent <= 100),
  morphology VARCHAR(50),
  contaminated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operation Media (Среды в операциях)
CREATE TABLE operation_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id),
  ready_medium_id UUID REFERENCES ready_media(id),
  quantity_ml DECIMAL(10, 2) NOT NULL,
  purpose VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operation Metrics
CREATE TABLE operation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
  concentration DECIMAL(15, 2),
  viability_percent DECIMAL(5, 2) CHECK (viability_percent >= 0 AND viability_percent <= 100),
  total_cells DECIMAL(15, 2),
  volume_ml DECIMAL(10, 2),
  passage_yield DECIMAL(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLES: QC (Контроль качества)
-- ============================================

-- QC Tests
CREATE TABLE qc_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  test_type qc_test_type NOT NULL,
  status qc_test_status NOT NULL DEFAULT 'PENDING',
  result qc_result,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLES: Orders (Заявки)
-- ============================================

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(200) NOT NULL,
  customer_email VARCHAR(200),
  customer_phone VARCHAR(50),
  order_type order_type NOT NULL,
  culture_type_id UUID REFERENCES culture_types(id),
  cells_quantity_mln DECIMAL(15, 2),
  deadline DATE,
  status order_status NOT NULL DEFAULT 'NEW',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES banks(id),
  cryo_vial_id UUID REFERENCES cryo_vials(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  status order_item_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLES: Equipment (Оборудование)
-- ============================================

-- Equipment
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  type equipment_type NOT NULL,
  location VARCHAR(200),
  temperature INTEGER,
  status equipment_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Positions
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  qr_code VARCHAR(200),
  path VARCHAR(200) NOT NULL,
  capacity INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLES: Tasks & Notifications (Задачи и уведомления)
-- ============================================

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type task_type NOT NULL,
  target_type task_target_type NOT NULL,
  target_id UUID NOT NULL,
  status task_status NOT NULL DEFAULT 'PENDING',
  due_date DATE,
  last_done_date DATE,
  interval_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  link_type VARCHAR(50),
  link_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLES: Audit (Аудит)
-- ============================================

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action audit_action NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_cultures_type ON cultures(type_id);
CREATE INDEX idx_cultures_status ON cultures(status);
CREATE INDEX idx_lots_culture ON lots(culture_id);
CREATE INDEX idx_lots_status ON lots(status);
CREATE INDEX idx_containers_lot ON containers(lot_id);
CREATE INDEX idx_containers_status ON containers(status);
CREATE INDEX idx_containers_position ON containers(position_id);
CREATE INDEX idx_banks_culture ON banks(culture_id);
CREATE INDEX idx_banks_status ON banks(status);
CREATE INDEX idx_batches_nomenclature ON batches(nomenclature_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_expiration ON batches(expiration_date);
CREATE INDEX idx_inventory_movements_batch ON inventory_movements(batch_id);
CREATE INDEX idx_operations_lot ON operations(lot_id);
CREATE INDEX idx_operations_type ON operations(operation_type);
CREATE INDEX idx_qc_tests_target ON qc_tests(target_type, target_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_deadline ON orders(deadline);
CREATE INDEX idx_equipment_type ON equipment(type);
CREATE INDEX idx_positions_equipment ON positions(equipment_id);
CREATE INDEX idx_tasks_target ON tasks(target_type, target_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_cultures_updated_at BEFORE UPDATE ON cultures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate container code
CREATE OR REPLACE FUNCTION generate_container_code(
  culture_id UUID,
  lot_num INTEGER,
  pass_num INTEGER,
  container_type_code VARCHAR(4),
  seq_num INTEGER
)
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN 'CT-' || 
    (SELECT RIGHT('0000' || (SELECT row_number FROM cultures WHERE id = culture_id)::text, 4)) ||
    '-L' || lot_num ||
    '-P' || pass_num ||
    '-' || container_type_code ||
    '-' || RIGHT('000' || seq_num::text, 3);
END;
$$ language 'plpgsql';

-- Function to check FEFO compliance
CREATE OR REPLACE FUNCTION check_fefo_compliance(p_nomenclature_id UUID, p_batch_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_oldest_batch_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_oldest_batch_id
  FROM batches
  WHERE nomenclature_id = p_nomenclature_id
    AND status = 'ACTIVE'
    AND expiration_date > NOW()
    AND quantity > 0
  ORDER BY expiration_date ASC
  LIMIT 1;
  
  IF v_oldest_batch_id = p_batch_id THEN
    v_result := jsonb_build_object('compliant', true, 'message', 'FEFO compliant');
  ELSE
    v_result := jsonb_build_object(
      'compliant', false, 
      'message', 'Not FEFO compliant - older batch available',
      'fefo_batch_id', v_oldest_batch_id
    );
  END IF;
  
  RETURN v_result;
END;
$$ language 'plpgsql';

-- Function to auto-close lot when all containers are disposed
CREATE OR REPLACE FUNCTION check_lot_closure()
RETURNS TRIGGER AS $$
DECLARE
  v_active_containers INTEGER;
  v_lot_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'containers' AND NEW.status = 'DISPOSE' THEN
    v_lot_id := NEW.lot_id;
    
    SELECT COUNT(*) INTO v_active_containers
    FROM containers
    WHERE lot_id = v_lot_id AND status != 'DISPOSE';
    
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
  WHEN (NEW.status = 'DISPOSE')
  EXECUTE FUNCTION check_lot_closure();

-- Function to update bank status based on QC result
CREATE OR REPLACE FUNCTION update_bank_from_qc()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.result = 'PASSED' AND OLD.result IS DISTINCT FROM NEW.result THEN
    UPDATE banks SET qc_passed = true, status = 'APPROVED' WHERE id = NEW.target_id AND NEW.target_type = 'BANK';
  ELSIF NEW.result = 'FAILED' AND OLD.result IS DISTINCT FROM NEW.result THEN
    UPDATE banks SET qc_passed = false, status = 'DISPOSE' WHERE id = NEW.target_id AND NEW.target_type = 'BANK';
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_bank_from_qc
  AFTER UPDATE ON qc_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_from_qc();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on role)
CREATE POLICY "Allow authenticated access" ON users
  FOR SELECT USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON cultures
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON lots
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON containers
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON banks
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON batches
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON operations
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON qc_tests
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON orders
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON equipment
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON positions
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON tasks
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON notifications
  FOR ALL USING (auth.role() IN ('authenticated'));

CREATE POLICY "Allow authenticated access" ON audit_logs
  FOR SELECT USING (auth.role() = 'admin');
