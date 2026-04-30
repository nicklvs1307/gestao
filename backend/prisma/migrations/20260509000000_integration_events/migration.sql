-- Migration: Create IntegrationEvent table for idempotent processing
-- Executar: npx prisma migrate resolve --name integration_events
-- ou via SQL direto no banco

-- Se a tabela não existir
CREATE TABLE IF NOT EXISTS "IntegrationEvent" (
    "id" VARCHAR(255) PRIMARY KEY,
    "platform" VARCHAR(20) NOT NULL,
    "platformOrderId" VARCHAR(100) NOT NULL,
    "eventType" VARCHAR(30) NOT NULL,
    "restaurantId" VARCHAR(36) NOT NULL,
    "orderId" VARCHAR(36),
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "IntegrationEvent_platform_platformOrderId_eventType_unique" UNIQUE ("platform", "platformOrderId", "eventType")
);

-- indexes
CREATE INDEX IF NOT EXISTS "idx_integration_event_platform" ON "IntegrationEvent" ("platform");
CREATE INDEX IF NOT EXISTS "idx_integration_event_restaurant" ON "IntegrationEvent" ("restaurantId");
CREATE INDEX IF NOT EXISTS "idx_integration_event_status" ON "IntegrationEvent" ("status");
CREATE INDEX IF NOT EXISTS "idx_integration_event_created" ON "IntegrationEvent" ("createdAt");