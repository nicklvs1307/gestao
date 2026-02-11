-- Emergency Fix: Ensure all checklist columns exist
-- This handles partial migration failures on production DB

-- 1. ChecklistExecution table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ChecklistExecution' AND column_name='notes') THEN
        ALTER TABLE "ChecklistExecution" ADD COLUMN "notes" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ChecklistExecution' AND column_name='status') THEN
        ALTER TABLE "ChecklistExecution" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'COMPLETED';
    END IF;

    -- Garantir que userId seja opcional
    ALTER TABLE "ChecklistExecution" ALTER COLUMN "userId" DROP NOT NULL;
END $$;

-- 2. ChecklistResponse table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ChecklistResponse' AND column_name='notes') THEN
        ALTER TABLE "ChecklistResponse" ADD COLUMN "notes" TEXT;
    END IF;
END $$;

-- 3. ChecklistTask table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ChecklistTask' AND column_name='type') THEN
        ALTER TABLE "ChecklistTask" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'CHECKBOX';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ChecklistTask' AND column_name='isRequired') THEN
        ALTER TABLE "ChecklistTask" ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;
