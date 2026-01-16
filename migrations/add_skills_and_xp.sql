-- Add Skills and XP System

-- 1. Add skill columns to actions table
ALTER TABLE actions 
ADD COLUMN primary_skill text,
ADD COLUMN secondary_skill text;

ALTER TABLE actions
ADD CONSTRAINT check_primary_skill CHECK (
  primary_skill IN (
    'Fitness', 'Strength', 'Nutrition', 'Writing', 'Learning', 'Languages', 
    'Music', 'Creativity', 'Business', 'Marketing', 'Sales', 'Mindfulness', 
    'Communication', 'Finance', 'Travel', 'Career', 'Coding'
  )
);

ALTER TABLE actions
ADD CONSTRAINT check_secondary_skill CHECK (
  secondary_skill IN (
    'Fitness', 'Strength', 'Nutrition', 'Writing', 'Learning', 'Languages', 
    'Music', 'Creativity', 'Business', 'Marketing', 'Sales', 'Mindfulness', 
    'Communication', 'Finance', 'Travel', 'Career', 'Coding'
  )
);

-- 2. Create user_xp table
CREATE TABLE user_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (
    skill IN (
      'Fitness', 'Strength', 'Nutrition', 'Writing', 'Learning', 'Languages', 
      'Music', 'Creativity', 'Business', 'Marketing', 'Sales', 'Mindfulness', 
      'Communication', 'Finance', 'Travel', 'Career', 'Coding'
    )
  ),
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill)
);

-- RLS for user_xp
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP" ON user_xp
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own XP" ON user_xp
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage XP" ON user_xp
  FOR ALL USING (true);

-- Trigger for updated_at on user_xp
CREATE TRIGGER trigger_user_xp_updated_at 
  BEFORE UPDATE ON user_xp 
  FOR EACH ROW 
  EXECUTE FUNCTION set_updated_at();

-- 3. Views for User Levels
-- Formula: Level = floor(sqrt(XP / 50)) + 1

CREATE OR REPLACE VIEW v_user_levels AS
SELECT 
  user_id,
  skill,
  xp,
  floor(sqrt(xp::float / 50)) + 1 as level
FROM user_xp;

CREATE OR REPLACE VIEW v_user_overall_level AS
SELECT 
  user_id,
  SUM(xp) as total_xp,
  floor(sqrt(SUM(xp)::float / 50)) + 1 as overall_level
FROM user_xp
GROUP BY user_id;

-- 4. Add xp_gained to action_occurrences
ALTER TABLE action_occurrences ADD COLUMN xp_gained integer;

-- 5. Function to calculate and award XP
CREATE OR REPLACE FUNCTION calculate_xp_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action actions%ROWTYPE;
  v_est_minutes integer;
  v_difficulty text;
  v_multiplier float;
  v_base_xp integer;
  v_penalty integer;
  v_final_xp integer;
  v_primary_xp integer;
  v_secondary_xp integer;
BEGIN
  -- Only run when completed_at is set (and wasn't before)
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL) THEN
    
    -- Get action details
    SELECT * INTO v_action FROM actions WHERE id = NEW.action_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    -- Defaults
    v_est_minutes := COALESCE(v_action.est_minutes, 15); -- Default to 15 if null
    v_difficulty := v_action.difficulty;
    
    -- 1. Compute multiplier
    CASE v_difficulty
      WHEN 'easy' THEN v_multiplier := 1.0;
      WHEN 'medium' THEN v_multiplier := 1.3;
      WHEN 'hard' THEN v_multiplier := 1.7;
      ELSE v_multiplier := 1.0;
    END CASE;
    
    -- 2. Base XP = clamp(round(est_minutes * multiplier), min 5, max 60)
    v_base_xp := ROUND(v_est_minutes * v_multiplier);
    IF v_base_xp < 5 THEN v_base_xp := 5; END IF;
    IF v_base_xp > 60 THEN v_base_xp := 60; END IF;
    
    -- 3. Penalty = min(10, 2 * defer_count)
    v_penalty := LEAST(10, 2 * NEW.defer_count);
    
    -- 4. Final Total XP
    v_final_xp := GREATEST(1, v_base_xp - v_penalty);
    
    -- Store calculated XP on occurrence
    NEW.xp_gained := v_final_xp;
    
    -- 5. Allocate to skills
    v_primary_xp := ROUND(v_final_xp * 0.7);
    v_secondary_xp := v_final_xp - v_primary_xp;
    
    -- Update Primary Skill
    IF v_action.primary_skill IS NOT NULL THEN
      INSERT INTO user_xp (user_id, skill, xp)
      VALUES (NEW.user_id, v_action.primary_skill, v_primary_xp)
      ON CONFLICT (user_id, skill) 
      DO UPDATE SET xp = user_xp.xp + v_primary_xp, updated_at = now();
    END IF;
    
    -- Update Secondary Skill
    IF v_action.secondary_skill IS NOT NULL THEN
      INSERT INTO user_xp (user_id, skill, xp)
      VALUES (NEW.user_id, v_action.secondary_skill, v_secondary_xp)
      ON CONFLICT (user_id, skill) 
      DO UPDATE SET xp = user_xp.xp + v_secondary_xp, updated_at = now();
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Trigger for calculating XP
DROP TRIGGER IF EXISTS trigger_calculate_xp ON action_occurrences;
CREATE TRIGGER trigger_calculate_xp
  BEFORE UPDATE ON action_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION calculate_xp_on_completion();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_xp TO authenticated;
GRANT SELECT ON v_user_levels TO authenticated;
GRANT SELECT ON v_user_overall_level TO authenticated;
