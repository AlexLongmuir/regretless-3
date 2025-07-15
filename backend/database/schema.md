# Database Schema Documentation

## Overview
This document describes the Supabase database schema for the Regretless app's backend AI services.

## Tables

### goals_v2
Stores user goals with complete timeline and context (new enhanced version).

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| user_id | uuid | Reference to auth.users | NOT NULL, FOREIGN KEY |
| title | text | User's final chosen goal title | NOT NULL |
| description | text | User's description/reason | |
| original_input | text | User's initial goal statement | NOT NULL |
| ai_suggestions | jsonb | Array of AI suggested improvements | |
| start_date | date | When user wants to start | NOT NULL |
| target_end_date | date | Target completion date | |
| duration_days | integer | Goal duration in days | |
| status | text | Goal status | NOT NULL, DEFAULT 'active' |
| category | text | Goal category (fitness, learning, etc.) | |
| experience_level | text | User's experience level | |
| constraints_notes | text | User's limitations/constraints | |
| motivation_reason | text | Why this goal matters to user | |
| images | text[] | Inspiration images for the goal | |
| schedule_preferences | jsonb | User's preferred schedule | |
| created_at | timestamptz | When goal was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When goal was last modified | NOT NULL, DEFAULT now() |

### personalization_questions_v2
Stores AI-generated questions for each goal.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| goal_id | uuid | Reference to goals_v2 table | NOT NULL, FOREIGN KEY |
| questions | jsonb | Array of question objects | NOT NULL |
| created_at | timestamptz | When questions were generated | NOT NULL, DEFAULT now() |

### user_responses_v2
Stores user answers to personalization questions.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| goal_id | uuid | Reference to goals_v2 table | NOT NULL, FOREIGN KEY |
| responses | jsonb | User's answers to questions | NOT NULL |
| created_at | timestamptz | When responses were submitted | NOT NULL, DEFAULT now() |

### action_plan_drafts_v2
Stores AI-generated action plan drafts before user approval.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| goal_id | uuid | Reference to goals_v2 table | NOT NULL, FOREIGN KEY |
| plan_data | jsonb | Complete action plan structure | NOT NULL |
| version | integer | Draft version number | NOT NULL, DEFAULT 1 |
| status | text | Draft status (pending, approved, rejected, revised) | NOT NULL, DEFAULT 'pending' |
| user_feedback | text | User's feedback on this draft | |
| ai_improvements | jsonb | AI's analysis of feedback | |
| created_at | timestamptz | When draft was generated | NOT NULL, DEFAULT now() |

### actions_v2
Stores individual action items from approved plans.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| goal_id | uuid | Reference to goals_v2 table | NOT NULL, FOREIGN KEY |
| draft_id | uuid | Reference to action_plan_drafts_v2 table | FOREIGN KEY |
| title | text | Action title | NOT NULL |
| description | text | Action description | |
| instructions | text | Detailed how-to instructions | |
| due_date | date | When action should be completed | |
| estimated_minutes | integer | Estimated time to complete | |
| frequency | text | How often to repeat | DEFAULT 'once' |
| repeat_pattern | jsonb | Complex repetition rules | |
| phase_number | integer | Which phase of the plan | |
| order_in_phase | integer | Order within phase | |
| status | text | Current status | DEFAULT 'todo' |
| completed_at | timestamptz | When marked as completed | |
| notes | text | User's notes on this action | |
| photos | text[] | Photos uploaded for this action | |
| created_at | timestamptz | When action was created | NOT NULL, DEFAULT now() |

### journal_entries_v2
Stores user's daily journal reflections.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| user_id | uuid | Reference to auth.users | NOT NULL, FOREIGN KEY |
| goal_id | uuid | Optional reference to specific goal | FOREIGN KEY |
| entry_date | date | Date of journal entry | NOT NULL |
| title | text | Entry title | NOT NULL |
| content | text | Entry content/reflection | NOT NULL |
| mood_rating | integer | Mood rating 1-5 | CHECK (mood_rating >= 1 AND mood_rating <= 5) |
| images | text[] | Photos attached to entry | |
| completed_action_ids | uuid[] | References to completed actions | |
| created_at | timestamptz | When entry was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When entry was last modified | NOT NULL, DEFAULT now() |

