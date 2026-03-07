-- AlterTable
ALTER TABLE "CashierSession" ADD COLUMN     "cashLeftover" DOUBLE PRECISION,
ADD COLUMN     "closingProofUrl" TEXT,
ADD COLUMN     "difference" DOUBLE PRECISION,
ADD COLUMN     "expectedAmount" DOUBLE PRECISION,
ADD COLUMN     "moneyCountJson" JSONB,
ADD COLUMN     "safeEntryAmount" DOUBLE PRECISION;
