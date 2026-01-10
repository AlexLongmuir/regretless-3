-- Fix v_overdue_counts view to exclude archived dreams
-- This prevents counting overdue tasks from archived dreams

DROP VIEW IF EXISTS v_overdue_counts;

CREATE VIEW v_overdue_counts AS
SELECT 
  d.user_id,
  d.id as dream_id,
  COUNT(*) as overdue_count
FROM dreams d
JOIN areas a ON a.dream_id = d.id AND a.deleted_at IS NULL
JOIN actions act ON act.area_id = a.id AND act.deleted_at IS NULL AND act.is_active = true
JOIN action_occurrences ao ON ao.action_id = act.id 
WHERE d.archived_at IS NULL  -- Exclude archived dreams
  AND ao.completed_at IS NULL 
  AND ao.due_on IS NOT NULL  -- Only count occurrences with due dates
  AND ao.due_on < CURRENT_DATE
GROUP BY d.user_id, d.id;
