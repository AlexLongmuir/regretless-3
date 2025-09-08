// Dreams Database types for Supabase tables (MVP v1)
// 
// Core model: profiles → dreams → areas → actions → action_occurrences → action_artifacts
// Strong tenant isolation with RLS policies

export interface Profile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Dream {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  dream_id: string;
  title: string;
  icon?: string;
  color?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: string;
  area_id: string;
  title: string;
  description?: string;
  est_minutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  repeat_every_days?: 1 | 2 | 3;
  acceptance_criteria?: string[];
  is_active: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionOccurrence {
  id: string;
  action_id: string;
  planned_due_on: string;
  due_on: string;
  defer_count: number;
  note?: string;
  completed_at?: string;
  ai_rating?: number;
  ai_feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionArtifact {
  id: string;
  occurrence_id: string;
  storage_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Helper view types
export interface ActionOccurrenceStatus extends ActionOccurrence {
  is_done: boolean;
  is_overdue: boolean;
  overdue_days: number;
}

export interface DreamDailySummary {
  user_id: string;
  dream_id: string;
  completion_date: string;
  completed_occurrences: number;
}

export interface OverdueCounts {
  user_id: string;
  dream_id: string;
  overdue_count: number;
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
      dreams: {
        Row: Dream;
        Insert: Omit<Dream, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Dream, 'id' | 'created_at' | 'updated_at'>>;
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
    };
    Views: {
      v_action_occurrence_status: {
        Row: ActionOccurrenceStatus;
      };
      v_dream_daily_summary: {
        Row: DreamDailySummary;
      };
      v_overdue_counts: {
        Row: OverdueCounts;
      };
    };
    Functions: {
      current_streak: {
        Args: {
          p_user_id: string;
          p_dream_id: string;
        };
        Returns: CurrentStreakResult;
      };
      defer_occurrence: {
        Args: {
          p_occurrence_id: string;
        };
        Returns: void;
      };
    };
  };
}

// Common query result types
export interface TodayAction {
  id: string;
  action_id: string;
  planned_due_on: string;
  due_on: string;
  defer_count: number;
  note?: string;
  completed_at?: string;
  ai_rating?: number;
  ai_feedback?: string;
  action_title: string;
  action_description?: string;
  est_minutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  area_title: string;
  area_icon?: string;
  area_color?: string;
  dream_title: string;
  dream_description?: string;
  is_done: boolean;
  is_overdue: boolean;
  overdue_days: number;
}

export interface DreamWithStats {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  overdue_count?: number;
  current_streak?: number;
  total_areas?: number;
  total_actions?: number;
  completed_today?: number;
}

export interface AreaWithActions {
  id: string;
  dream_id: string;
  title: string;
  icon?: string;
  color?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  actions: Action[];
  overdue_count?: number;
}

export interface ActionWithOccurrences {
  id: string;
  area_id: string;
  title: string;
  description?: string;
  est_minutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  repeat_every_days?: 1 | 2 | 3;
  acceptance_criteria?: string[];
  is_active: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  occurrences: ActionOccurrence[];
  next_due?: string;
  overdue_count?: number;
}

// Storage types
export interface ArtifactUpload {
  occurrence_id: string;
  file: File;
  metadata?: Record<string, any>;
}

export interface ArtifactMetadata {
  camera_info?: {
    make?: string;
    model?: string;
    lens?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  tags?: string[];
  [key: string]: any;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// Filter and sort types
export interface DreamFilters {
  archived?: boolean;
  start_date_from?: string;
  start_date_to?: string;
  has_end_date?: boolean;
}

export interface ActionFilters {
  difficulty?: ('easy' | 'medium' | 'hard')[];
  is_active?: boolean;
  has_repeat?: boolean;
  area_id?: string;
}

export interface OccurrenceFilters {
  status?: ('todo' | 'completed' | 'overdue')[];
  due_date_from?: string;
  due_date_to?: string;
  dream_id?: string;
  area_id?: string;
  action_id?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Form types
export interface CreateDreamForm {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
}

export interface CreateAreaForm {
  title: string;
  icon?: string;
  color?: string;
}

export interface CreateActionForm {
  title: string;
  description?: string;
  est_minutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  repeat_every_days?: 1 | 2 | 3;
  acceptance_criteria?: string[];
}

export interface UpdateOccurrenceForm {
  note?: string;
  completed_at?: string;
  ai_rating?: number;
  ai_feedback?: string;
}

// Analytics types
export interface DreamProgress {
  dream_id: string;
  dream_title: string;
  total_actions: number;
  completed_actions: number;
  completion_rate: number;
  current_streak: number;
  longest_streak: number;
  overdue_count: number;
  last_activity?: string;
}

export interface DailyProgress {
  date: string;
  completed_occurrences: number;
  total_occurrences: number;
  completion_rate: number;
  dreams_active: number;
}

export interface StreakData {
  current: number;
  longest: number;
  history: {
    date: string;
    completed: boolean;
  }[];
}