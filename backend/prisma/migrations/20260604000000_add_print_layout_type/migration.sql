-- Migration: Add print layout type support
-- Created: 2026-06-04
-- Description: Adds 'type' field to PrintLayoutConfig to support different
--              layout configurations for delivery, pickup, and table orders.
--              Migrates existing data to type='table' and updates unique constraint.

-- Step 1: Add type column with default value 'table'
ALTER TABLE "print_layout_configs" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'table';

-- Step 2: Update existing records to use type 'table' (already default, but explicit)
UPDATE "print_layout_configs" SET "type" = 'table' WHERE "type" IS NULL;

-- Step 3: Drop the old unique constraint on restaurantId alone
ALTER TABLE "print_layout_configs" DROP CONSTRAINT "print_layout_configs_restaurantId_key";

-- Step 4: Create new unique constraint on (restaurantId, type)
-- This allows one layout per restaurant per type (delivery, pickup, table)
CREATE UNIQUE INDEX "print_layout_configs_restaurantId_type_key" ON "print_layout_configs"("restaurantId", "type");

-- Step 5: Add index on type for faster filtering
CREATE INDEX "print_layout_configs_type_idx" ON "print_layout_configs"("type");
