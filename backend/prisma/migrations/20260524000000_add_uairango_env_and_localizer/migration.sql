-- Migration: Add UaiRango environment, auto-accept orders, and localizer fields
-- Created: 2026-05-24
-- Description: Adds uairangoEnv (production/development selector), uairangoAutoAcceptOrders (auto-accept toggle) to IntegrationSettings,
--              and localizer/localizerExpiration (phone masking/0800) to Order table

-- Add environment selector to IntegrationSettings (defaults to production)
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoEnv" TEXT NOT NULL DEFAULT 'production';

-- Add auto-accept orders toggle
ALTER TABLE "IntegrationSettings" ADD COLUMN "uairangoAutoAcceptOrders" BOOLEAN NOT NULL DEFAULT false;

-- Add localizer (ID de conexão para chamadas via 0800) to Order
ALTER TABLE "Order" ADD COLUMN "localizer" TEXT;

-- Add localizer expiration timestamp
ALTER TABLE "Order" ADD COLUMN "localizerExpiration" TIMESTAMP(3);
