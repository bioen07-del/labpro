-- Migration: Add processing_method to cultures table
-- Date: 07.02.2026
-- Supports tissue processing method selection during culture creation

ALTER TABLE cultures ADD COLUMN IF NOT EXISTS processing_method TEXT;

-- Index for filtering by processing method
CREATE INDEX IF NOT EXISTS idx_cultures_processing_method ON cultures(processing_method);
