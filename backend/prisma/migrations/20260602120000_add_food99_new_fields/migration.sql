-- AlterTable: Adicionar campos novos da integração 99Food
ALTER TABLE "IntegrationSettings" ADD COLUMN "food99AutoAcceptOrders" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "IntegrationSettings" ADD COLUMN "food99ConfirmMethod" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "IntegrationSettings" ADD COLUMN "food99AutoUploadImages" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "IntegrationSettings" ADD COLUMN "food99ReceiveCancelApply" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "IntegrationSettings" ADD COLUMN "food99ReceiveRefundApply" INTEGER NOT NULL DEFAULT 1;
