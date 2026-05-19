-- Migration: Add notes field to Order for customer observations (PICKUP/TABLE)
-- Created: 2026-05-19
-- Description: Adds notes column to Order table so customer observations are stored
--              directly on the order (not just on DeliveryOrder), enabling PICKUP orders
--              to have customer notes visible in the system.

ALTER TABLE "Order" ADD COLUMN "notes" TEXT;
