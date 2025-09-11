import { scheduleDreamActions } from '../scheduler'
import type { Dream, Area, Action, ActionOccurrence } from '../../../database/types'

// Mock data for testing
const createMockDream = (overrides: Partial<Dream> = {}): Dream => ({
  id: 'dream-1',
  user_id: 'user-1',
  title: 'Test Dream',
  description: 'A test dream',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  activated_at: undefined,
  image_url: undefined,
  baseline: undefined,
  obstacles: undefined,
  enjoyment: undefined,
  archived_at: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

const createMockArea = (overrides: Partial<Area> = {}): Area => ({
  id: 'area-1',
  dream_id: 'dream-1',
  title: 'Test Area',
  icon: '🎯',
  position: 1,
  approved_at: '2024-01-01T00:00:00Z',
  deleted_at: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

const createMockAction = (overrides: Partial<Action> = {}): Action => ({
  id: 'action-1',
  user_id: 'user-1',
  dream_id: 'dream-1',
  area_id: 'area-1',
  title: 'Test Action',
  est_minutes: 30,
  difficulty: 'medium',
  repeat_every_days: undefined,
  acceptance_criteria: ['Complete the task'],
  position: 1,
  is_active: true,
  deleted_at: undefined,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

describe('Scheduling Logic', () => {
  const context = {
    user_id: 'user-1',
    timezone: 'Europe/London'
  }

  describe('Basic Scheduling', () => {
    it('should schedule a single action within the window', async () => {
      const dream = createMockDream({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })

      const area = createMockArea()
      const action = createMockAction()

      const dreamData = {
        dream,
        areas: [area],
        actions: [action],
        existing_occurrences: []
      }

      const result = await scheduleDreamActions(context, dreamData)

      expect(result.success).toBe(true)
      expect(result.occurrences).toHaveLength(1)
      expect(result.occurrences[0].action_id).toBe(action.id)
      expect(result.occurrences[0].occurrence_no).toBe(1)
      expect(new Date(result.occurrences[0].due_on)).toBeInstanceOf(Date)
    })

    it('should schedule multiple actions respecting position order', async () => {
      const dream = createMockDream({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })

      const area1 = createMockArea({ id: 'area-1', position: 1 })
      const area2 = createMockArea({ id: 'area-2', position: 2 })

      const action1 = createMockAction({ 
        id: 'action-1', 
        area_id: 'area-1', 
        position: 1 
      })
      const action2 = createMockAction({ 
        id: 'action-2', 
        area_id: 'area-1', 
        position: 2 
      })
      const action3 = createMockAction({ 
        id: 'action-3', 
        area_id: 'area-2', 
        position: 1 
      })

      const dreamData = {
        dream,
        areas: [area1, area2],
        actions: [action3, action1, action2], // Intentionally out of order
        existing_occurrences: []
      }

      const result = await scheduleDreamActions(context, dreamData)

      expect(result.success).toBe(true)
      expect(result.occurrences).toHaveLength(3)

      // Check that actions are scheduled in correct order
      const scheduledDates = result.occurrences.map(occ => new Date(occ.due_on))
      expect(scheduledDates[0]).toBeLessThanOrEqual(scheduledDates[1])
      expect(scheduledDates[1]).toBeLessThanOrEqual(scheduledDates[2])
    })

    it('should handle repeating actions', async () => {
      const dream = createMockDream({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })

      const area = createMockArea()
      const action = createMockAction({
        repeat_every_days: 2
      })

      const dreamData = {
        dream,
        areas: [area],
        actions: [action],
        existing_occurrences: []
      }

      const result = await scheduleDreamActions(context, dreamData)

      expect(result.success).toBe(true)
      expect(result.occurrences.length).toBeGreaterThan(1)

      // Check that repeat occurrences are spaced correctly
      const occurrences = result.occurrences.sort((a, b) => 
        new Date(a.due_on).getTime() - new Date(b.due_on).getTime()
      )

      for (let i = 1; i < occurrences.length; i++) {
        const prevDate = new Date(occurrences[i - 1].due_on)
        const currDate = new Date(occurrences[i].due_on)
        const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        expect(daysDiff).toBeGreaterThanOrEqual(2)
      }
    })
  })

  describe('Window Auto-Compaction', () => {
    it('should auto-compact window when recommended end is before dream end', async () => {
      const dream = createMockDream({
        start_date: '2024-01-01',
        end_date: '2024-12-31' // Very long window
      })

      const area = createMockArea()
      const actions = Array.from({ length: 9 }, (_, i) => 
        createMockAction({ 
          id: `action-${i + 1}`, 
          position: i + 1 
        })
      )

      const dreamData = {
        dream,
        areas: [area],
        actions,
        existing_occurrences: []
      }

      const result = await scheduleDreamActions(context, dreamData)

      expect(result.success).toBe(true)
      expect(result.auto_compacted).toBe(true)
      expect(result.recommended_end).toBeDefined()

      // All occurrences should be within the recommended window
      const recommendedEnd = new Date(result.recommended_end!)
      for (const occurrence of result.occurrences) {
        expect(new Date(occurrence.due_on)).toBeLessThanOrEqual(recommendedEnd)
      }
    })
  })

  describe('Capacity Management', () => {
    it('should respect global daily cap of 5 actions', async () => {
      const dream = createMockDream({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })

      const area = createMockArea()
      // Create 10 actions to test capacity limits
      const actions = Array.from({ length: 10 }, (_, i) => 
        createMockAction({ 
          id: `action-${i + 1}`, 
          position: i + 1 
        })
      )

      const dreamData = {
        dream,
        areas: [area],
        actions,
        existing_occurrences: []
      }

      const result = await scheduleDreamActions(context, dreamData)

      expect(result.success).toBe(true)

      // Group occurrences by date and check no date has more than 5 actions
      const occurrencesByDate = new Map<string, number>()
      for (const occurrence of result.occurrences) {
        const count = occurrencesByDate.get(occurrence.due_on) || 0
        occurrencesByDate.set(occurrence.due_on, count + 1)
      }

      for (const [date, count] of occurrencesByDate) {
        expect(count).toBeLessThanOrEqual(5)
      }
    })

    it('should skip rest days (Sundays)', async () => {
      const dream = createMockDream({
        start_date: '2024-01-01', // Monday
        end_date: '2024-01-07'    // Sunday
      })

      const area = createMockArea()
      const action = createMockAction()

      const dreamData = {
        dream,
        areas: [area],
        actions: [action],
        existing_occurrences: []
      }

      const result = await scheduleDreamActions(context, dreamData)

      expect(result.success).toBe(true)
      expect(result.occurrences).toHaveLength(1)

      // Check that the scheduled date is not a Sunday
      const scheduledDate = new Date(result.occurrences[0].due_on)
      expect(scheduledDate.getDay()).not.toBe(0) // 0 = Sunday
    })
  })

  describe('Idempotency', () => {
    it('should not create duplicate seeds for existing occurrences', async () => {
      const dream = createMockDream()
      const area = createMockArea()
      const action = createMockAction()

      const existingOccurrence: ActionOccurrence = {
        id: 'existing-1',
        action_id: action.id,
        occurrence_no: 1,
        planned_due_on: '2024-01-02',
        due_on: '2024-01-02',
        defer_count: 0,
        note: undefined,
        completed_at: undefined,
        ai_rating: undefined,
        ai_feedback: undefined,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const dreamData = {
        dream,
        areas: [area],
        actions: [action],
        existing_occurrences: [existingOccurrence]
      }

      const result = await scheduleDreamActions(context, dreamData)

      expect(result.success).toBe(true)
      // Should not create new seed occurrence since one already exists
      const seedOccurrences = result.occurrences.filter(occ => occ.occurrence_no === 1)
      expect(seedOccurrences).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty actions list gracefully', async () => {
      const dream = createMockDream()
      const area = createMockArea()

      const dreamData = {
        dream,
        areas: [area],
        actions: [],
        existing_occurrences: []
      }

      const result = await scheduleDreamActions(context, dreamData)

      expect(result.success).toBe(true)
      expect(result.occurrences).toHaveLength(0)
    })

    it('should handle invalid dream data', async () => {
      const dream = createMockDream({
        start_date: 'invalid-date'
      })

      const dreamData = {
        dream,
        areas: [],
        actions: [],
        existing_occurrences: []
      }

      const result = await scheduleDreamActions(context, dreamData)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })
})
