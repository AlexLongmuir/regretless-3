import type { PostgrestError } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Skill Type
export type SkillType = 
  | 'Fitness'
  | 'Strength'
  | 'Nutrition'
  | 'Writing'
  | 'Learning'
  | 'Languages'
  | 'Music'
  | 'Creativity'
  | 'Business'
  | 'Marketing'
  | 'Sales'
  | 'Mindfulness'
  | 'Communication'
  | 'Finance'
  | 'Travel'
  | 'Career'
  | 'Coding';

export interface Profile {
  user_id: string;
  username: string;
  theme_mode: 'light' | 'dark' | 'system';
  figurine_url?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  daily_reminders: boolean;
  reminder_time: string; // Time string like '09:00:00'
  overdue_alerts: boolean;
  achievement_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dream {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date?: string; // Date string YYYY-MM-DD
  end_date?: string; // Date string YYYY-MM-DD
  activated_at?: string;
  completed_at?: string;
  image_url?: string;
  baseline?: string;
  obstacles?: string;
  enjoyment?: string;
  time_commitment?: { hours: number; minutes: number };
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CelebrityProfile {
  id: string;
  name: string;
  image_url?: string;
  description?: string;
  category?: string;
  created_at: string;
}

export interface AIGeneratedDream {
  id: string;
  user_id: string;
  search_id: string;
  title: string;
  emoji?: string;
  source_type: 'celebrity' | 'dreamboard';
  source_data?: Json;
  created_at: string;
}

export interface OnboardingSession {
  session_id: string;
  device_id?: string;
  data: Json;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  dream_id: string;
  user_id: string;
  title: string;
  icon?: string; // DEPRECATED: identifier for icon
  image_url?: string; // URL for AI generated figurine
  color?: string; // Hex color code
  position: number;
  approved_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AcceptanceCriterion {
  title: string;
  description: string;
}

export interface Action {
  id: string;
  user_id: string;
  dream_id: string;
  area_id: string;
  title: string;
  est_minutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  repeat_every_days?: 1 | 2 | 3;
  repeat_until_date?: string;
  slice_count_target?: number;
  acceptance_criteria?: AcceptanceCriterion[];
  acceptance_intro?: string;
  acceptance_outro?: string;
  position: number;
  is_active: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  primary_skill?: SkillType;
  secondary_skill?: SkillType;
}

export interface ActionOccurrence {
  id: string;
  action_id: string;
  dream_id: string;
  area_id: string;
  user_id: string;
  occurrence_no: number;
  planned_due_on?: string; // Date string YYYY-MM-DD
  due_on?: string; // Date string YYYY-MM-DD
  defer_count: number;
  note?: string;
  completed_at?: string;
  ai_rating?: number; // 1-5
  ai_feedback?: string;
  xp_gained?: number;
  created_at: string;
  updated_at: string;
}

export interface ActionArtifact {
  id: string;
  occurrence_id: string;
  user_id: string;
  kind: 'photo' | 'document';
  storage_path: string;
  file_name: string;
  file_size_bytes?: number;
  file_size?: number; // Alternative name sometimes used
  mime_type?: string;
  metadata?: Json;
  created_at: string;
}

export interface AIEvent {
  id: string;
  user_id: string;
  kind: string;
  model: string;
  prompt_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  latency_ms?: number;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  rc_app_user_id: string;
  rc_original_app_user_id?: string;
  entitlement: string;
  product_id: string;
  store: 'app_store' | 'play_store' | 'stripe';
  is_active: boolean;
  is_trial: boolean;
  will_renew: boolean;
  current_period_end: string;
  original_purchase_at?: string;
  rc_snapshot: Json;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'action_count' | 'streak' | 'dream_count' | 'area_count';
  criteria_type: string;
  criteria_value: number;
  image_url?: string;
  locked_image_url?: string;
  hidden: boolean;
  position: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  seen: boolean;
  progress: number;
  metadata: Json;
  created_at: string;
}

export interface AchievementUnlockResult {
  achievement_id: string;
  title: string;
  description: string;
  image_url: string;
}

export interface UserXp {
  id: string;
  user_id: string;
  skill: SkillType;
  xp: number;
  created_at: string;
  updated_at: string;
}

// Function return types
export type CurrentStreakResult = number;

// Database configuration types for Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      notification_preferences: {
        Row: NotificationPreferences;
        Insert: Omit<NotificationPreferences, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<NotificationPreferences, 'id' | 'created_at' | 'updated_at'>>;
      };
      dreams: {
        Row: Dream;
        Insert: Omit<Dream, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Dream, 'id' | 'created_at' | 'updated_at'>>;
      };
      celebrity_profiles: {
        Row: CelebrityProfile;
        Insert: Omit<CelebrityProfile, 'id' | 'created_at'>;
        Update: Partial<Omit<CelebrityProfile, 'id' | 'created_at'>>;
      };
      ai_generated_dreams: {
        Row: AIGeneratedDream;
        Insert: Omit<AIGeneratedDream, 'id' | 'created_at'>;
        Update: Partial<Omit<AIGeneratedDream, 'id' | 'created_at'>>;
      };
      onboarding_sessions: {
        Row: OnboardingSession;
        Insert: Omit<OnboardingSession, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<OnboardingSession, 'created_at' | 'updated_at'>>;
      };
      areas: {
        Row: Area;
        Insert: Omit<Area, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Area, 'id' | 'created_at' | 'updated_at'>>;
      };
      actions: {
        Row: Action;
        Insert: Omit<Action, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Action, 'id' | 'created_at' | 'updated_at'>>;
      };
      action_occurrences: {
        Row: ActionOccurrence;
        Insert: Omit<ActionOccurrence, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ActionOccurrence, 'id' | 'created_at' | 'updated_at'>>;
      };
      action_artifacts: {
        Row: ActionArtifact;
        Insert: Omit<ActionArtifact, 'id' | 'created_at'>;
        Update: Partial<Omit<ActionArtifact, 'id' | 'created_at'>>;
      };
      ai_events: {
        Row: AIEvent;
        Insert: Omit<AIEvent, 'id' | 'created_at'>;
        Update: Partial<Omit<AIEvent, 'id' | 'created_at'>>;
      };
      user_subscriptions: {
        Row: UserSubscription;
        Insert: Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'>>;
      };
      achievements: {
        Row: Achievement;
        Insert: Omit<Achievement, 'id' | 'created_at'>;
        Update: Partial<Omit<Achievement, 'id' | 'created_at'>>;
      };
      user_achievements: {
        Row: UserAchievement;
        Insert: Omit<UserAchievement, 'id' | 'created_at'>;
        Update: Partial<Omit<UserAchievement, 'id' | 'created_at'>>;
      };
      user_xp: {
        Row: UserXp;
        Insert: Omit<UserXp, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserXp, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      v_action_occurrence_status: {
        Row: ActionOccurrence & {
          is_done: boolean;
          is_overdue: boolean;
          overdue_days: number;
        };
      };
      v_active_actions: {
        Row: Action & {
          area_title: string;
          area_icon?: string;
          area_color?: string;
          dream_id: string;
          dream_title: string;
          user_id: string;
        };
      };
      v_active_areas: {
        Row: Area & {
          dream_id: string;
          dream_title: string;
          user_id: string;
        };
      };
      v_dream_daily_summary: {
        Row: {
          user_id: string;
          dream_id: string;
          completion_date: string;
          completed_occurrences: number;
        };
      };
      v_overdue_counts: {
        Row: {
          user_id: string;
          dream_id: string;
          overdue_count: number;
        };
      };
      v_user_levels: {
        Row: {
          user_id: string;
          skill: SkillType;
          xp: number;
          level: number;
        };
      };
      v_user_overall_level: {
        Row: {
          user_id: string;
          total_xp: number;
          overall_level: number;
        };
      };
    };
    Functions: {
      current_streak: {
        Args: { p_user_id: string; p_dream_id: string };
        Returns: number;
      };
      defer_occurrence: {
        Args: { p_occurrence_id: string };
        Returns: void;
      };
      check_new_achievements: {
        Args: Record<string, never>;
        Returns: {
          achievement_id: string;
          title: string;
          description: string;
          image_url: string;
        }[];
      };
    };
  };
}

