/*
  Warnings:

  - The primary key for the `_AddonGroupToCategory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_AddonGroupToProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_CategoryToProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_PermissionToRole` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_UserPermissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_UserSectors` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_AddonGroupToCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_AddonGroupToProduct` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_CategoryToProduct` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_PermissionToRole` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_UserPermissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_UserSectors` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "addonId" TEXT,
ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "_AddonGroupToCategory" DROP CONSTRAINT "_AddonGroupToCategory_AB_pkey";

-- AlterTable
ALTER TABLE "_AddonGroupToProduct" DROP CONSTRAINT "_AddonGroupToProduct_AB_pkey";

-- AlterTable
ALTER TABLE "_CategoryToProduct" DROP CONSTRAINT "_CategoryToProduct_AB_pkey";

-- AlterTable
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_AB_pkey";

-- AlterTable
ALTER TABLE "_UserPermissions" DROP CONSTRAINT "_UserPermissions_AB_pkey";

-- AlterTable
ALTER TABLE "_UserSectors" DROP CONSTRAINT "_UserSectors_AB_pkey";

-- CreateIndex
CREATE INDEX "Promotion_addonId_idx" ON "Promotion"("addonId");

-- CreateIndex
CREATE INDEX "Promotion_categoryId_idx" ON "Promotion"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "_AddonGroupToCategory_AB_unique" ON "_AddonGroupToCategory"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_AddonGroupToProduct_AB_unique" ON "_AddonGroupToProduct"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToProduct_AB_unique" ON "_CategoryToProduct"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_UserPermissions_AB_unique" ON "_UserPermissions"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_UserSectors_AB_unique" ON "_UserSectors"("A", "B");
