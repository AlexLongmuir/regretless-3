# Dreams Database Schema Documentation

## Overview
This document describes the Supabase database schema for the Dreamer Dreams app (MVP v1). The schema enables users to set up dreams, break them into areas → actions, complete occurrences with photo evidence/notes, and track today, overdue, and streaks—all with strong tenant isolation.

## Core Tables

### profiles
One row per Supabase auth user (FK to auth.users).

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| user_id | uuid | Primary key, references auth.users | NOT NULL, PRIMARY KEY |
| username | text | User's username | NOT NULL, UNIQUE |
| created_at | timestamptz | When profile was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When profile was last modified | NOT NULL, DEFAULT now() |

### dreams
User's goal container with title, start_date, optional end_date, and archive capability.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| user_id | uuid | Reference to profiles table | NOT NULL, FOREIGN KEY REFERENCES profiles(user_id) |
| title | text | Dream title | NOT NULL |
| description | text | Dream description | |
| start_date | date | When dream starts | |
| end_date | date | Optional target end date | |
| activated_at | timestamptz | When dream was activated (moved from draft) | |
| completed_at | timestamptz | When dream was completed (all actions done) | |
| image_url | text | URL to dream cover image | |
| baseline | text | User's current baseline state | |
| obstacles | text | Potential obstacles identified | |
| enjoyment | text | What user enjoys about this dream | |
| time_commitment | jsonb | Daily time commitment in format {"hours": number, "minutes": number} | |
| archived_at | timestamptz | When dream was archived (soft delete) | |
| created_at | timestamptz | When dream was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When dream was last modified | NOT NULL, DEFAULT now() |

### areas
Categories inside a dream with soft-delete capability.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| dream_id | uuid | Reference to dreams table | NOT NULL, FOREIGN KEY |
| user_id | uuid | Reference to profiles table | NOT NULL, FOREIGN KEY |
| title | text | Area title | NOT NULL |
| icon | text | Icon identifier for UI | |
| color | text | Hex color code for UI | |
| position | integer | Position within dream | NOT NULL |
| approved_at | timestamptz | When area was approved (locked) | |
| deleted_at | timestamptz | When area was soft-deleted | |
| created_at | timestamptz | When area was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When area was last modified | NOT NULL, DEFAULT now() |

### actions
Planned work inside an area (templates for recurring work).

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| area_id | uuid | Reference to areas table | NOT NULL, FOREIGN KEY |
| dream_id | uuid | Reference to dreams table | NOT NULL, FOREIGN KEY |
| user_id | uuid | Reference to profiles table | NOT NULL, FOREIGN KEY |
| title | text | Action title | NOT NULL |
| description | text | Action description | |
| est_minutes | integer | Estimated time to complete | |
| difficulty | difficulty | Difficulty level | NOT NULL, CHECK (difficulty IN ('easy', 'medium', 'hard')) |
| repeat_every_days | integer | How often to repeat (1/2/3) | CHECK (repeat_every_days IN (1, 2, 3)) |
| slice_count_target | integer | Target number of slices for finite actions | |
| acceptance_criteria | jsonb | ≤3 bullets of criteria | CHECK (jsonb_array_length(acceptance_criteria) <= 3) |
| is_active | boolean | Whether action is active | NOT NULL, DEFAULT true |
| position | integer | Position within area | NOT NULL |
| deleted_at | timestamptz | When action was soft-deleted | |
| created_at | timestamptz | When action was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When action was last modified | NOT NULL, DEFAULT now() |

### action_occurrences
Each scheduled/finished unit of work (instances of actions).

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| action_id | uuid | Reference to actions table | NOT NULL, FOREIGN KEY |
| dream_id | uuid | Reference to dreams table | NOT NULL, FOREIGN KEY |
| area_id | uuid | Reference to areas table | NOT NULL, FOREIGN KEY |
| user_id | uuid | Reference to profiles table | NOT NULL, FOREIGN KEY |
| occurrence_no | integer | Sequence number within action | NOT NULL, CHECK (occurrence_no > 0) |
| planned_due_on | date | Original planned due date | |
| due_on | date | Mutable due date (for defers) | |
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
| user_id | uuid | Reference to profiles table | NOT NULL, FOREIGN KEY |
| kind | artifact_type | Type of artifact (e.g., 'photo', 'document') | NOT NULL |
| storage_path | text | Path in storage bucket | NOT NULL |
| file_name | text | Original file name | NOT NULL |
| file_size_bytes | integer | File size in bytes | |
| file_size | bigint | File size in bytes (alternative) | |
| mime_type | text | File MIME type | |
| metadata | jsonb | Additional file metadata | |
| created_at | timestamptz | When artifact was uploaded | NOT NULL, DEFAULT now() |

