-- Add address fields to DeliveryOrder table
ALTER TABLE "DeliveryOrder" ADD COLUMN IF NOT EXISTS "neighborhood" TEXT;
ALTER TABLE "DeliveryOrder" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "DeliveryOrder" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "DeliveryOrder" ADD COLUMN IF NOT EXISTS "zipCode" TEXT;