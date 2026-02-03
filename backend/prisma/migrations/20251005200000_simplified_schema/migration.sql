-- DropForeignKey
ALTER TABLE "public"."Category" DROP CONSTRAINT "Category_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Promotion" DROP CONSTRAINT "Promotion_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Table" DROP CONSTRAINT "Table_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_restaurantId_fkey";

-- DropIndex
DROP INDEX "public"."Category_name_restaurantId_key";

-- DropIndex
DROP INDEX "public"."Category_restaurantId_idx";

-- DropIndex
DROP INDEX "public"."Order_restaurantId_idx";

-- DropIndex
DROP INDEX "public"."Product_restaurantId_idx";

-- DropIndex
DROP INDEX "public"."Promotion_restaurantId_idx";

-- DropIndex
DROP INDEX "public"."Table_number_restaurantId_key";

-- DropIndex
DROP INDEX "public"."Table_restaurantId_idx";

-- DropIndex
DROP INDEX "public"."User_restaurantId_idx";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Promotion" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "Table" DROP COLUMN "restaurantId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "restaurantId",
DROP COLUMN "updatedAt";

-- DropTable
DROP TABLE "public"."Restaurant";

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Table_number_key" ON "Table"("number");