### ai_events
AI usage tracking and telemetry for monitoring costs and performance.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| user_id | uuid | Reference to profiles table | NOT NULL, FOREIGN KEY REFERENCES profiles(user_id) |
| kind | text | Type of AI operation | NOT NULL |
| model | text | AI model used | NOT NULL |
| prompt_tokens | integer | Number of input tokens | |
| output_tokens | integer | Number of output tokens | |
| total_tokens | integer | Total tokens used | |
| latency_ms | integer | Request latency in milliseconds | |
| created_at | timestamptz | When event was recorded | NOT NULL, DEFAULT now() |
### celebrity_profiles
Default catalog of celebrities for inspiration.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| name | text | Celebrity name | NOT NULL |
| image_url | text | Storage path or absolute URL | |
| description | text | Optional description | |
| category | text | Category like "Athlete", "Entrepreneur" | |
| created_at | timestamptz | Created timestamp | NOT NULL, DEFAULT now() |

RLS: Public SELECT policy to allow read by anyone.

### ai_generated_dreams
AI-generated dream suggestions per user, grouped per search via `search_id`.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| user_id | uuid | Owner user id | NOT NULL, FK auth.users(id) |
| search_id | uuid | Group id for a single generation/search | NOT NULL |
| title | text | Dream title | NOT NULL |
| emoji | text | Optional emoji | |
| source_type | text | 'celebrity' or 'dreamboard' | NOT NULL, CHECK |
| source_data | jsonb | Context payload (e.g., {"query_label":"Leo"} or {"image_url":"..."}) | |
| created_at | timestamptz | Created timestamp | NOT NULL, DEFAULT now() |

RLS: Users can SELECT/INSERT only their own rows.

Indexes:
 - `(user_id, created_at DESC)` for recency queries
 - `(source_type)` for filtering
 - `(search_id)` for grouping

### notification_preferences
User notification settings and preferences.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| user_id | uuid | Reference to profiles table | NOT NULL, FOREIGN KEY REFERENCES profiles(user_id) ON DELETE CASCADE |
| push_enabled | boolean | Whether push notifications are enabled | NOT NULL, DEFAULT true |
| daily_reminders | boolean | Whether daily reminders are enabled | NOT NULL, DEFAULT true |
| reminder_time | time | Time to send daily reminders | NOT NULL, DEFAULT '09:00:00' |
| overdue_alerts | boolean | Whether overdue task alerts are enabled | NOT NULL, DEFAULT true |
| achievement_notifications | boolean | Whether achievement notifications are enabled | NOT NULL, DEFAULT true |
| created_at | timestamptz | When preferences were created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When preferences were last modified | NOT NULL, DEFAULT now() |

### user_subscriptions
RevenueCat subscription data for user access control and billing management. Supports separate entries for trials and paid subscriptions.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | uuid | Primary key | NOT NULL, PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id | uuid | References auth.users | NOT NULL, FOREIGN KEY REFERENCES auth.users(id) ON DELETE CASCADE |
| rc_app_user_id | text | RevenueCat app user ID | NOT NULL |
| rc_original_app_user_id | text | Original RevenueCat app user ID | |
| entitlement | text | User's entitlement level | NOT NULL, DEFAULT 'pro' |
| product_id | text | Product identifier | NOT NULL |
| store | text | Store where subscription was purchased | NOT NULL, DEFAULT 'app_store', CHECK (store IN ('app_store','play_store','stripe')) |
| is_active | boolean | Whether subscription is currently active | NOT NULL |
| is_trial | boolean | Whether subscription is in trial period | NOT NULL |
| will_renew | boolean | Whether subscription will auto-renew | NOT NULL |
| current_period_end | timestamptz | When current period ends | NOT NULL |
| original_purchase_at | timestamptz | When subscription was originally purchased | |
| rc_snapshot | jsonb | Full RevenueCat subscription snapshot | NOT NULL |
| created_at | timestamptz | When subscription record was created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | When subscription record was last modified | NOT NULL, DEFAULT now() |

