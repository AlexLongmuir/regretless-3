-- Regretless V2 Database Schema
-- Run this script in your Supabase SQL Editor to create all V2 tables
-- This creates new tables alongside existing ones to avoid conflicts

-- =====================================================
-- TABLE CREATION
-- =====================================================

-- Goals V2 Table
CREATE TABLE goals_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  original_input text NOT NULL,
  ai_suggestions jsonb,
  start_date date NOT NULL,
  target_end_date date,
  duration_days integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  category text,
  experience_level text,
  constraints_notes text,
  motivation_reason text,
  images text[],
  schedule_preferences jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Personalization Questions V2 Table
CREATE TABLE personalization_questions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals_v2(id) ON DELETE CASCADE,
  questions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User Responses V2 Table
CREATE TABLE user_responses_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals_v2(id) ON DELETE CASCADE,
  responses jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Action Plan Drafts V2 Table
CREATE TABLE action_plan_drafts_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals_v2(id) ON DELETE CASCADE,
  plan_data jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revised')),
  user_feedback text,
  ai_improvements jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Actions V2 Table
CREATE TABLE actions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals_v2(id) ON DELETE CASCADE,
  draft_id uuid REFERENCES action_plan_drafts_v2(id),
  title text NOT NULL,
  description text,
  instructions text,
  due_date date,
  estimated_minutes integer,
  frequency text DEFAULT 'once' CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  repeat_pattern jsonb,
  phase_number integer,
  order_in_phase integer,
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'skipped')),
  completed_at timestamptz,
  notes text,
  photos text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Journal Entries V2 Table
CREATE TABLE journal_entries_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  goal_id uuid REFERENCES goals_v2(id),
  entry_date date NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  mood_rating integer CHECK (mood_rating >= 1 AND mood_rating <= 5),
  images text[],
  completed_action_ids uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Plan Feedback Table (keeping same name as it doesn't conflict)
CREATE TABLE IF NOT EXISTS plan_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  feedback_text text NOT NULL,
  feedback_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AI Evaluations V2 Table
CREATE TABLE ai_evaluations_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL CHECK (service_type IN ('goal-generation', 'question-generation', 'action-planning', 'feedback-processing')),
  service_stage text NOT NULL CHECK (service_stage IN ('planner', 'critic', 'rewriter')),
  goal_id uuid REFERENCES goals_v2(id),
  action_id uuid REFERENCES actions_v2(id),
  draft_id uuid REFERENCES action_plan_drafts_v2(id),
  input_data jsonb NOT NULL,
  output_data jsonb NOT NULL,
  rubric_scores jsonb,
  average_score decimal,
  passed_threshold boolean,
  real_world_outcome text CHECK (real_world_outcome IN ('success', 'failure', 'abandoned')),
  outcome_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for tables with updated_at
CREATE TRIGGER update_goals_v2_updated_at BEFORE UPDATE ON goals_v2 FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_journal_entries_v2_updated_at BEFORE UPDATE ON journal_entries_v2 FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Goals V2 indexes
CREATE INDEX idx_goals_v2_user_id ON goals_v2(user_id);
CREATE INDEX idx_goals_v2_status ON goals_v2(status);
CREATE INDEX idx_goals_v2_start_date ON goals_v2(start_date);
CREATE INDEX idx_goals_v2_created_at ON goals_v2(created_at);

-- Questions and responses V2 indexes
CREATE INDEX idx_personalization_questions_v2_goal_id ON personalization_questions_v2(goal_id);
CREATE INDEX idx_user_responses_v2_goal_id ON user_responses_v2(goal_id);

-- Action plan drafts V2 indexes
CREATE INDEX idx_action_plan_drafts_v2_goal_id ON action_plan_drafts_v2(goal_id);
CREATE INDEX idx_action_plan_drafts_v2_status ON action_plan_drafts_v2(status);
CREATE INDEX idx_action_plan_drafts_v2_version ON action_plan_drafts_v2(goal_id, version);

-- Actions V2 indexes
CREATE INDEX idx_actions_v2_goal_id ON actions_v2(goal_id);
CREATE INDEX idx_actions_v2_draft_id ON actions_v2(draft_id);
CREATE INDEX idx_actions_v2_status ON actions_v2(status);
CREATE INDEX idx_actions_v2_due_date ON actions_v2(due_date);
CREATE INDEX idx_actions_v2_phase ON actions_v2(goal_id, phase_number, order_in_phase);

-- Journal entries V2 indexes
CREATE INDEX idx_journal_entries_v2_user_id ON journal_entries_v2(user_id);
CREATE INDEX idx_journal_entries_v2_goal_id ON journal_entries_v2(goal_id);
CREATE INDEX idx_journal_entries_v2_date ON journal_entries_v2(entry_date);
CREATE INDEX idx_journal_entries_v2_created_at ON journal_entries_v2(created_at);

-- Plan feedback indexes
CREATE INDEX IF NOT EXISTS idx_plan_feedback_plan_id ON plan_feedback(plan_id);

-- AI evaluations V2 indexes
CREATE INDEX idx_ai_evaluations_v2_service ON ai_evaluations_v2(service_type, service_stage);
CREATE INDEX idx_ai_evaluations_v2_goal_id ON ai_evaluations_v2(goal_id);
CREATE INDEX idx_ai_evaluations_v2_outcome ON ai_evaluations_v2(real_world_outcome);
CREATE INDEX idx_ai_evaluations_v2_created_at ON ai_evaluations_v2(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all V2 tables
ALTER TABLE goals_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_questions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plan_drafts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluations_v2 ENABLE ROW LEVEL SECURITY;

-- Enable RLS on plan_feedback if not already enabled
ALTER TABLE plan_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Goals V2
CREATE POLICY "Users can access own goals v2" ON goals_v2
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for Journal Entries V2
CREATE POLICY "Users can access own journal entries v2" ON journal_entries_v2
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for Actions V2
CREATE POLICY "Users can access actions v2 for their goals" ON actions_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals_v2 
      WHERE goals_v2.id = actions_v2.goal_id 
      AND goals_v2.user_id = auth.uid()
    )
  );

