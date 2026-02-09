-- Migration: Sync schema with frontend code
-- Date: 07.02.2026
-- Fixes all field name mismatches between DB and frontend

-- ============================================
-- 1. NOTIFICATIONS table (does not exist)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    category TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_type TEXT,
    link_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read" ON notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (true);

-- ============================================
-- 2. TASKS — add missing fields for auto-tasks
-- ============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS interval_days INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_done_date DATE;

-- ============================================
-- 3. CONTAINERS — add qr_code field
-- ============================================
ALTER TABLE containers ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE;

-- ============================================
-- 4. CRYO_VIALS — add missing fields
-- ============================================
ALTER TABLE cryo_vials ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;
ALTER TABLE cryo_vials ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE;
ALTER TABLE cryo_vials ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id);
ALTER TABLE cryo_vials ADD COLUMN IF NOT EXISTS thaw_date DATE;

-- ============================================
-- 5. BANKS — add position_id field
-- ============================================
ALTER TABLE banks ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id);

-- ============================================
-- 6. DONORS — cleanup: drop duplicate gender (keep sex)
-- ============================================
-- Add status back if it was dropped
ALTER TABLE donors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- ============================================
-- 7. INDEXES for new fields
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_tasks_target_id ON tasks(target_id);
CREATE INDEX IF NOT EXISTS idx_tasks_target_type ON tasks(target_type);
CREATE INDEX IF NOT EXISTS idx_containers_qr_code ON containers(qr_code);
CREATE INDEX IF NOT EXISTS idx_cryo_vials_code ON cryo_vials(code);

-- ============================================
-- 8. Updated_at triggers for missing tables
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lots_updated_at') THEN
        CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON lots
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_containers_updated_at') THEN
        CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON containers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_banks_updated_at') THEN
        CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON banks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_operations_updated_at') THEN
        CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
        CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