**SQL Setup:**
```sql
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  daily_reminders boolean NOT NULL DEFAULT true,
  reminder_time time NOT NULL DEFAULT '09:00:00',
  overdue_alerts boolean NOT NULL DEFAULT true,
  achievement_notifications boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can access own notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Add trigger for updated_at
CREATE TRIGGER trigger_notification_preferences_updated_at 
  BEFORE UPDATE ON notification_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION set_updated_at();

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
```

**SQL Setup:**
```sql
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rc_app_user_id text NOT NULL,
  rc_original_app_user_id text,
  entitlement text NOT NULL DEFAULT 'pro',
  product_id text NOT NULL,
  store text NOT NULL DEFAULT 'app_store' CHECK (store IN ('app_store','play_store','stripe')),
  is_active boolean NOT NULL,
  is_trial boolean NOT NULL,
  will_renew boolean NOT NULL,
  current_period_end timestamptz NOT NULL,
  original_purchase_at timestamptz,
  rc_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique constraint for active subscriptions per user
CREATE UNIQUE INDEX ux_user_subscriptions_active_user 
  ON public.user_subscriptions (user_id) 
  WHERE is_active = true;

-- Create index for RevenueCat app user ID lookups
CREATE UNIQUE INDEX ux_user_subscriptions_rc_app_user_id 
  ON public.user_subscriptions (rc_app_user_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Set permissions
REVOKE ALL ON TABLE public.user_subscriptions FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_subscriptions TO authenticated;
GRANT ALL ON TABLE public.user_subscriptions TO service_role;

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions FORCE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Read own user_subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Insert own user_subscriptions"
  ON public.user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own user_subscriptions"
  ON public.user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

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

### v_active_actions
Active actions with their area and dream context.

```sql
CREATE VIEW v_active_actions AS
SELECT 
  act.*,
  a.title as area_title,
  a.icon as area_icon,
  a.color as area_color,
  d.id as dream_id,
  d.title as dream_title,
  d.user_id
FROM actions act
JOIN areas a ON a.id = act.area_id AND a.deleted_at IS NULL
JOIN dreams d ON d.id = a.dream_id AND d.archived_at IS NULL
WHERE act.deleted_at IS NULL AND act.is_active = true;
```

### v_active_areas
Active areas with their dream context.

```sql
CREATE VIEW v_active_areas AS
SELECT 
  a.*,
  d.id as dream_id,
  d.title as dream_title,
  d.user_id
FROM areas a
JOIN dreams d ON d.id = a.dream_id AND d.archived_at IS NULL
WHERE a.deleted_at IS NULL;
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

**Note:** This view may not exist in the current database. The `current_streak` function now queries the tables directly instead of using this view.

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
Rolling streak length for a specific dream. The streak is maintained from the most recent completion date until it's actually broken by missing a day.

