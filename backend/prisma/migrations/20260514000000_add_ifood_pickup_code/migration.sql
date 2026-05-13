-- Add pickupCode field for iFood motoboy confirmation code
-- This code is displayed to the delivery driver for order confirmation

-- Add pickupCode to Order (iFood motoboy confirmation code)
ALTER TABLE "Order" ADD COLUMN "pickupCode" TEXT;

-- Add index for faster lookups
CREATE INDEX "Order_pickupCode_idx" ON "Order"("pickupCode");