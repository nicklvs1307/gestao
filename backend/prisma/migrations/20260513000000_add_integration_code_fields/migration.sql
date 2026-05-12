-- Add integrationCode field for unified PDV integration across all delivery platforms
-- Supports iFood, 99Food, UaiRango and other integrations

-- Add integrationCode to Product (unified field for all platforms)
ALTER TABLE "Product" ADD COLUMN "integrationCode" TEXT;

-- Add index for faster lookups by integration code
CREATE INDEX "Product_restaurantId_integrationCode_idx" ON "Product"("restaurantId", "integrationCode");

-- Add integrationCode to Size
ALTER TABLE "Size" ADD COLUMN "integrationCode" TEXT;

-- Add integrationCode to Addon
ALTER TABLE "Addon" ADD COLUMN "integrationCode" TEXT;

-- Add integrationCode to AddonGroup
ALTER TABLE "AddonGroup" ADD COLUMN "integrationCode" TEXT;

-- Add integrationCode to Category
ALTER TABLE "Category" ADD COLUMN "integrationCode" TEXT;

-- Add integrationCode to PaymentMethod
ALTER TABLE "PaymentMethod" ADD COLUMN "integrationCode" TEXT;

-- Make productId optional in OrderItem (supports integration items without linked products)
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