// Common query result types
export interface TodayAction {
  id: string;
  action_id: string;
  occurrence_no: number;
  planned_due_on: string;
  due_on: string;
  defer_count: number;
  note?: string;
  completed_at?: string;
  ai_rating?: number;
  ai_feedback?: string;
  xp_gained?: number;
  action_title: string;
  est_minutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  area_title: string;
  area_icon?: string;
  dream_title: string;
  dream_description?: string;
  is_done: boolean;
  is_overdue: boolean;
  overdue_days: number;
  primary_skill?: SkillType;
  secondary_skill?: SkillType;
}

export interface DreamWithStats {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  activated_at?: string;
  completed_at?: string;
  image_url?: string;
  baseline?: string;
  obstacles?: string;
  enjoyment?: string;
  time_commitment?: { hours: number; minutes: number };
  archived_at?: string;
  created_at: string;
  updated_at: string;
  streak: number;
  overdue_count: number;
  areas: Area[];
  actions: Action[];
}

export interface AreaWithActions {
  id: string;
  dream_id: string;
  user_id: string;
  title: string;
  icon?: string;
  image_url?: string;
  color?: string;
  position: number;
  approved_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  actions: Action[];
  overdue_count?: number;
}

export interface ActionWithOccurrences {
  id: string;
  user_id: string;
  dream_id: string;
  area_id: string;
  title: string;
  est_minutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  repeat_every_days?: 1 | 2 | 3;
  slice_count_target?: number;
  acceptance_criteria?: string[]; // Note: Legacy, actual type in Action is AcceptanceCriterion[]
  acceptance_intro?: string;
  acceptance_outro?: string;
  position: number;
  is_active: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  occurrences: ActionOccurrence[];
  next_due?: string;
  overdue_count?: number;
  primary_skill?: SkillType;
  secondary_skill?: SkillType;
}

// Frontend action interface that includes due_date for UI convenience
export interface ActionWithDueDate extends Action {
  due_date?: string
}

// Storage types
export interface ArtifactUpload {
  occurrence_id: string;
  file: any; // Blob or File or RN file object
}
