-- Idempotent migration for warehouse logo (also applied on product-service startup via DatabaseBootstrapService)
ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS "logoUrl" text;
