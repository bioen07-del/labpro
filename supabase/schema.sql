-- LabPro Database Schema
-- Generated: 01.02.2026
-- Compatible with Supabase

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- NOTE: All status fields use TEXT for flexibility.
-- ENUM types removed to avoid migration conflicts.
-- ============================================

-- ============================================
-- REFERENCE TABLES
-- ============================================

-- Culture Types
CREATE TABLE IF NOT EXISTS culture_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Container Types
CREATE TABLE IF NOT EXISTS container_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    capacity_ml NUMERIC,
    dimensions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Morphology Types
CREATE TABLE IF NOT EXISTS morphology_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Dispose Reasons
CREATE TABLE IF NOT EXISTS dispose_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ENTITY TABLES
-- ============================================

-- Tissue Types (reference)
CREATE TABLE IF NOT EXISTS tissue_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tissue_form TEXT DEFAULT 'SOLID',  -- SOLID / LIQUID
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Donors
CREATE TABLE IF NOT EXISTS donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    last_name TEXT,
    first_name TEXT,
    middle_name TEXT,
    birth_date DATE,
    sex TEXT,          -- M / F
    phone TEXT,
    email TEXT,
    blood_type TEXT,
    consent_date DATE,
    consent_number TEXT,
    status TEXT DEFAULT 'ACTIVE',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    donor_id UUID NOT NULL REFERENCES donors(id),
    collected_at DATE NOT NULL,
    tissue_type_id UUID REFERENCES tissue_types(id),
    tissue_form TEXT,           -- SOLID / LIQUID
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
    status TEXT DEFAULT 'QUARANTINE',  -- QUARANTINE / APPROVED / REJECTED
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT DEFAULT 'OPERATOR',
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Nomenclatures
CREATE TABLE IF NOT EXISTS nomenclatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    catalog_number TEXT,
    manufacturer TEXT,
    unit TEXT,
    storage_requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Equipment
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    model TEXT,
    serial_number TEXT,
    location TEXT,
    status TEXT DEFAULT 'ACTIVE',
    last_maintenance DATE,
    next_maintenance DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    current_temperature NUMERIC
);

-- Positions
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID REFERENCES equipment(id),
    path TEXT NOT NULL UNIQUE,
    qr_code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    capacity INTEGER,
    current_load INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SAMPLE & STORAGE TABLES
-- ============================================

-- Tissues
CREATE TABLE IF NOT EXISTS tissues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID REFERENCES donors(id),
    tissue_type TEXT NOT NULL,
    collection_date DATE,
    collection_location TEXT,
    preservation_method TEXT,
    quality_grade TEXT,
    storage_requirements TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Cultures
CREATE TABLE IF NOT EXISTS cultures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type_id UUID REFERENCES culture_types(id),
    donor_id UUID REFERENCES donors(id),
    donation_id UUID REFERENCES donations(id),
    tissue_id UUID REFERENCES tissues(id),
    passage_number INTEGER DEFAULT 0,
    source TEXT,
    received_date DATE,
    status TEXT DEFAULT 'ACTIVE',
    characteristics TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    coefficient NUMERIC,
    coefficient_updated_at TIMESTAMPTZ
);

-- Lots
CREATE TABLE IF NOT EXISTS lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_number TEXT NOT NULL UNIQUE,
    culture_id UUID REFERENCES cultures(id),
    parent_lot_id UUID REFERENCES lots(id),
    source_container_id UUID,  -- FK added after containers table
    passage_number INTEGER NOT NULL,
    seeded_at TIMESTAMPTZ,
    harvest_at TIMESTAMPTZ,
    initial_cells NUMERIC,
    final_cells NUMERIC,
    viability NUMERIC,
    status TEXT DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Banks
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    culture_id UUID REFERENCES cultures(id),
    lot_id UUID REFERENCES lots(id),
    bank_type TEXT NOT NULL,
    freezing_date DATE,
    freezing_method TEXT,
    cryo_vials_count INTEGER DEFAULT 0,
    cells_per_vial NUMERIC,
    total_cells NUMERIC,
    storage_location TEXT,
    shelf_position TEXT,
    qc_passed BOOLEAN DEFAULT false,
    qc_date DATE,
    status TEXT DEFAULT 'QUARANTINE',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cryo Vials