### plan_feedback
Stores user feedback on action plans.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| plan_id | uuid | Reference to action_plans table | NOT NULL, FOREIGN KEY |
| feedback_text | text | User's feedback on the plan | NOT NULL |
| feedback_type | text | Type of feedback (concern, request, etc.) | |
| created_at | timestamptz | When feedback was submitted | NOT NULL, DEFAULT now() |

### ai_evaluations_v2
Stores AI critic evaluations and rubric scores with outcome tracking.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| service_type | text | Which service (goal-generation, etc.) | NOT NULL |
| service_stage | text | Which stage (planner, critic, rewriter) | NOT NULL |
| goal_id | uuid | Reference to goals_v2 table for outcome tracking | FOREIGN KEY |
| action_id | uuid | Reference to actions_v2 table for outcome tracking | FOREIGN KEY |
| draft_id | uuid | Reference to action_plan_drafts_v2 table | FOREIGN KEY |
| input_data | jsonb | Input data for the evaluation | NOT NULL |
| output_data | jsonb | Generated output | NOT NULL |
| rubric_scores | jsonb | Critic scores and feedback | |
| average_score | decimal | Average rubric score | |
| passed_threshold | boolean | Whether it passed the quality threshold | |
| real_world_outcome | text | Did user complete goal/action? (success, failure, abandoned) | |
| outcome_notes | text | Additional context about the outcome | |
| created_at | timestamptz | When evaluation was performed | NOT NULL, DEFAULT now() |

## Indexes

```sql
-- Performance indexes for common queries

-- Goals V2
CREATE INDEX idx_goals_v2_user_id ON goals_v2(user_id);
CREATE INDEX idx_goals_v2_status ON goals_v2(status);
CREATE INDEX idx_goals_v2_start_date ON goals_v2(start_date);
CREATE INDEX idx_goals_v2_created_at ON goals_v2(created_at);

-- Questions and responses V2
CREATE INDEX idx_personalization_questions_v2_goal_id ON personalization_questions_v2(goal_id);
CREATE INDEX idx_user_responses_v2_goal_id ON user_responses_v2(goal_id);

-- Action plan drafts V2
CREATE INDEX idx_action_plan_drafts_v2_goal_id ON action_plan_drafts_v2(goal_id);
CREATE INDEX idx_action_plan_drafts_v2_status ON action_plan_drafts_v2(status);
CREATE INDEX idx_action_plan_drafts_v2_version ON action_plan_drafts_v2(goal_id, version);

-- Actions V2
CREATE INDEX idx_actions_v2_goal_id ON actions_v2(goal_id);
CREATE INDEX idx_actions_v2_draft_id ON actions_v2(draft_id);
CREATE INDEX idx_actions_v2_status ON actions_v2(status);
CREATE INDEX idx_actions_v2_due_date ON actions_v2(due_date);
CREATE INDEX idx_actions_v2_phase ON actions_v2(goal_id, phase_number, order_in_phase);

-- Journal entries V2
CREATE INDEX idx_journal_entries_v2_user_id ON journal_entries_v2(user_id);
CREATE INDEX idx_journal_entries_v2_goal_id ON journal_entries_v2(goal_id);
CREATE INDEX idx_journal_entries_v2_date ON journal_entries_v2(entry_date);
CREATE INDEX idx_journal_entries_v2_created_at ON journal_entries_v2(created_at);

-- Plan feedback
CREATE INDEX idx_plan_feedback_plan_id ON plan_feedback(plan_id);

-- AI evaluations V2
CREATE INDEX idx_ai_evaluations_v2_service ON ai_evaluations_v2(service_type, service_stage);
CREATE INDEX idx_ai_evaluations_v2_goal_id ON ai_evaluations_v2(goal_id);
CREATE INDEX idx_ai_evaluations_v2_outcome ON ai_evaluations_v2(real_world_outcome);
CREATE INDEX idx_ai_evaluations_v2_created_at ON ai_evaluations_v2(created_at);
```

## Row Level Security (RLS)

