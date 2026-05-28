-- Migration: Add print layout configuration tables
-- Created: 2026-05-29
-- Description: Creates PrintLayoutConfig and PrintLayoutBlock tables for
--              modular receipt layout customization with drag-and-drop support.
--              Each restaurant can have one active layout config with ordered blocks.

-- CreateTable: print_layout_configs
CREATE TABLE "print_layout_configs" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "fontFamily" TEXT NOT NULL DEFAULT 'monospace',
    "fontSize" TEXT NOT NULL DEFAULT 'medium',
    "lineHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "paperWidth" INTEGER NOT NULL DEFAULT 80,
    "sectionSpacing" INTEGER NOT NULL DEFAULT 8,
    "itemSpacing" INTEGER NOT NULL DEFAULT 2,
    "paperFeed" INTEGER NOT NULL DEFAULT 3,
    "useInit" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_layout_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: print_layout_blocks
CREATE TABLE "print_layout_blocks" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "fontSize" TEXT,
    "fontWeight" TEXT,
    "fontStyle" TEXT,
    "textAlign" TEXT,
    "customContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_layout_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on restaurantId (one layout per restaurant)
CREATE UNIQUE INDEX "print_layout_configs_restaurantId_key" ON "print_layout_configs"("restaurantId");

-- CreateIndex: Unique constraint on layoutId + blockType
CREATE UNIQUE INDEX "print_layout_blocks_layoutId_blockType_key" ON "print_layout_blocks"("layoutId", "blockType");

-- CreateIndex: Index on layoutId for faster block lookups
CREATE INDEX "print_layout_blocks_layoutId_idx" ON "print_layout_blocks"("layoutId");

-- AddForeignKey: print_layout_configs -> restaurants
ALTER TABLE "print_layout_configs" ADD CONSTRAINT "print_layout_configs_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: print_layout_blocks -> print_layout_configs
ALTER TABLE "print_layout_blocks" ADD CONSTRAINT "print_layout_blocks_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "print_layout_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