CREATE TABLE IF NOT EXISTS cryo_vials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID REFERENCES banks(id),
    vial_number TEXT,
    position_in_box TEXT,
    cells_count NUMERIC,
    freezing_date DATE,
    status TEXT DEFAULT 'AVAILABLE',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    lot_id UUID REFERENCES lots(id)
);

-- Containers
CREATE TABLE IF NOT EXISTS containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    lot_id UUID REFERENCES lots(id),
    bank_id UUID REFERENCES banks(id),
    container_type_id UUID REFERENCES container_types(id),
    position_id UUID REFERENCES positions(id),
    status TEXT DEFAULT 'IN_CULTURE',
    seeded_at TIMESTAMPTZ,
    passage_number INTEGER,
    cells_count NUMERIC,
    viability NUMERIC,
    media_type TEXT,
    notes TEXT,
    placed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    confluent_percent INTEGER,
    morphology TEXT,
    contaminated BOOLEAN DEFAULT false,
    passage_count INTEGER DEFAULT 0
);

-- ============================================
-- OPERATIONS TABLES
-- ============================================

-- Operations
CREATE TABLE IF NOT EXISTS operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    container_id UUID REFERENCES containers(id),
    bank_id UUID REFERENCES banks(id),
    lot_id UUID REFERENCES lots(id),
    operator_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'PENDING',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    parameters JSONB,
    notes TEXT,
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Operation Containers
CREATE TABLE IF NOT EXISTS operation_containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES operations(id),
    container_id UUID REFERENCES containers(id),
    role TEXT DEFAULT 'SOURCE',
    confluent_percent INTEGER,
    morphology TEXT,
    contaminated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    medium_id UUID,
    volume_ml NUMERIC,
    split_ratio VARCHAR(50),
    new_confluent_percent INTEGER,
    seeded_cells NUMERIC
);

-- Operation Media
CREATE TABLE IF NOT EXISTS operation_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES operations(id),
    batch_id UUID,
    ready_medium_id UUID,
    quantity_ml NUMERIC,
    purpose TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Operation Metrics
CREATE TABLE IF NOT EXISTS operation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES operations(id),
    concentration NUMERIC,
    viability_percent NUMERIC,
    total_cells NUMERIC,
    volume_ml NUMERIC,
    passage_yield NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INVENTORY TABLES
-- ============================================

-- Batches
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomenclature_id UUID REFERENCES nomenclatures(id),
    batch_number TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT DEFAULT 'шт',
    expiration_date DATE,
    manufacturing_date DATE,
    supplier TEXT,
    storage_location TEXT,
    status TEXT DEFAULT 'AVAILABLE',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Batch Reservations
CREATE TABLE IF NOT EXISTS batch_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id),
    operation_id UUID REFERENCES operations(id),
    quantity NUMERIC NOT NULL,
    reserved_at TIMESTAMPTZ DEFAULT now(),
    released_at TIMESTAMPTZ,
    notes TEXT
);

-- Inventory Movements
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id),
    movement_type TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    from_location TEXT,
    to_location TEXT,
    moved_by_id UUID REFERENCES users(id),
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    moved_at TIMESTAMPTZ DEFAULT now()
);

-- Ready Media
CREATE TABLE IF NOT EXISTS ready_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    media_type TEXT NOT NULL,
    lot_number TEXT,
    preparation_date DATE,
    expiration_date DATE,
    volume_ml NUMERIC,
    storage_position_id UUID REFERENCES positions(id),
    status TEXT DEFAULT 'PREPARED',
    activated_at TIMESTAMPTZ,
    created_by_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    current_volume_ml NUMERIC
);

-- ============================================
-- QC & TASKS TABLES
-- ============================================

