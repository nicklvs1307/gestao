-- Migration: Add Order tax breakdown fields (subtotal, deliveryFee, platformFee)
-- Created: 2026-05-11
-- Description: Adds explicit fields to Order model for complete tax/fee breakdown
--              - subtotal: sum of items without fees
--              - deliveryFee: delivery fee (now centralized on Order, not just DeliveryOrder)
--              - platformFee: platform fees (iFood, etc.) included in total

ALTER TABLE "Order" ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0;