-- AlterTable
ALTER TABLE "Category" ADD COLUMN "cuisineType" TEXT DEFAULT 'Geral',
ADD COLUMN "description" TEXT,
ADD COLUMN "halfAndHalfRule" TEXT DEFAULT 'NONE',
ADD COLUMN "availableDays" TEXT DEFAULT '1,2,3,4,5,6,7',
ADD COLUMN "startTime" TEXT,
ADD COLUMN "endTime" TEXT;
