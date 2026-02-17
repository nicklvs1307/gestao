-- CreateTable
CREATE TABLE "StoreKnowledge" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreKnowledge_restaurantId_idx" ON "StoreKnowledge"("restaurantId");

-- AddForeignKey
ALTER TABLE "StoreKnowledge" ADD CONSTRAINT "StoreKnowledge_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
