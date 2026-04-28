-- Convert OrderItem JSON fields from String to Jsonb type
-- This improves performance and consistency with other Json fields in the schema

ALTER TABLE "OrderItem" 
    ALTER COLUMN "sizeJson" TYPE JSONB USING "sizeJson"::jsonb,
    ALTER COLUMN "addonsJson" TYPE JSONB USING "addonsJson"::jsonb,
    ALTER COLUMN "flavorsJson" TYPE JSONB USING "flavorsJson"::jsonb;

-- Allow NULL values (already nullable, but ensuring the type conversion works)
ALTER TABLE "OrderItem" 
    ALTER COLUMN "sizeJson" DROP NOT NULL,
    ALTER COLUMN "addonsJson" DROP NOT NULL,
    ALTER COLUMN "flavorsJson" DROP NOT NULL;