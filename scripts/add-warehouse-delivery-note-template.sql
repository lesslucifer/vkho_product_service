-- Idempotent migration for delivery note print template JSON on warehouse
ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS "deliveryNoteTemplate" text;
