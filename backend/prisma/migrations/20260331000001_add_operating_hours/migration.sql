-- AlterTable: Add operatingHours JSON field for per-day schedule
ALTER TABLE "RestaurantSettings" ADD COLUMN "operatingHours" JSONB;
