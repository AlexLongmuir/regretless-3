-- Achievements System Schema

-- 1. Achievements Definition Table
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL, -- 'action_count', 'streak', 'area_count', 'dream_count'
  criteria_type text NOT NULL, -- 'count_total', 'streak_days', 'count_distinct'
  criteria_value integer NOT NULL, -- The target value (e.g. 100 actions)
  image_url text, -- Unlocked image URL
  locked_image_url text, -- Optional locked state image
  hidden boolean DEFAULT false, -- If true, details are hidden until unlocked
  position integer DEFAULT 0, -- Ordering
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (Public Read)
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read achievements" ON public.achievements FOR SELECT USING (true);

-- 2. User Achievements Progress Table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  seen boolean DEFAULT false, -- If the user has seen the celebration modal
  progress integer DEFAULT 0, -- Current progress value (if we want to track partials)
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS (User Data)
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own achievements" ON public.user_achievements
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage user achievements" ON public.user_achievements
  FOR ALL USING (true); 

-- Indexes
CREATE INDEX idx_achievements_category ON public.achievements(category);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON public.user_achievements(user_id, unlocked_at);

-- 3. Seed Data (Edgy Names)
INSERT INTO public.achievements (title, description, category, criteria_type, criteria_value, position, image_url) VALUES
-- Actions Count
('First Step', 'Completed your very first action.', 'action_count', 'count_total', 1, 10, 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=80'),
('Momentum Builder', 'Completed 10 actions. You are just getting started.', 'action_count', 'count_total', 10, 20, 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80'),
('Action Hero', 'Completed 50 actions. The grind is real.', 'action_count', 'count_total', 50, 30, 'https://images.unsplash.com/photo-1525162272719-7691a5cfcc68?w=400&q=80'),
('Centurion', 'Completed 100 actions. Triple digits club.', 'action_count', 'count_total', 100, 40, 'https://images.unsplash.com/photo-1533227297464-90a612349837?w=400&q=80'),
('Relentless', 'Completed 250 actions. Unstoppable force.', 'action_count', 'count_total', 250, 50, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80'),
('Legend', 'Completed 500 actions. Half a thousand steps forward.', 'action_count', 'count_total', 500, 60, 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&q=80'),
('Immortal', 'Completed 1000 actions. Your legacy is written.', 'action_count', 'count_total', 1000, 70, 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&q=80'),

-- Streaks (Global Streak across all dreams or highest single dream streak - simplified to max single streak for now)
('Streak Starter', 'Maintained a 3-day streak. Consistency is key.', 'streak', 'streak_days', 3, 110, 'https://images.unsplash.com/photo-1444491741275-3747c53c99b4?w=400&q=80'),
('Week Warrior', 'Maintained a 7-day streak. One full week of focus.', 'streak', 'streak_days', 7, 120, 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=400&q=80'),
('Habit Former', 'Maintained a 21-day streak. New neural pathways unlocked.', 'streak', 'streak_days', 21, 130, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80'),
('Monthly Master', 'Maintained a 30-day streak. A month of pure dedication.', 'streak', 'streak_days', 30, 140, 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=400&q=80'),
('Quarter Century', 'Maintained a 100-day streak. You are in the 1%.', 'streak', 'streak_days', 100, 150, 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=400&q=80'),

-- Areas Completed (Fully completed all actions in an area - might be harder to track if actions are repeating)
-- Let's stick to "Areas Created" or "Dreams Created" or simplified metrics for v1 if "Area Complete" is complex.
-- Assuming "Area Complete" means all one-off actions are done or just general progress.
-- For v1, let's track "Dreams Created" or "Dreams Completed" (archived/done)

-- Dreams
('Dreamer', 'Created your first dream.', 'dream_count', 'count_total', 1, 210, 'https://images.unsplash.com/photo-1513682121497-80211f36a7d3?w=400&q=80'),
('Visionary', 'Created 5 dreams. Expanding your horizons.', 'dream_count', 'count_total', 5, 220, 'https://images.unsplash.com/photo-1465487862906-e780cf42e6bd?w=400&q=80'),
('Architect', 'Created 10 dreams. Building a new reality.', 'dream_count', 'count_total', 10, 230, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80');

-- 4. Function to check and unlock achievements
-- This function will be called via RPC. It checks user stats against locked achievements.
-- Ideally, we'd trigger this on relevant events or calculate it.
-- For MVP, we can run a check function from the client side after key actions.

CREATE OR REPLACE FUNCTION check_new_achievements()
RETURNS TABLE (
  unlocked_id uuid,
  unlocked_title text,
  unlocked_description text,
  unlocked_image_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total_actions integer;
  v_max_streak integer;
  v_total_dreams integer;
  v_ach_id uuid;
  v_ach_title text;
  v_ach_desc text;
  v_ach_img text;
  v_new_achievement record;
BEGIN
  -- 1. Calculate Stats
  
  -- Total Actions Completed
  SELECT COUNT(*) INTO v_total_actions
  FROM action_occurrences ao
  JOIN actions a ON a.id = ao.action_id
  JOIN areas ar ON ar.id = a.area_id
  JOIN dreams d ON d.id = ar.dream_id
  WHERE d.user_id = v_user_id
    AND ao.completed_at IS NOT NULL;

  -- Max Streak (Action-based: number of consecutive completed actions)
  SELECT COALESCE(MAX(current_streak(v_user_id, d.id)), 0) INTO v_max_streak
  FROM dreams d
  WHERE d.user_id = v_user_id AND d.archived_at IS NULL;
  
  -- Total Dreams Created
  SELECT COUNT(*) INTO v_total_dreams
  FROM dreams
  WHERE user_id = v_user_id;

  -- 2. Find eligible achievements not yet unlocked
  FOR v_new_achievement IN
    SELECT 
      a.id,
      a.title,
      a.description,
      a.image_url,
      a.category,
      a.criteria_type,
      a.criteria_value
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = v_user_id
    WHERE ua.id IS NULL -- Not yet unlocked
      AND (
        (a.category = 'action_count' AND v_total_actions >= a.criteria_value) OR
        (a.category = 'streak' AND v_max_streak >= a.criteria_value) OR
        (a.category = 'dream_count' AND v_total_dreams >= a.criteria_value)
      )
  LOOP
    -- Store values in temporary variables to avoid conflict with OUT parameters
    v_ach_id := v_new_achievement.id;
    v_ach_title := v_new_achievement.title;
    v_ach_desc := v_new_achievement.description;
    v_ach_img := v_new_achievement.image_url;
    
    -- Insert into user_achievements (using the variable, not the OUT parameter)
    INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, seen)
    VALUES (v_user_id, v_ach_id, now(), false)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
    
    -- Return details for the frontend (using distinct output columns)
    unlocked_id := v_ach_id;
    unlocked_title := v_ach_title;
    unlocked_description := v_ach_desc;
    unlocked_image_url := v_ach_img;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;
