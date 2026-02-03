-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "address" TEXT,
ADD COLUMN     "backgroundColor" TEXT DEFAULT '#f0f2f5',
ADD COLUMN     "backgroundImageUrl" TEXT,
ADD COLUMN     "backgroundType" TEXT DEFAULT 'color',
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "primaryColor" TEXT DEFAULT '#6a11cb',
ADD COLUMN     "secondaryColor" TEXT DEFAULT '#2575fc',
ADD COLUMN     "serviceTaxPercentage" DOUBLE PRECISION DEFAULT 10.0;
