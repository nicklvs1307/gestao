-- AlterTable
ALTER TABLE "RestaurantSettings" ADD COLUMN     "videoBanners" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "_AddonGroupToCategory" ADD CONSTRAINT "_AddonGroupToCategory_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_AddonGroupToCategory_AB_unique";

-- AlterTable
ALTER TABLE "_AddonGroupToProduct" ADD CONSTRAINT "_AddonGroupToProduct_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_AddonGroupToProduct_AB_unique";

-- AlterTable
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_CategoryToProduct_AB_unique";

-- AlterTable
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_PermissionToRole_AB_unique";

-- AlterTable
ALTER TABLE "_UserPermissions" ADD CONSTRAINT "_UserPermissions_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_UserPermissions_AB_unique";

-- AlterTable
ALTER TABLE "_UserSectors" ADD CONSTRAINT "_UserSectors_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_UserSectors_AB_unique";

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "Addon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
