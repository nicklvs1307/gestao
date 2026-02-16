-- CreateTable
CREATE TABLE "WhatsAppInstance" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "qrcode" TEXT,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSettings" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "agentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "agentName" TEXT NOT NULL DEFAULT 'Atendente Virtual',
    "agentPersona" TEXT,
    "openaiApiKey" TEXT,
    "welcomeMessage" TEXT,
    "offlineMessage" TEXT,
    "autoAcceptOrders" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppChatMessage" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerPhone" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,

    CONSTRAINT "WhatsAppChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInstance_name_key" ON "WhatsAppInstance"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInstance_restaurantId_key" ON "WhatsAppInstance"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSettings_restaurantId_key" ON "WhatsAppSettings"("restaurantId");

-- CreateIndex
CREATE INDEX "WhatsAppChatMessage_customerPhone_restaurantId_idx" ON "WhatsAppChatMessage"("customerPhone", "restaurantId");

-- CreateIndex
CREATE INDEX "WhatsAppChatMessage_restaurantId_idx" ON "WhatsAppChatMessage"("restaurantId");

-- AddForeignKey
ALTER TABLE "WhatsAppInstance" ADD CONSTRAINT "WhatsAppInstance_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSettings" ADD CONSTRAINT "WhatsAppSettings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
