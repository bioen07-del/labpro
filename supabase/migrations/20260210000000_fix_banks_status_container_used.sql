-- Migration: Fix banks.status + container_status USED
-- Date: 2026-02-10

-- 1. Ensure banks table has 'status' column
ALTER TABLE banks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'QUARANTINE';

-- 2. Add USED to container_status values (it's TEXT, no enum change needed for containers table)
-- The container_status enum needs updating if used as a type
-- First check if the enum exists and add USED
DO $$
BEGIN
  -- Try to add USED to container_status enum
  ALTER TYPE container_status ADD VALUE IF NOT EXISTS 'USED';
EXCEPTION
  WHEN OTHERS THEN
    -- enum doesn't exist or already has the value, ignore
    NULL;
END $$;

-- 3. Update previously passaged containers from DISPOSE to USED
-- (containers that were source containers in PASSAGE operations)
UPDATE containers c
SET container_status = 'USED'
WHERE container_status = 'DISPOSE'
  AND EXISTS (
    SELECT 1 FROM operation_containers oc
    JOIN operations o ON o.id = oc.operation_id
    WHERE oc.container_id = c.id
      AND oc.role = 'SOURCE'
      AND o.type = 'PASSAGE'
  );
