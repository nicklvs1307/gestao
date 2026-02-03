-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "address" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "serviceTaxPercentage" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "RestaurantSettings" ADD COLUMN     "backgroundImageUrl" TEXT,
ADD COLUMN     "backgroundType" TEXT DEFAULT 'color';
