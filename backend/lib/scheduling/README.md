# Action Scheduling System

This module implements the complex scheduling logic for creating action occurrences with due dates based on the specified requirements.

## Overview

The scheduling system takes a dream with its areas and actions, and creates `action_occurrences` with appropriate due dates that respect:

- **Global cap**: Max 5 actions/day across all dreams
- **Per-dream cap**: Max 1/day (fallback to 2/day, last-resort 3/day)
- **Linear ordering**: Respects (area.position, action.position) order
- **Auto-compaction**: Compacts scheduling window to hit ~3 actions/week
- **Rest days**: Sunday (0 slots)
- **Timezone**: User's timezone (default: Europe/London)

## Algorithm Steps

### 1. Window Calculation
- Count seedable actions (one-offs + first occurrence of each repeater)
- Calculate recommended end: `start_date + ceil(seedable_actions / 3) * 7 - 1`
- Window end = min(end_date, recommended_end)
- Mark auto_compacted if recommended_end < end_date

### 2. Capacity Model
- Build user-wide calendar with global_remaining[d] = 5
- Build per-dream calendar with per_dream_remaining[d][dream_id] = 1
- Set both to 0 for rest days (Sundays)

### 3. Seed All Actions
- Sort actions by (area.position ASC, action.position ASC)
- Calculate even-spacing target indices
- Place each action on nearest feasible day respecting:
  - Intra-dream order (seed_date(k) ≥ seed_date(k-1) + 1 day)
  - Capacity constraints
  - Rest day exclusions

### 4. Expand Repeats
- For each action with repeat_every_days:
  - Add occurrences at seed + m * repeat_every_days
  - Skip rest days (roll to next non-rest day)
  - Try to maintain per-dream 1/day, allow escalation if needed

### 5. Global Balancing
- Check for days exceeding global 5/day cap
- Move non-repeat one-offs forward to maintain global cap
- Prioritize moves by: newest inserted, hardest, longest

### 6. Tight Fallback Escalation
- If some seeds couldn't be placed:
  - Escalate per-dream cap to 2/day on minimal days
  - If still impossible, allow 3/day
  - If still impossible, flag too_tight=true

## Usage

```typescript
import { scheduleDreamActions } from './scheduler'

const context = {
  user_id: 'user-123',
  timezone: 'Europe/London'
}

const dreamData = {
  dream: dreamObject,
  areas: areasArray,
  actions: actionsArray,
  existing_occurrences: existingOccurrencesArray
}

const result = await scheduleDreamActions(context, dreamData)

if (result.success) {
  // Insert result.occurrences into database
  console.log(`Scheduled ${result.occurrences.length} occurrences`)
  if (result.auto_compacted) {
    console.log('Window was auto-compacted')
  }
  if (result.too_tight) {
    console.log('Could not fit all actions within constraints')
  }
} else {
  console.error('Scheduling failed:', result.errors)
}
```

## Configuration Constants

```typescript
const TARGET_PER_WEEK = 3
const REST_DAYS = new Set([0]) // Sunday = 0
const GLOBAL_DAILY_CAP = 5
const PER_DREAM_CAP_DEFAULT = 1
const PER_DREAM_CAP_MAX = 3
const MIN_GAP_DAYS_BETWEEN_SEEDS = 1
```

## API Integration

The scheduling is triggered automatically when a dream is activated via the `/api/create/activate-dream` endpoint, which calls `/api/create/schedule-actions`.

## Idempotency

The system is idempotent - if a seed already exists for (action_id, occurrence_no=1), it skips re-seeding. This allows for safe re-runs of the scheduling algorithm.

## Edge Cases Handled

- Multiple dreams on same day (up to global 5)
- Overlapping repeats (may break per-dream 1/day if necessary)
- Empty actions list
- Invalid date ranges
- Rest day scheduling conflicts
- Capacity overflow scenarios

## Testing

The system includes comprehensive test cases covering:
- Basic scheduling scenarios
- Position ordering
- Repeating actions
- Window auto-compaction
- Capacity management
- Rest day handling
- Idempotency
- Error handling

Run tests with: `npm test -- --testPathPattern=scheduler.test.ts`
