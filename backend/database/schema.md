# Dreams Database Schema Documentation

## Overview
This document describes the Supabase database schema for the Regretless Dreams app (MVP v1). The schema enables users to set up dreams, break them into areas → actions, complete occurrences with photo evidence/notes, and track today, overdue, and streaks—all with strong tenant isolation.

## Core Tables

### profiles
One row per Supabase auth user (FK to auth.users).

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key, references auth.users | NOT NULL, PRIMARY KEY |
| email | text | User's email address | NOT NULL |
| display_name | text | User's display name | |
| avatar_url | text | URL to user's avatar image | |
| created_at | timestamptz | When profile was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When profile was last modified | NOT NULL, DEFAULT now() |

### dreams
User's goal container with title, start_date, optional end_date, and archive capability.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| user_id | uuid | Reference to profiles table | NOT NULL, FOREIGN KEY |
| title | text | Dream title | NOT NULL |
| description | text | Dream description | |
| start_date | date | When dream starts | NOT NULL |
| end_date | date | Optional target end date | |
| archived_at | timestamptz | When dream was archived (soft delete) | |
| created_at | timestamptz | When dream was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When dream was last modified | NOT NULL, DEFAULT now() |

### areas
Categories inside a dream with soft-delete capability.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| dream_id | uuid | Reference to dreams table | NOT NULL, FOREIGN KEY |
| title | text | Area title | NOT NULL |
| icon | text | Icon identifier for UI | |
| color | text | Hex color code for UI | |
| deleted_at | timestamptz | When area was soft-deleted | |
| created_at | timestamptz | When area was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When area was last modified | NOT NULL, DEFAULT now() |

### actions
Planned work inside an area (templates for recurring work).

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| area_id | uuid | Reference to areas table | NOT NULL, FOREIGN KEY |
| title | text | Action title | NOT NULL |
| description | text | Action description | |
| est_minutes | integer | Estimated time to complete | |
| difficulty | text | Difficulty level | NOT NULL, CHECK (difficulty IN ('easy', 'medium', 'hard')) |
| repeat_every_days | integer | How often to repeat (1/2/3) | CHECK (repeat_every_days IN (1, 2, 3)) |
| acceptance_criteria | jsonb | ≤3 bullets of criteria | CHECK (jsonb_array_length(acceptance_criteria) <= 3) |
| is_active | boolean | Whether action is active | NOT NULL, DEFAULT true |
| deleted_at | timestamptz | When action was soft-deleted | |
| created_at | timestamptz | When action was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When action was last modified | NOT NULL, DEFAULT now() |

### action_occurrences
Each scheduled/finished unit of work (instances of actions).

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| action_id | uuid | Reference to actions table | NOT NULL, FOREIGN KEY |
| planned_due_on | date | Original planned due date | NOT NULL |
| due_on | date | Mutable due date (for defers) | NOT NULL |
| defer_count | integer | Number of times deferred | NOT NULL, DEFAULT 0 |
| note | text | User's note on this occurrence | |
| completed_at | timestamptz | When occurrence was completed | |
| ai_rating | integer | AI rating 1-5 | CHECK (ai_rating >= 1 AND ai_rating <= 5) |
| ai_feedback | text | AI feedback on completion | |
| created_at | timestamptz | When occurrence was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When occurrence was last modified | NOT NULL, DEFAULT now() |

### action_artifacts
Many photos/files per occurrence with storage path and metadata.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| occurrence_id | uuid | Reference to action_occurrences table | NOT NULL, FOREIGN KEY |
| storage_path | text | Path in storage bucket | NOT NULL |
| file_name | text | Original file name | NOT NULL |
| file_size | bigint | File size in bytes | |
| mime_type | text | File MIME type | |
| metadata | jsonb | Additional file metadata | |
| created_at | timestamptz | When artifact was uploaded | NOT NULL, DEFAULT now() |

## Helper Views & Functions

### v_action_occurrence_status
Adds computed status fields to action_occurrences.

```sql
CREATE VIEW v_action_occurrence_status AS
SELECT 
  ao.*,
  CASE WHEN ao.completed_at IS NOT NULL THEN true ELSE false END as is_done,
  CASE WHEN ao.completed_at IS NULL AND ao.due_on < CURRENT_DATE THEN true ELSE false END as is_overdue,
  CASE WHEN ao.completed_at IS NULL AND ao.due_on < CURRENT_DATE 
    THEN CURRENT_DATE - ao.due_on 
    ELSE 0 
  END as overdue_days
FROM action_occurrences ao;
```

### v_dream_daily_summary
Per user/dream/day counts of completed occurrences (for charts/streaks).

```sql
CREATE VIEW v_dream_daily_summary AS
SELECT 
  d.user_id,
  d.id as dream_id,
  ao.completed_at::date as completion_date,
  COUNT(*) as completed_occurrences
FROM dreams d
JOIN areas a ON a.dream_id = d.id AND a.deleted_at IS NULL
JOIN actions act ON act.area_id = a.id AND act.deleted_at IS NULL AND act.is_active = true
JOIN action_occurrences ao ON ao.action_id = act.id AND ao.completed_at IS NOT NULL
GROUP BY d.user_id, d.id, ao.completed_at::date;
```