All tables should have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Enable RLS on all V2 tables
ALTER TABLE goals_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_questions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plan_drafts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluations_v2 ENABLE ROW LEVEL SECURITY;

-- Example policies for V2 tables
CREATE POLICY "Users can access own goals v2" ON goals_v2
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own journal entries v2" ON journal_entries_v2
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access actions v2 for their goals" ON actions_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals_v2 
      WHERE goals_v2.id = actions_v2.goal_id 
      AND goals_v2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access drafts v2 for their goals" ON action_plan_drafts_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals_v2 
      WHERE goals_v2.id = action_plan_drafts_v2.goal_id 
      AND goals_v2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access questions v2 for their goals" ON personalization_questions_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals_v2 
      WHERE goals_v2.id = personalization_questions_v2.goal_id 
      AND goals_v2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access responses v2 for their goals" ON user_responses_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals_v2 
      WHERE goals_v2.id = user_responses_v2.goal_id 
      AND goals_v2.user_id = auth.uid()
    )
  );
```

## JSON Schema Examples

### ai_suggestions (in goals_v2 table)
```json
[
  {
    "title": "Master piano fundamentals in 63 days",
    "duration_days": 63,
    "improvements": ["More focused scope", "Realistic timeline"],
    "ai_score": 8.5
  },
  {
    "title": "Complete piano challenge in 90 days", 
    "duration_days": 90,
    "improvements": ["Structured approach", "Progressive difficulty"],
    "ai_score": 7.8
  }
]
```

### schedule_preferences (in goals_v2 table)
```json
{
  "preferred_days": ["monday", "wednesday", "friday"],
  "time_blocks": [
    {
      "start_time": "07:00",
      "end_time": "08:00",
      "days": ["monday", "wednesday", "friday"]
    }
  ],
  "daily_duration_minutes": 60,
  "flexibility": "medium"
}
```

### questions
```json
[
  {
    "type": "experience",
    "question": "What experience do you have with web development?",
    "purpose": "Understanding their starting point"
  },
  {
    "type": "limitations",
    "question": "What time constraints do you face?",
    "purpose": "Identifying potential obstacles"
  },
  {
    "type": "personalization", 
    "question": "How do you prefer to learn new skills?",
    "purpose": "Tailoring the approach"
  }
]
```

### plan_data (in action_plan_drafts_v2 table)
```json
{
  "overview": "6-month web development learning plan",
  "total_timeline": "6 months",
  "phases": [
    {
      "phase_number": 1,
      "title": "HTML & CSS Foundations",
      "duration": "6 weeks",
      "objective": "Master basic web technologies",
      "actions": [
        {
          "step": 1,
          "action": "Complete HTML course on freeCodeCamp",
          "details": "Focus on semantic HTML and accessibility",
          "time_estimate": "1 week"
        }
      ],
      "milestone": "Build a responsive portfolio page"
    }
  ]
}
```

### ai_improvements (in action_plan_drafts_v2 table)
```json
{
  "feedback_analysis": {
    "key_concerns": ["Timeline too aggressive", "Missing beginner context"],
    "requested_changes": ["Extend timeline", "Add more support"]
  },
  "changes_made": [
    "Extended phase 1 from 4 to 6 weeks",
    "Added beginner-friendly resources",
    "Reduced daily time commitment"
  ],
  "improvement_score": 8.2
}
```

### repeat_pattern (in actions_v2 table)
```json
{
  "frequency": "weekly",
  "interval": 2,
  "days_of_week": ["monday", "wednesday", "friday"],
  "end_date": "2025-06-15",
  "skip_holidays": true
}
```

### completed_action_ids (in journal_entries_v2 table)
```json
[
  "uuid-of-completed-action-1",
  "uuid-of-completed-action-2",
  "uuid-of-completed-action-3"
]
```

### rubric_scores
```json
{
  "scores": {
    "clarity": 8,
    "specificity": 7,
    "achievability": 9,
    "motivation": 6
  },
  "average_score": 7.5,
  "detailed_feedback": {
    "strengths": ["Clear timeline", "Realistic scope"],
    "weaknesses": ["Could be more motivating"],
    "suggestions": ["Add personal benefit statements"]
  },
  "passes_threshold": true
}
```