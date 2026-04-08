-- Migration: add_pickup_to_order_type
-- Created at: 2026-04-07

-- Add PICKUP value to OrderType enum
ALTER TYPE "OrderType" ADD VALUE 'PICKUP';
