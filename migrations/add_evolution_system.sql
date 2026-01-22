-- Add Evolution System
-- This migration adds support for figurine evolution at level milestones

-- 1. Add columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS original_figurine_url TEXT,
ADD COLUMN IF NOT EXISTS current_evolution_level INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN profiles.original_figurine_url IS 'URL to user''s original figurine image (before any evolutions)';
COMMENT ON COLUMN profiles.current_evolution_level IS 'Highest evolution milestone level achieved (0 = no evolution, 5, 10, 20, 30, etc.)';

-- 2. Create user_evolutions table
CREATE TABLE IF NOT EXISTS user_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  evolution_level integer NOT NULL,
  figurine_url text NOT NULL,
  skill_levels_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  dream_titles_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, evolution_level)
);

-- Add comment
COMMENT ON TABLE user_evolutions IS 'Stores evolution history - each row represents one evolution milestone';
COMMENT ON COLUMN user_evolutions.evolution_level IS 'The milestone level that triggered this evolution (5, 10, 20, 30, etc.)';
COMMENT ON COLUMN user_evolutions.skill_levels_snapshot IS 'JSON object with skill names as keys and level numbers as values at evolution time';
COMMENT ON COLUMN user_evolutions.dream_titles_snapshot IS 'JSON array of dream titles at evolution time';

-- 3. Enable RLS on user_evolutions
ALTER TABLE user_evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_evolutions FORCE ROW LEVEL SECURITY;

-- 4. Create RLS policies for user_evolutions
CREATE POLICY "Users can view their own evolutions" ON user_evolutions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evolutions" ON user_evolutions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all evolutions" ON user_evolutions
  FOR ALL USING (true);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_evolutions_user_id ON user_evolutions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_evolutions_evolution_level ON user_evolutions(evolution_level);
CREATE INDEX IF NOT EXISTS idx_user_evolutions_user_level ON user_evolutions(user_id, evolution_level);

-- 6. Grant permissions
GRANT SELECT, INSERT ON user_evolutions TO authenticated;

-- 7. Migrate existing figurine_url to original_figurine_url for existing users
-- This ensures existing users have their original figurine preserved
UPDATE profiles
SET original_figurine_url = figurine_url
WHERE figurine_url IS NOT NULL 
  AND original_figurine_url IS NULL;
