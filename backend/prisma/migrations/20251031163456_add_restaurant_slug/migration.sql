-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "slug" TEXT;

-- UpdateData
UPDATE "Restaurant" SET "slug" = "name";

-- AlterColumn
ALTER TABLE "Restaurant" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");