-- Run on product-service PostgreSQL if warehouse logo save fails with "column logoUrl does not exist"
ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS "logoUrl" text;
