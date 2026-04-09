-- Add complement and reference fields to DeliveryOrder table

ALTER TABLE "DeliveryOrder" ADD COLUMN IF NOT EXISTS "complement" TEXT;
ALTER TABLE "DeliveryOrder" ADD COLUMN IF NOT EXISTS "reference" TEXT;