### v_overdue_counts
Per user/dream overdue tally.

```sql
CREATE VIEW v_overdue_counts AS
SELECT 
  d.user_id,
  d.id as dream_id,
  COUNT(*) as overdue_count
FROM dreams d
JOIN areas a ON a.dream_id = d.id AND a.deleted_at IS NULL
JOIN actions act ON act.area_id = a.id AND act.deleted_at IS NULL AND act.is_active = true
JOIN action_occurrences ao ON ao.action_id = act.id 
WHERE ao.completed_at IS NULL AND ao.due_on < CURRENT_DATE
GROUP BY d.user_id, d.id;
```

### current_streak(user_id, dream_id) → int
Rolling streak length for a specific dream.

```sql
CREATE OR REPLACE FUNCTION current_streak(p_user_id uuid, p_dream_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  streak_count integer := 0;
  current_date_check date := CURRENT_DATE;
BEGIN
  LOOP
    IF EXISTS (
      SELECT 1 FROM v_dream_daily_summary 
      WHERE user_id = p_user_id 
        AND dream_id = p_dream_id 
        AND completion_date = current_date_check
    ) THEN
      streak_count := streak_count + 1;
      current_date_check := current_date_check - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak_count;
END;
$$;
```

### defer_occurrence(occurrence_id)
Move occurrence due date +1 day (with security).

```sql
CREATE OR REPLACE FUNCTION defer_occurrence(p_occurrence_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE action_occurrences 
  SET 
    due_on = due_on + INTERVAL '1 day',
    defer_count = defer_count + 1,
    updated_at = now()
  WHERE id = p_occurrence_id
    AND EXISTS (
      SELECT 1 FROM actions act
      JOIN areas a ON a.id = act.area_id
      JOIN dreams d ON d.id = a.dream_id
      WHERE act.id = action_occurrences.action_id
        AND d.user_id = auth.uid()
    );
END;
$$;
```

## Indexes

```sql
-- Performance indexes for common queries

-- Profiles
CREATE INDEX idx_profiles_user_id ON profiles(id);

-- Dreams
CREATE INDEX idx_dreams_user_id ON dreams(user_id);
CREATE INDEX idx_dreams_archived_at ON dreams(archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_dreams_start_date ON dreams(start_date);

-- Areas
CREATE INDEX idx_areas_dream_id ON areas(dream_id);
CREATE INDEX idx_areas_deleted_at ON areas(deleted_at) WHERE deleted_at IS NULL;

-- Actions
CREATE INDEX idx_actions_area_id ON actions(area_id);
CREATE INDEX idx_actions_deleted_at ON actions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_actions_is_active ON actions(is_active) WHERE is_active = true;

-- Action occurrences (hot indexes for today/overdue queries)
CREATE INDEX idx_action_occurrences_user_due ON action_occurrences(action_id, due_on);
CREATE INDEX idx_action_occurrences_due_completed ON action_occurrences(due_on, completed_at) 
  WHERE completed_at IS NULL;
CREATE INDEX idx_action_occurrences_action_id ON action_occurrences(action_id);
CREATE INDEX idx_action_occurrences_completed_at ON action_occurrences(completed_at) 
  WHERE completed_at IS NOT NULL;

-- Action artifacts
CREATE INDEX idx_action_artifacts_occurrence_id ON action_artifacts(occurrence_id);
```

## Triggers

### handle_occurrence_complete
Auto-create next repeating occurrence when one is completed.

```sql
CREATE OR REPLACE FUNCTION handle_occurrence_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_record actions%ROWTYPE;
  next_due_date date;
  dream_end_date date;
BEGIN
  -- Only process if this is a new completion
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
    -- Get the action details
    SELECT * INTO action_record 
    FROM actions 
    WHERE id = NEW.action_id AND is_active = true AND deleted_at IS NULL;
    
    -- Only create next occurrence if action has repeat_every_days set
    IF action_record.repeat_every_days IS NOT NULL THEN
      -- Get dream end_date if it exists
      SELECT d.end_date INTO dream_end_date
      FROM dreams d
      JOIN areas a ON a.dream_id = d.id
      WHERE a.id = action_record.area_id;
      
      -- Calculate next due date
      next_due_date := NEW.planned_due_on + (action_record.repeat_every_days || ' days')::interval;
      
      -- Only create if we haven't hit the dream end_date
      IF dream_end_date IS NULL OR next_due_date <= dream_end_date THEN
        INSERT INTO action_occurrences (action_id, planned_due_on, due_on)
        VALUES (action_record.id, next_due_date, next_due_date);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_handle_occurrence_complete
  AFTER UPDATE ON action_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION handle_occurrence_complete();
```

### set_updated_at
Automatically update the updated_at timestamp.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trigger_dreams_updated_at BEFORE UPDATE ON dreams FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trigger_areas_updated_at BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trigger_actions_updated_at BEFORE UPDATE ON actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trigger_action_occurrences_updated_at BEFORE UPDATE ON action_occurrences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_artifacts ENABLE ROW LEVEL SECURITY;