```sql
CREATE OR REPLACE FUNCTION current_streak(p_user_id uuid, p_dream_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  streak_count integer := 0;
  current_date_check date;
  most_recent_completion date;
BEGIN
  -- Find the most recent completion date for this dream
  SELECT MAX(completed_at::date) INTO most_recent_completion
  FROM action_occurrences ao
  JOIN actions act ON act.id = ao.action_id
  JOIN areas a ON a.id = act.area_id
  JOIN dreams d ON d.id = a.dream_id
  WHERE d.user_id = p_user_id 
    AND d.id = p_dream_id
    AND ao.completed_at IS NOT NULL
    AND a.deleted_at IS NULL
    AND act.deleted_at IS NULL
    AND act.is_active = true
    AND d.archived_at IS NULL;
  
  -- If no completions found, return 0
  IF most_recent_completion IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Start counting from the most recent completion date
  current_date_check := most_recent_completion;
  
  -- Count consecutive days backwards from the most recent completion
  LOOP
    IF EXISTS (
      SELECT 1 FROM action_occurrences ao
      JOIN actions act ON act.id = ao.action_id
      JOIN areas a ON a.id = act.area_id
      JOIN dreams d ON d.id = a.dream_id
      WHERE d.user_id = p_user_id 
        AND d.id = p_dream_id
        AND ao.completed_at::date = current_date_check
        AND a.deleted_at IS NULL
        AND act.deleted_at IS NULL
        AND act.is_active = true
        AND d.archived_at IS NULL
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
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Dreams
CREATE INDEX idx_dreams_user_id ON dreams(user_id);
CREATE INDEX idx_dreams_archived_at ON dreams(archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_dreams_start_date ON dreams(start_date);
CREATE INDEX idx_dreams_user_activated ON dreams(user_id, activated_at);

-- Areas
CREATE INDEX idx_areas_dream_id ON areas(dream_id);
CREATE INDEX idx_areas_deleted_at ON areas(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_areas_dream_approved ON areas(dream_id, approved_at);

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
CREATE INDEX idx_occ_user_due_open ON action_occurrences(user_id, due_on)
  WHERE completed_at IS NULL;
CREATE INDEX idx_occ_by_action_no ON action_occurrences(action_id, occurrence_no);

-- Action artifacts
CREATE INDEX idx_action_artifacts_occurrence_id ON action_artifacts(occurrence_id);

-- AI events
CREATE INDEX idx_ai_events_user_id ON ai_events(user_id);
CREATE INDEX idx_ai_events_created_at ON ai_events(created_at);
CREATE INDEX idx_ai_events_kind ON ai_events(kind);

-- Notification preferences
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- User subscriptions
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_rc_app_user_id ON user_subscriptions(rc_app_user_id);
CREATE INDEX idx_user_subscriptions_is_active ON user_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_subscriptions_is_trial ON user_subscriptions(is_trial) WHERE is_trial = true;
CREATE INDEX idx_user_subscriptions_user_active ON user_subscriptions(user_id, is_active) WHERE is_active = true;

-- Unique constraints for ordering (ignores soft-deleted rows)
CREATE UNIQUE INDEX ux_areas_position_live ON areas(user_id, dream_id, position)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX ux_actions_position_live ON actions(user_id, area_id, position)
  WHERE deleted_at IS NULL;

-- Unique constraint for occurrence sequence per action
ALTER TABLE action_occurrences ADD CONSTRAINT uq_action_occurrence UNIQUE (action_id, occurrence_no);
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
  next_occurrence_no integer;
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
        -- Get the next occurrence number for this action
        SELECT COALESCE(MAX(occurrence_no), 0) + 1 INTO next_occurrence_no
        FROM action_occurrences 
        WHERE action_id = action_record.id;
        
        INSERT INTO action_occurrences (action_id, occurrence_no, planned_due_on, due_on)
        VALUES (action_record.id, next_occurrence_no, next_due_date, next_due_date);
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
CREATE TRIGGER trigger_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## Utility Functions

### soft_delete_area(area_id)
Atomically soft-delete an area and all its actions.

```sql
CREATE OR REPLACE FUNCTION public.soft_delete_area(p_area_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- mark area deleted (respecting RLS via auth.uid())
  UPDATE public.areas
     SET deleted_at = NOW()
   WHERE id = p_area_id
     AND user_id = auth.uid()
     AND deleted_at IS NULL;

  -- cascade soft-delete actions in that area
  UPDATE public.actions a
     SET deleted_at = NOW()
   WHERE a.area_id = p_area_id
     AND a.user_id = auth.uid()
     AND a.deleted_at IS NULL;
END
$$;

### create_occurrence_series(p_action_id)
Create a series of occurrences for finite-slice actions.

```sql
CREATE OR REPLACE FUNCTION public.create_occurrence_series(p_action_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_action record;
  i int;
BEGIN
  SELECT * INTO v_action
  FROM public.actions
  WHERE id = p_action_id;

  IF v_action.slice_count_target IS NULL THEN
    RETURN 0;
  END IF;

  IF v_action.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not owner';
  END IF;

  FOR i IN 1..v_action.slice_count_target LOOP
    INSERT INTO public.action_occurrences(
      action_id, user_id, dream_id, area_id,
      occurrence_no, planned_due_on, due_on, defer_count, note
    )
    VALUES (
      v_action.id, v_action.user_id, v_action.dream_id, v_action.area_id,
      i, NULL, NULL, 0, NULL
    )
    ON CONFLICT (action_id, occurrence_no) DO NOTHING;
  END LOOP;

  RETURN v_action.slice_count_target;
END
$$;
```

## Security & Permissions

### View Security Configuration
All views are configured with `security_invoker = on` to ensure they respect RLS policies and run with the permissions of the calling user, not the view creator.

### Permission Grants
The following permissions are configured for the `authenticated` role:

**Views (SELECT only):**
- `v_action_occurrence_status`
- `v_active_actions` 
- `v_active_areas`
- `v_dream_daily_summary`
- `v_overdue_counts`

**Tables (SELECT, INSERT, UPDATE, DELETE):**
- `dreams`
- `areas`
- `actions`
- `action_occurrences`
- `action_artifacts`
- `profiles`
- `ai_events`
- `notification_preferences`
- `user_subscriptions`

**Functions (EXECUTE):**
- `defer_occurrence(uuid)`
- `current_streak(uuid, uuid)`
- `soft_delete_area(uuid)`
- `create_occurrence_series(uuid)`

**Schema Access:**
- `USAGE` on `public` schema
- `CREATE` on `public` schema (for temporary tables)

The `anon` role has all permissions revoked on these objects, ensuring only authenticated users can access data.

### API Integration
All API routes now use the `supabaseServerAuth(userToken)` function instead of the service role client. This ensures:
- RLS policies are enforced automatically
- Users can only access their own data
- No manual user ownership checks are needed in API code
- Better security through principle of least privilege

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
ALTER TABLE ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Force RLS (prevents bypassing policies)
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE dreams FORCE ROW LEVEL SECURITY;
ALTER TABLE areas FORCE ROW LEVEL SECURITY;
ALTER TABLE actions FORCE ROW LEVEL SECURITY;
ALTER TABLE action_occurrences FORCE ROW LEVEL SECURITY;
ALTER TABLE action_artifacts FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_events FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions FORCE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can access own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id);

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

