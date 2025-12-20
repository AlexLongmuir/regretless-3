-- Update acceptance_criteria to be an array of objects instead of array of strings
-- We need to check if it's already an array of objects to avoid double migration
-- If it's an array of strings, convert each string to { title: string, description: "Add description here" }

-- Function to migrate existing data
CREATE OR REPLACE FUNCTION migrate_acceptance_criteria()
RETURNS void AS $$
DECLARE
  r RECORD;
  new_criteria jsonb;
  item text;
  i int;
BEGIN
  FOR r IN SELECT id, acceptance_criteria FROM actions WHERE acceptance_criteria IS NOT NULL AND jsonb_typeof(acceptance_criteria) = 'array' LOOP
    -- Check if first element is a string (if array is not empty)
    IF jsonb_array_length(r.acceptance_criteria) > 0 AND jsonb_typeof(r.acceptance_criteria->0) = 'string' THEN
      new_criteria := '[]'::jsonb;
      
      -- Loop through array elements
      FOR i IN 0..jsonb_array_length(r.acceptance_criteria)-1 LOOP
        item := r.acceptance_criteria->>i;
        -- Create object with title from string and empty description
        new_criteria := new_criteria || jsonb_build_object(
          'title', item,
          'description', 'Description pending...'
        );
      END LOOP;
      
      -- Update the row
      UPDATE actions SET acceptance_criteria = new_criteria WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run migration
SELECT migrate_acceptance_criteria();

-- Drop migration function
DROP FUNCTION migrate_acceptance_criteria();

-- Update constraint to valid new structure
ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_acceptance_criteria_check;
ALTER TABLE actions ADD CONSTRAINT actions_acceptance_criteria_check 
  CHECK (jsonb_typeof(acceptance_criteria) = 'array' AND jsonb_array_length(acceptance_criteria) <= 3);
