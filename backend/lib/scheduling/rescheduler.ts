import { supabaseServer, supabaseServerAuth } from '../../lib/supabaseServer'
import { scheduleDreamActions } from './scheduler'
import type { Dream, Area, Action, ActionOccurrence } from '../../database/types'

/**
 * Reschedule actions for a dream - useful when users want to extend/contract
 * their due dates or when they've completed some actions and want to reschedule
 * the remaining ones.
 */
export async function rescheduleDreamActions(
  dreamId: string,
  userId: string,
  userToken: string,
  options: {
    extendEndDate?: string
    contractEndDate?: string
    resetCompleted?: boolean // Whether to reschedule completed actions too
    timeCommitment?: { hours: number; minutes: number } // Optional time commitment override
  } = {}
): Promise<{
  success: boolean
  scheduled_count: number
  warnings: string[]
  errors: string[]
}> {
  try {
    const sb = supabaseServerAuth(userToken)
    
    // Fetch current dream data - RLS will automatically filter by user_id
    const { data: dream, error: dreamError } = await sb
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .single()

    if (dreamError || !dream) {
      return {
        success: false,
        scheduled_count: 0,
        warnings: [],
        errors: ['Dream not found']
      }
    }

    // Update dream end date if specified
    if (options.extendEndDate || options.contractEndDate) {
      const newEndDate = options.extendEndDate || options.contractEndDate
      await sb
        .from('dreams')
        .update({ end_date: newEndDate })
        .eq('id', dreamId)
      
      dream.end_date = newEndDate
    }

    // Override time commitment if specified
    if (options.timeCommitment) {
      dream.time_commitment = options.timeCommitment
    }

    // Fetch areas and actions
    const { data: areas, error: areasError } = await sb
      .from('areas')
      .select('*')
      .eq('dream_id', dreamId)
      .is('deleted_at', null)
      .order('position')

    if (areasError) {
      return {
        success: false,
        scheduled_count: 0,
        warnings: [],
        errors: ['Failed to fetch areas']
      }
    }

    const { data: actions, error: actionsError } = await sb
      .from('actions')
      .select('*')
      .in('area_id', areas.map(area => area.id))
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('position')

    if (actionsError) {
      return {
        success: false,
        scheduled_count: 0,
        warnings: [],
        errors: ['Failed to fetch actions']
      }
    }

    // Fetch existing occurrences
    const { data: existingOccurrences, error: occurrencesError } = await sb
      .from('action_occurrences')
      .select('*')
      .in('action_id', actions.map(action => action.id))

    if (occurrencesError) {
      return {
        success: false,
        scheduled_count: 0,
        warnings: [],
        errors: ['Failed to fetch existing occurrences']
      }
    }

    // Filter out completed occurrences if resetCompleted is false
    const occurrencesToConsider = options.resetCompleted 
      ? existingOccurrences 
      : existingOccurrences.filter(occ => !occ.completed_at)

    // Delete existing occurrences that we want to reschedule
    const occurrenceIdsToDelete = occurrencesToConsider.map(occ => occ.id)
    if (occurrenceIdsToDelete.length > 0) {
      const { error: deleteError } = await sb
        .from('action_occurrences')
        .delete()
        .in('id', occurrenceIdsToDelete)

      if (deleteError) {
        return {
          success: false,
          scheduled_count: 0,
          warnings: [],
          errors: ['Failed to delete existing occurrences']
        }
      }
    }

    // Prepare scheduling context
    const context = {
      user_id: userId,
      timezone: 'Europe/London' // Could be made configurable
    }

    const dreamData = {
      dream: dream as Dream,
      areas: areas as Area[],
      actions: actions as Action[],
      existing_occurrences: [] // Start fresh since we deleted the ones to reschedule
    }

    // Run scheduling algorithm
    const schedulingResult = await scheduleDreamActions(context, dreamData)

    if (!schedulingResult.success) {
      return {
        success: false,
        scheduled_count: 0,
        warnings: [],
        errors: schedulingResult.errors
      }
    }

    // Insert new occurrences (upsert with deduplication and required fields)
    if (schedulingResult.occurrences.length > 0) {
      // Deduplicate by (action_id, occurrence_no)
      const unique = schedulingResult.occurrences.reduce((acc, occ) => {
        const key = `${occ.action_id}-${occ.occurrence_no}`
        if (!acc.has(key)) acc.set(key, occ)
        return acc
      }, new Map<string, typeof schedulingResult.occurrences[number]>())

      const deduped = Array.from(unique.values())

      // Build action lookup for area_id derivation
      const actionIdToAreaId = new Map(actions.map(a => [a.id, a.area_id]))

      const { error: upsertError } = await sb
        .from('action_occurrences')
        .upsert(
          deduped.map(occ => ({
            action_id: occ.action_id,
            area_id: actionIdToAreaId.get(occ.action_id)!,
            dream_id: dreamId,
            user_id: userId,
            occurrence_no: occ.occurrence_no,
            planned_due_on: occ.planned_due_on,
            due_on: occ.due_on,
            defer_count: occ.defer_count
          })),
          { onConflict: 'action_id,occurrence_no', ignoreDuplicates: false }
        )

      if (upsertError) {
        return {
          success: false,
          scheduled_count: 0,
          warnings: [],
          errors: ['Failed to insert new occurrences']
        }
      }
    }

    return {
      success: true,
      scheduled_count: schedulingResult.occurrences.length,
      warnings: schedulingResult.warnings,
      errors: []
    }

  } catch (error) {
    return {
      success: false,
      scheduled_count: 0,
      warnings: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * API endpoint handler for rescheduling
 */
export async function handleRescheduleRequest(req: Request) {
  try {
    const { dream_id, extend_end_date, contract_end_date, reset_completed, time_commitment } = await req.json()
    
    if (!dream_id) {
      return {
        success: false,
        error: 'dream_id is required'
      }
    }

    // Get user from auth
    const token = req.headers.get('authorization')?.replace('Bearer ','')
    if (!token) {
      return {
        success: false,
        error: 'No authentication token'
      }
    }
    
    const sb = supabaseServer()
    const { data, error: authError } = await sb.auth.getUser(token)
    if (authError || !data.user) {
      return {
        success: false,
        error: 'Unauthorized'
      }
    }
    
    const user = data.user

    const result = await rescheduleDreamActions(dream_id, user.id, token, {
      extendEndDate: extend_end_date,
      contractEndDate: contract_end_date,
      resetCompleted: reset_completed || false,
      timeCommitment: time_commitment
    })

    return result

  } catch (error) {
    return {
      success: false,
      error: 'Internal server error'
    }
  }
}
