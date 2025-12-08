-- Migration: Add acceptance_intro and acceptance_outro columns to actions table
-- Date: 2025-01-XX
-- Description: Adds new text fields for structured acceptance criteria format

-- Add new columns for intro and outro
ALTER TABLE actions 
ADD COLUMN acceptance_intro TEXT,
ADD COLUMN acceptance_outro TEXT;

-- Add comments for clarity
COMMENT ON COLUMN actions.acceptance_criteria IS 'Array of bullet point criteria (2-3 items)';
COMMENT ON COLUMN actions.acceptance_intro IS 'Introductory sentence setting intention';
COMMENT ON COLUMN actions.acceptance_outro IS 'Closing sentence defining completion';

-- Note: Existing acceptance_criteria data remains as-is (migrated to bullets)
-- No data transformation needed since we're keeping acceptance_criteria for bullets only

