-- Create a extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alter table to add turnStartHour column
ALTER TABLE "ChecklistReportSettings" ADD COLUMN "turnStartHour" VARCHAR(5) NOT NULL DEFAULT '06:00';