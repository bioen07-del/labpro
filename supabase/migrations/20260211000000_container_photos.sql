-- Container photos table — per-container file attachments
CREATE TABLE IF NOT EXISTS container_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_id UUID NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by container
CREATE INDEX IF NOT EXISTS idx_container_photos_container ON container_photos(container_id);
CREATE INDEX IF NOT EXISTS idx_container_photos_operation ON container_photos(operation_id);

-- RLS
ALTER TABLE container_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "container_photos_select" ON container_photos;
CREATE POLICY "container_photos_select" ON container_photos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "container_photos_insert" ON container_photos;
CREATE POLICY "container_photos_insert" ON container_photos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "container_photos_delete" ON container_photos;
CREATE POLICY "container_photos_delete" ON container_photos FOR DELETE TO authenticated USING (true);

-- Storage bucket for container photos (if not exists — handled by Supabase dashboard)
-- Note: Bucket "container-photos" must be created via Supabase dashboard or CLI
-- INSERT INTO storage.buckets (id, name, public) VALUES ('container-photos', 'container-photos', true)
-- ON CONFLICT (id) DO NOTHING;