-- RLS Policies for Action Plan Drafts V2
CREATE POLICY "Users can access drafts v2 for their goals" ON action_plan_drafts_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals_v2 
      WHERE goals_v2.id = action_plan_drafts_v2.goal_id 
      AND goals_v2.user_id = auth.uid()
    )
  );

-- RLS Policies for Personalization Questions V2
CREATE POLICY "Users can access questions v2 for their goals" ON personalization_questions_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals_v2 
      WHERE goals_v2.id = personalization_questions_v2.goal_id 
      AND goals_v2.user_id = auth.uid()
    )
  );

-- RLS Policies for User Responses V2
CREATE POLICY "Users can access responses v2 for their goals" ON user_responses_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals_v2 
      WHERE goals_v2.id = user_responses_v2.goal_id 
      AND goals_v2.user_id = auth.uid()
    )
  );

-- RLS Policies for AI Evaluations V2 (admin/system access only for now)
CREATE POLICY "System can access all ai evaluations v2" ON ai_evaluations_v2
  FOR ALL USING (true);

-- RLS Policy for Plan Feedback (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'plan_feedback' 
    AND policyname = 'Users can access plan feedback'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can access plan feedback" ON plan_feedback FOR ALL USING (true)';
  END IF;
END
$$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE goals_v2 IS 'Enhanced goals table with timeline, images, and AI suggestions';
COMMENT ON TABLE personalization_questions_v2 IS 'AI-generated questions for goal personalization';
COMMENT ON TABLE user_responses_v2 IS 'User answers to personalization questions';
COMMENT ON TABLE action_plan_drafts_v2 IS 'AI-generated action plan drafts before user approval';
COMMENT ON TABLE actions_v2 IS 'Individual action items from approved plans';
COMMENT ON TABLE journal_entries_v2 IS 'User daily journal reflections with mood tracking';
COMMENT ON TABLE ai_evaluations_v2 IS 'AI quality evaluations with real-world outcome tracking';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify everything was created successfully:

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%_v2'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%_v2';

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE '%_v2'
ORDER BY tablename, indexname;

-- Success message
SELECT 'All V2 tables, indexes, and RLS policies created successfully!' as status;