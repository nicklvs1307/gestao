-- AlterTable to make categoryId nullable
-- This column is now legacy as we moved to many-to-many categories
ALTER TABLE "Product" ALTER COLUMN "categoryId" DROP NOT NULL;
