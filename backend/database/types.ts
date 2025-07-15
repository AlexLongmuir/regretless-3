// Enhanced Database types for Supabase tables (V2)
// 
// Note: Using v2 table names to avoid conflicts with existing database tables
// Once the new codebase is live, the old tables can be dropped and these renamed

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  original_input: string;
  ai_suggestions?: AISuggestion[];
  start_date: string;
  target_end_date?: string;
  duration_days?: number;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  category?: string;
  experience_level?: string;
  constraints_notes?: string;
  motivation_reason?: string;
  images?: string[];
  schedule_preferences?: SchedulePreferences;
  created_at: string;
  updated_at: string;
}

export interface AISuggestion {
  title: string;
  duration_days: number;
  improvements: string[];
  ai_score: number;
}

export interface SchedulePreferences {
  preferred_days: string[];
  time_blocks: TimeBlock[];
  daily_duration_minutes: number;
  flexibility: 'low' | 'medium' | 'high';
}

export interface TimeBlock {
  start_time: string;
  end_time: string;
  days: string[];
}

export interface PersonalizationQuestion {
  type: 'experience' | 'limitations' | 'personalization';
  question: string;
  purpose: string;
}

export interface PersonalizationQuestions {
  id: string;
  goal_id: string;
  questions: PersonalizationQuestion[];
  created_at: string;
}

export interface UserResponse {
  question_type: 'experience' | 'limitations' | 'personalization';
  answer: string;
}

export interface UserResponses {
  id: string;
  goal_id: string;
  responses: UserResponse[];
  created_at: string;
}

export interface ActionPlanDraft {
  id: string;
  goal_id: string;
  plan_data: ActionPlanData;
  version: number;
  status: 'pending' | 'approved' | 'rejected' | 'revised';
  user_feedback?: string;
  ai_improvements?: AIImprovements;
  created_at: string;
}

export interface AIImprovements {
  feedback_analysis: {
    key_concerns: string[];
    requested_changes: string[];
  };
  changes_made: string[];
  improvement_score: number;
}

export interface ActionStep {
  step: number;
  action: string;
  details: string;
  time_estimate: string;
}

export interface ActionPhase {
  phase_number: number;
  title: string;
  duration: string;
  objective: string;
  actions: ActionStep[];
  milestone: string;
}

export interface ActionPlanData {
  overview: string;
  total_timeline: string;
  phases: ActionPhase[];
}

export interface Action {
  id: string;
  goal_id: string;
  draft_id?: string;
  title: string;
  description?: string;
  instructions?: string;
  due_date?: string;
  estimated_minutes?: number;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  repeat_pattern?: RepeatPattern;
  phase_number?: number;
  order_in_phase?: number;
  status: 'todo' | 'in_progress' | 'completed' | 'skipped';
  completed_at?: string;
  notes?: string;
  photos?: string[];
  created_at: string;
}

export interface RepeatPattern {
  frequency: string;
  interval: number;
  days_of_week?: string[];
  end_date?: string;
  skip_holidays?: boolean;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  goal_id?: string;
  entry_date: string;
  title: string;
  content: string;
  mood_rating: number;
  images?: string[];
  completed_action_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface PlanFeedback {
  id: string;
  plan_id: string;
  feedback_text: string;
  feedback_type?: string;
  created_at: string;
}

export interface RubricScores {
  [key: string]: number;
}

export interface DetailedFeedback {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface CriticEvaluation {
  scores: RubricScores;
  average_score: number;
  detailed_feedback: DetailedFeedback;
  passes_threshold: boolean;
}

export interface AIEvaluation {
  id: string;
  service_type: 'goal-generation' | 'question-generation' | 'action-planning' | 'feedback-processing';
  service_stage: 'planner' | 'critic' | 'rewriter';
  goal_id?: string;
  action_id?: string;
  draft_id?: string;
  input_data: any;
  output_data: any;
  rubric_scores?: CriticEvaluation;
  average_score?: number;
  passed_threshold?: boolean;
  real_world_outcome?: 'success' | 'failure' | 'abandoned';
  outcome_notes?: string;
  created_at: string;
}

// Input/Output types for each service

export interface GoalGenerationInput {
  original_goal: string;
}

export interface GoalGenerationOutput {
  improved_goal: string;
  key_improvements: string[];
  success_metrics: string[];
  timeline: string;
}

export interface QuestionGenerationInput {
  goal: string;
}

export interface QuestionGenerationOutput {
  questions: PersonalizationQuestion[];
  goal_context: string;
}

export interface ActionPlanningInput {
  goal: string;
  user_responses: UserResponse[];
}

export interface ActionPlanningOutput {
  action_plan: ActionPlanData;
  personalization_notes: string[];
  success_tracking: string[];
}

export interface FeedbackProcessingInput {
  original_plan: ActionPlanData;
  user_feedback: string;
  goal: string;
  user_responses: UserResponse[];
}

export interface FeedbackAnalysis {
  key_concerns: string[];
  requested_changes: string[];
  underlying_needs: string[];
}

export interface FeedbackProcessingOutput {
  feedback_analysis: FeedbackAnalysis;
  updated_action_plan: ActionPlanData;
  changes_made: string[];
  rationale: string[];
  preserved_elements: string[];
}

// Database configuration types for V2 tables
export interface Database {
  public: {
    Tables: {
      goals_v2: {
        Row: Goal;
        Insert: Omit<Goal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at'>>;
      };
      personalization_questions_v2: {
        Row: PersonalizationQuestions;
        Insert: Omit<PersonalizationQuestions, 'id' | 'created_at'>;
        Update: Partial<Omit<PersonalizationQuestions, 'id' | 'created_at'>>;
      };
      user_responses_v2: {
        Row: UserResponses;
        Insert: Omit<UserResponses, 'id' | 'created_at'>;
        Update: Partial<Omit<UserResponses, 'id' | 'created_at'>>;
      };
      action_plan_drafts_v2: {
        Row: ActionPlanDraft;
        Insert: Omit<ActionPlanDraft, 'id' | 'created_at'>;
        Update: Partial<Omit<ActionPlanDraft, 'id' | 'created_at'>>;
      };
      actions_v2: {
        Row: Action;
        Insert: Omit<Action, 'id' | 'created_at'>;
        Update: Partial<Omit<Action, 'id' | 'created_at'>>;
      };
      journal_entries_v2: {
        Row: JournalEntry;
        Insert: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>>;
      };
      plan_feedback: {
        Row: PlanFeedback;
        Insert: Omit<PlanFeedback, 'id' | 'created_at'>;
        Update: Partial<Omit<PlanFeedback, 'id' | 'created_at'>>;
      };
      ai_evaluations_v2: {
        Row: AIEvaluation;
        Insert: Omit<AIEvaluation, 'id' | 'created_at'>;
        Update: Partial<Omit<AIEvaluation, 'id' | 'created_at'>>;
      };
    };
  };
}