-- AI events policies
CREATE POLICY "Users can read own ai_events" ON ai_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_events" ON ai_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can access own notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- User subscriptions policies
CREATE POLICY "Read own user_subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Insert own user_subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own user_subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
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
1. Find the most recent completion date for the dream
2. Start counting from that date and count backwards
3. For each day, check if there's ≥1 completed occurrence
4. Stop counting when a day has no completions
5. The streak is maintained until it's actually broken by missing a day

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

### rc_snapshot (in user_subscriptions table)
```json
{
  "app_user_id": "user_12345",
  "original_app_user_id": "user_12345",
  "entitlements": {
    "pro": {
      "expires_date": "2024-12-31T23:59:59Z",
      "product_identifier": "monthly_pro",
      "purchase_date": "2024-01-01T00:00:00Z"
    }
  },
  "subscriptions": {
    "monthly_pro": {
      "expires_date": "2024-12-31T23:59:59Z",
      "original_purchase_date": "2024-01-01T00:00:00Z",
      "is_sandbox": false,
      "period_type": "NORMAL",
      "store": "APP_STORE",
      "unsubscribe_detected_at": null,
      "billing_issues_detected_at": null
    }
  }
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

### User Subscription Status
```sql
-- Get current active subscription
SELECT 
  us.entitlement,
  us.is_active,
  us.is_trial,
  us.will_renew,
  us.current_period_end,
  us.store,
  us.product_id
FROM user_subscriptions us
WHERE us.user_id = auth.uid() 
  AND us.is_active = true
ORDER BY us.created_at DESC
LIMIT 1;

-- Get subscription history (trials + paid)
SELECT 
  us.entitlement,
  us.is_active,
  us.is_trial,
  us.will_renew,
  us.current_period_end,
  us.store,
  us.product_id,
  us.created_at,
  us.original_purchase_at
FROM user_subscriptions us
WHERE us.user_id = auth.uid()
ORDER BY us.created_at DESC;
```