-- QC Tests
CREATE TABLE IF NOT EXISTS qc_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    status TEXT DEFAULT 'PENDING',
    result TEXT,
    assigned_to UUID REFERENCES users(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    methodology TEXT,
    results_data JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'PENDING',
    due_date DATE,
    container_id UUID REFERENCES containers(id),
    bank_id UUID REFERENCES banks(id),
    order_id UUID,
    assigned_to UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ORDERS TABLES
-- ============================================

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    culture_type_id UUID REFERENCES culture_types(id),
    bank_id UUID REFERENCES banks(id),
    order_type TEXT DEFAULT 'STANDARD',
    status TEXT DEFAULT 'PENDING',
    quantity INTEGER NOT NULL,
    volume_per_unit NUMERIC DEFAULT 1,
    requester_name TEXT,
    requester_department TEXT,
    requester_email TEXT,
    purpose TEXT,
    due_date DATE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    bank_id UUID REFERENCES banks(id),
    cryo_vial_id UUID REFERENCES cryo_vials(id),
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- AUDIT & LOGS
-- ============================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    description TEXT,
    ip_address VARCHAR(100),
    user_agent VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Equipment Logs
CREATE TABLE IF NOT EXISTS equipment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id),
    temperature NUMERIC,
    notes TEXT,
    logged_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_containers_lot_id ON containers(lot_id);
CREATE INDEX IF NOT EXISTS idx_containers_bank_id ON containers(bank_id);
CREATE INDEX IF NOT EXISTS idx_containers_position_id ON containers(position_id);
CREATE INDEX IF NOT EXISTS idx_operations_container_id ON operations(container_id);
CREATE INDEX IF NOT EXISTS idx_operations_bank_id ON operations(bank_id);
CREATE INDEX IF NOT EXISTS idx_operations_lot_id ON operations(lot_id);
CREATE INDEX IF NOT EXISTS idx_lots_culture_id ON lots(culture_id);
CREATE INDEX IF NOT EXISTS idx_banks_culture_id ON banks(culture_id);
CREATE INDEX IF NOT EXISTS idx_banks_lot_id ON banks(lot_id);
CREATE INDEX IF NOT EXISTS idx_cultures_type_id ON cultures(type_id);
CREATE INDEX IF NOT EXISTS idx_cultures_donor_id ON cultures(donor_id);
CREATE INDEX IF NOT EXISTS idx_cultures_donation_id ON cultures(donation_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_lots_parent_lot_id ON lots(parent_lot_id);
CREATE INDEX IF NOT EXISTS idx_orders_bank_id ON orders(bank_id);

-- Deferred FK: lots.source_container_id → containers(id)
ALTER TABLE lots ADD CONSTRAINT fk_lots_source_container
    FOREIGN KEY (source_container_id) REFERENCES containers(id);
CREATE INDEX IF NOT EXISTS idx_qc_tests_target_id ON qc_tests(target_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type);
CREATE INDEX IF NOT EXISTS idx_equipment_location ON equipment(location);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cultures_updated_at BEFORE UPDATE ON cultures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON lots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON banks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON containers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate lot number function
CREATE OR REPLACE FUNCTION generate_lot_number(p_culture_id UUID, p_passage_number INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN 'LOT-' || LEFT(md5(p_culture_id::text), 8) || '-' || p_passage_number::text;
END;
$$ LANGUAGE plpgsql;

-- Generate container code function
CREATE OR REPLACE FUNCTION generate_container_code(p_container_type_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_type_code TEXT;
    v_count INTEGER;
BEGIN
    SELECT code INTO v_type_code FROM container_types WHERE id = p_container_type_id;
    SELECT COUNT(*) INTO v_count FROM containers WHERE container_type_id = p_container_type_id;
    RETURN v_type_code || '-' || (v_count + 1)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES (Applied via migration)
-- ============================================

-- Donation auto-status trigger
CREATE OR REPLACE FUNCTION update_donation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If all 4 infection tests are NEGATIVE → APPROVED
    IF NEW.inf_hiv = 'NEGATIVE' AND NEW.inf_hbv = 'NEGATIVE'
       AND NEW.inf_hcv = 'NEGATIVE' AND NEW.inf_syphilis = 'NEGATIVE' THEN
        NEW.status = 'APPROVED';
    -- If any test is POSITIVE → REJECTED
    ELSIF NEW.inf_hiv = 'POSITIVE' OR NEW.inf_hbv = 'POSITIVE'
          OR NEW.inf_hcv = 'POSITIVE' OR NEW.inf_syphilis = 'POSITIVE' THEN
        NEW.status = 'REJECTED';
    -- Otherwise stay QUARANTINE
    ELSE
        NEW.status = 'QUARANTINE';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_donation_status_trigger
    BEFORE INSERT OR UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION update_donation_status();

-- Note: RLS policies are applied separately to avoid conflicts
-- See migrations/20260201000000_rls_reference_tables.sql
