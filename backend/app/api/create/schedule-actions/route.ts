import { NextResponse } from 'next/server'
import { supabaseServer, supabaseServerAuth } from '../../../../lib/supabaseServer'
import { scheduleDreamActions } from '../../../../lib/scheduling/scheduler'
import type { Dream, Area, Action, ActionOccurrence } from '../../../../database/types'

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ','')
  if (!token) return null
  const supabase = supabaseServer()
  const { data, error } = await supabase.auth.getUser(token)
  return data.user ?? null
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ','')
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { dream_id } = await req.json()
    
    if (!dream_id) {
      return NextResponse.json(
        { error: 'dream_id is required' },
        { status: 400 }
      )
    }

    // Get user from auth
    const user = await getUser(req)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use authenticated client that respects RLS
    const sb = supabaseServerAuth(token)

    // Fetch dream data - RLS will automatically filter by user_id
    const { data: dream, error: dreamError } = await sb
      .from('dreams')
      .select('*')
      .eq('id', dream_id)
      .single()

    if (dreamError || !dream) {
      return NextResponse.json(
        { error: 'Dream not found' },
        { status: 404 }
      )
    }

    // Fetch areas for this dream
    console.log('Fetching areas for dream:', dream_id, 'user:', user.id)
    const { data: areas, error: areasError } = await sb
      .from('areas')
      .select('*')
      .eq('dream_id', dream_id)
      .is('deleted_at', null)
      .order('position')

    if (areasError) {
      console.error('Areas fetch error:', areasError)
      return NextResponse.json(
        { error: 'Failed to fetch areas', details: areasError.message },
        { status: 500 }
      )
    }

    console.log('Found areas:', areas?.length || 0)

    // Fetch actions for this dream
    console.log('Fetching actions for areas:', areas.map(area => area.id))
    
    // First, let's check what actions exist for these areas (without filters)
    const { data: allActions, error: allActionsError } = await sb
      .from('actions')
      .select('*')
      .in('area_id', areas.map(area => area.id))
    
    console.log('All actions found (no filters):', allActions?.length || 0)
    if (allActions && allActions.length > 0) {
      console.log('Sample action:', {
        id: allActions[0].id,
        area_id: allActions[0].area_id,
        is_active: allActions[0].is_active,
        deleted_at: allActions[0].deleted_at,
        position: allActions[0].position
      })
    }
    
    // Now try with filters
    const { data: actions, error: actionsError } = await sb
      .from('actions')
      .select('*')
      .in('area_id', areas.map(area => area.id))
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('position')

    if (actionsError) {
      console.error('Actions fetch error:', actionsError)
      return NextResponse.json(
        { error: 'Failed to fetch actions', details: actionsError.message },
        { status: 500 }
      )
    }

    console.log('Found actions:', actions?.length || 0)

    // Fetch existing occurrences to avoid duplicates
    const { data: existingOccurrences, error: occurrencesError } = await sb
      .from('action_occurrences')
      .select('*')
      .in('action_id', actions.map(action => action.id))

    if (occurrencesError) {
      return NextResponse.json(
        { error: 'Failed to fetch existing occurrences' },
        { status: 500 }
      )
    }

    // Prepare scheduling context
    const context = {
      user_id: user.id,
      timezone: 'Europe/London' // Default timezone, could be made configurable
    }

    const dreamData = {
      dream: dream as Dream,
      areas: areas as Area[],
      actions: actions as Action[],
      existing_occurrences: existingOccurrences as ActionOccurrence[]
    }

    // Run scheduling algorithm
    console.log('Running scheduling algorithm...')
    const schedulingResult = await scheduleDreamActions(context, dreamData)

    console.log('Scheduling result:', {
      success: schedulingResult.success,
      occurrencesCount: schedulingResult.occurrences.length,
      errors: schedulingResult.errors,
      warnings: schedulingResult.warnings
    })

    if (!schedulingResult.success) {
      return NextResponse.json(
        { 
          error: 'Scheduling failed',
          details: schedulingResult.errors
        },
        { status: 500 }
      )
    }

    // Insert new occurrences into database
    if (schedulingResult.occurrences.length > 0) {
      console.log('Inserting occurrences:', schedulingResult.occurrences.length)
      console.log('Sample occurrence:', {
        action_id: schedulingResult.occurrences[0].action_id,
        occurrence_no: schedulingResult.occurrences[0].occurrence_no,
        planned_due_on: schedulingResult.occurrences[0].planned_due_on,
        due_on: schedulingResult.occurrences[0].due_on
      })
      
      // Deduplicate occurrences by (action_id, occurrence_no) to avoid conflicts
      const uniqueOccurrences = schedulingResult.occurrences.reduce((acc, occ) => {
        const key = `${occ.action_id}-${occ.occurrence_no}`
        if (!acc.has(key)) {
          acc.set(key, occ)
        }
        return acc
      }, new Map())
      
      const deduplicatedOccurrences = Array.from(uniqueOccurrences.values())
      console.log('Deduplicated occurrences:', deduplicatedOccurrences.length)
      
      const { error: insertError } = await sb
        .from('action_occurrences')
        .upsert(deduplicatedOccurrences.map(occ => ({
          action_id: occ.action_id,
          area_id: occ.area_id,
          dream_id: dream_id,
          occurrence_no: occ.occurrence_no,
          planned_due_on: occ.planned_due_on,
          due_on: occ.due_on,
          defer_count: occ.defer_count,
          user_id: user.id
        })), {
          onConflict: 'action_id,occurrence_no',
          ignoreDuplicates: false
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to insert occurrences', details: insertError },
          { status: 500 }
        )
      }
      
      console.log('Successfully inserted occurrences')
    } else {
      console.log('No occurrences to insert')
    }

    // Update dream with scheduling metadata if needed
    const dreamUpdates: Partial<Dream> = {}
    if (schedulingResult.auto_compacted) {
      // Could add a field to track auto-compaction
      // dreamUpdates.auto_compacted = true
    }
    if (schedulingResult.too_tight) {
      // Could add a field to track tight scheduling
      // dreamUpdates.too_tight = true
    }

    if (Object.keys(dreamUpdates).length > 0) {
      await sb
        .from('dreams')
        .update(dreamUpdates)
        .eq('id', dream_id)
    }

    return NextResponse.json({
      success: true,
      scheduled_count: schedulingResult.occurrences.length,
      warnings: schedulingResult.warnings,
      auto_compacted: schedulingResult.auto_compacted,
      too_tight: schedulingResult.too_tight,
      recommended_end: schedulingResult.recommended_end
    })

  } catch (error) {
    console.error('Scheduling error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
