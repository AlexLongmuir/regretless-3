-- Update AI rating constraint to accept 0-100 instead of 1-5
-- This migration updates the check constraint on action_occurrences.ai_rating

-- Drop the existing constraint
ALTER TABLE action_occurrences DROP CONSTRAINT IF EXISTS action_occurrences_ai_rating_check;

-- Add the new constraint
ALTER TABLE action_occurrences ADD CONSTRAINT action_occurrences_ai_rating_check 
  CHECK (ai_rating >= 0 AND ai_rating <= 100);