-- Force RLS (prevents bypassing policies)
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE dreams FORCE ROW LEVEL SECURITY;
ALTER TABLE areas FORCE ROW LEVEL SECURITY;
ALTER TABLE actions FORCE ROW LEVEL SECURITY;
ALTER TABLE action_occurrences FORCE ROW LEVEL SECURITY;
ALTER TABLE action_artifacts FORCE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can access own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Dreams policies
CREATE POLICY "Users can access own dreams" ON dreams
  FOR ALL USING (auth.uid() = user_id);

-- Areas policies
CREATE POLICY "Users can access areas for their dreams" ON areas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM dreams 
      WHERE dreams.id = areas.dream_id 
      AND dreams.user_id = auth.uid()
    )
  );

-- Actions policies
CREATE POLICY "Users can access actions for their dreams" ON actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM areas a
      JOIN dreams d ON d.id = a.dream_id
      WHERE a.id = actions.area_id 
      AND d.user_id = auth.uid()
    )
  );

-- Action occurrences policies
CREATE POLICY "Users can access occurrences for their dreams" ON action_occurrences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM actions act
      JOIN areas a ON a.id = act.area_id
      JOIN dreams d ON d.id = a.dream_id
      WHERE act.id = action_occurrences.action_id 
      AND d.user_id = auth.uid()
    )
  );

-- Action artifacts policies
CREATE POLICY "Users can access artifacts for their dreams" ON action_artifacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM action_occurrences ao
      JOIN actions act ON act.id = ao.action_id
      JOIN areas a ON a.id = act.area_id
      JOIN dreams d ON d.id = a.dream_id
      WHERE ao.id = action_artifacts.occurrence_id 
      AND d.user_id = auth.uid()
    )
  );
```

## Storage Policies

### Storage Bucket Configuration
```sql
-- Create artifacts bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('artifacts', 'artifacts', false);

-- Storage policies for artifacts
CREATE POLICY "Users can upload artifacts for their occurrences" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'artifacts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM action_occurrences ao
      JOIN actions act ON act.id = ao.action_id
      JOIN areas a ON a.id = act.area_id
      JOIN dreams d ON d.id = a.dream_id
      WHERE ao.id::text = (storage.foldername(name))[2]
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view artifacts for their occurrences" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'artifacts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete artifacts for their occurrences" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'artifacts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Key Behaviors

### Repeat Logic
When an occurrence is completed and the action has `repeat_every_days` set:
1. Calculate next due date: `planned_due_on + repeat_every_days`
2. Check if next date exceeds dream `end_date` (if set)
3. If not, auto-insert new occurrence with same `planned_due_on` and `due_on`

### Defer Logic
When deferring an occurrence:
1. Increment `due_on` by 1 day
2. Increment `defer_count` by 1
3. Keep `planned_due_on` unchanged for analytics

### Overdue Detection
An occurrence is overdue when:
- `completed_at IS NULL` AND `due_on < CURRENT_DATE`

### Streak Calculation
Current streak for a dream:
1. Start from today and count backwards
2. For each day, check if there's ≥1 completed occurrence
3. Stop counting when a day has no completions

## JSON Schema Examples

### acceptance_criteria (in actions table)
```json
[
  "Complete 30 minutes of focused practice",
  "Record progress in practice journal",
  "Identify one area for improvement"
]
```

### metadata (in action_artifacts table)
```json
{
  "camera_info": {
    "make": "Apple",
    "model": "iPhone 14",
    "lens": "Wide"
  },
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 10
  },
  "tags": ["progress", "milestone", "before"]
}
```

## Common Queries

### Today's Actions
```sql
SELECT ao.*, act.title, a.title as area_title, d.title as dream_title
FROM action_occurrences ao
JOIN actions act ON act.id = ao.action_id
JOIN areas a ON a.id = act.area_id
JOIN dreams d ON d.id = a.dream_id
WHERE ao.due_on = CURRENT_DATE 
  AND ao.completed_at IS NULL
  AND d.user_id = auth.uid()
  AND d.archived_at IS NULL
  AND a.deleted_at IS NULL
  AND act.deleted_at IS NULL
  AND act.is_active = true;
```

### Overdue Count by Dream
```sql
SELECT d.id, d.title, COUNT(*) as overdue_count
FROM dreams d
JOIN areas a ON a.dream_id = d.id AND a.deleted_at IS NULL
JOIN actions act ON act.area_id = a.id AND act.deleted_at IS NULL AND act.is_active = true
JOIN action_occurrences ao ON ao.action_id = act.id
WHERE d.user_id = auth.uid()
  AND d.archived_at IS NULL
  AND ao.completed_at IS NULL
  AND ao.due_on < CURRENT_DATE
GROUP BY d.id, d.title;
```

### Current Streak for Dream
```sql
SELECT current_streak(auth.uid(), 'dream-uuid-here');
```