-- Schema Updates for LabPro
-- Date: 30.01.2026
-- Note: Updated to match actual database schema

-- ============================================
-- ENUM TYPES
-- ============================================

-- Drop existing enums if they exist
DROP TYPE IF EXISTS container_status CASCADE;
DROP TYPE IF EXISTS bank_type CASCADE;
DROP TYPE IF EXISTS bank_status CASCADE;
DROP TYPE IF EXISTS qc_status CASCADE;
DROP TYPE IF EXISTS qc_result CASCADE;
DROP TYPE IF EXISTS culture_status CASCADE;
DROP TYPE IF EXISTS order_type CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS operation_type CASCADE;
DROP TYPE IF EXISTS operation_status CASCADE;
DROP TYPE IF EXISTS batch_status CASCADE;

-- Create enums
CREATE TYPE container_status AS ENUM ('IN_CULTURE', 'IN_BANK', 'ISSUED', 'DISPOSE', 'QUARANTINE');
CREATE TYPE bank_type AS ENUM ('MCB', 'WCB', 'RWB');
CREATE TYPE bank_status AS ENUM ('QUARANTINE', 'APPROVED', 'RESERVED', 'ISSUED', 'DISPOSE');
CREATE TYPE qc_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
CREATE TYPE qc_result AS ENUM ('PASSED', 'FAILED', 'INCONCLUSIVE');
CREATE TYPE culture_status AS ENUM ('ACTIVE', 'ARCHIVED', 'DISPOSE', 'QUARANTINE');
CREATE TYPE order_type AS ENUM ('STANDARD', 'URGENT', 'RESEARCH');
CREATE TYPE order_status AS ENUM ('PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE operation_type AS ENUM ('FEEDING', 'PASSAGE', 'FREEZE', 'THAW', 'OBSERVE', 'QC', 'DISPOSE');
CREATE TYPE operation_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE batch_status AS ENUM ('AVAILABLE', 'RESERVED', 'USED', 'EXPIRED', 'QUARANTINE');

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

-- Donors
CREATE TABLE IF NOT EXISTS donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    birth_date DATE,
    gender TEXT,
    blood_type TEXT,
    consent_date DATE,
    consent_number TEXT,
    status TEXT DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
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
