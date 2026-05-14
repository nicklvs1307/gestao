-- Migration: Add ifoodAutoAcceptOrders for controlled auto-acceptance
-- Created: 2026-05-15
-- Description: Adds ifoodAutoAcceptOrders boolean to IntegrationSettings to control whether orders are auto-accepted on iFood (CFM) or require manual acceptance

-- Add ifoodAutoAcceptOrders column to IntegrationSettings table
ALTER TABLE "IntegrationSettings" ADD COLUMN "ifoodAutoAcceptOrders" BOOLEAN NOT NULL DEFAULT false;