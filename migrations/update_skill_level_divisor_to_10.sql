-- Update Skill Level Divisor from 50 to 10
-- This makes leveling up 5x easier (Level 99 now requires 96,040 XP instead of 480,200 XP)
-- Formula: Level = floor(sqrt(XP / 10)) + 1

-- Update v_user_levels view
CREATE OR REPLACE VIEW v_user_levels AS
SELECT 
  user_id,
  skill,
  xp,
  floor(sqrt(xp::float / 10)) + 1 as level
FROM user_xp;

-- Update v_user_overall_level view
CREATE OR REPLACE VIEW v_user_overall_level AS
SELECT 
  user_id,
  SUM(xp) as total_xp,
  floor(sqrt(SUM(xp)::float / 10)) + 1 as overall_level
FROM user_xp
GROUP BY user_id;
