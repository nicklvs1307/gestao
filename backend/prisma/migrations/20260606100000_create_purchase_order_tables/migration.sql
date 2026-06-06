-- CreatePurchaseOrderTables
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" SERIAL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "expectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "restaurantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ingredientId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PurchaseOrder_restaurantId_idx" ON "PurchaseOrder"("restaurantId");
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX "PurchaseOrderItem_ingredientId_idx" ON "PurchaseOrderItem"("ingredientId");

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
