-- AlterTable: Add delivery auto-open fields to RestaurantSettings
ALTER TABLE "RestaurantSettings" ADD COLUMN "minOrderValue" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "RestaurantSettings" ADD COLUMN "autoOpenDelivery" BOOLEAN DEFAULT false;
ALTER TABLE "RestaurantSettings" ADD COLUMN "deliveryOpeningTime" TEXT;
ALTER TABLE "RestaurantSettings" ADD COLUMN "deliveryClosingTime" TEXT;

-- AlterTable: Add password reset token fields to User
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");
