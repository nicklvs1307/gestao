-- Migration: Add performance indexes for ChecklistExecution
-- Created: 2026-04-22

-- Index for filtering executions by date range and restaurant
CREATE INDEX IF NOT EXISTS "ChecklistExecution_startedAt_restaurantId_idx" 
ON "ChecklistExecution" ("startedAt", "restaurantId");

-- Index for filtering executions by completion date and restaurant (used in reports)
CREATE INDEX IF NOT EXISTS "ChecklistExecution_completedAt_restaurantId_idx" 
ON "ChecklistExecution" ("completedAt", "restaurantId");

-- Index for filtering executions by checklist and status
CREATE INDEX IF NOT EXISTS "ChecklistExecution_checklistId_status_idx" 
ON "ChecklistExecution" ("checklistId", "status");

-- Index for Checklist model (filter by active and frequency)
CREATE INDEX IF NOT EXISTS "Checklist_restaurantId_isActive_frequency_idx" 
ON "Checklist" ("restaurantId", "isActive", "frequency");