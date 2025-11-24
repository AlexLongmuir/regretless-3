import { NextResponse } from 'next/server'
import { supabaseServer, supabaseServerAuth } from '../../../lib/supabaseServer'

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ','')
  if (!token) return null
  const sb = supabaseServer()
  const { data, error } = await sb.auth.getUser(token)
  if (error) return null
  return data.user ?? null
}

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ','')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dream_id, actions } = await req.json()

  if (!dream_id) {
    return NextResponse.json({ error: 'dream_id is required' }, { status: 400 })
  }

  if (!Array.isArray(actions)) {
    return NextResponse.json({ error: 'actions must be an array' }, { status: 400 })
  }

  // Use authenticated client that respects RLS
  const sb = supabaseServerAuth(token)

  // RLS will automatically filter by user_id, so we don't need .eq('user_id', user.id)
  const { data: dream } = await sb
    .from('dreams')
    .select('id')
    .eq('id', dream_id)
    .maybeSingle()

  if (!dream) {
    return NextResponse.json({ error: 'Dream not found or access denied' }, { status: 404 })
  }

  try {
    // Get existing areas for this dream to validate area_id relationships
    const { data: validAreas } = await sb
      .from('areas')
      .select('id')
      .eq('dream_id', dream_id)
      .is('deleted_at', null)

    const validAreaIds = new Set(validAreas?.map(a => a.id) || [])

    // Validate all actions have valid area_ids
    for (const action of actions) {
      if (!action.area_id || !validAreaIds.has(action.area_id)) {
        return NextResponse.json(
          { error: `Invalid area_id: ${action.area_id}` },
          { status: 400 }
        )
      }
    }

    // Get incoming area IDs to limit scope of operations
    const incomingAreaIds = new Set(actions.map(a => a.area_id))
    
    // Get existing actions for ONLY the incoming areas (not all dream areas)
    const { data: existingActions } = await sb
      .from('actions')
      .select('id, area_id')
      .in('area_id', [...incomingAreaIds])
      .is('deleted_at', null)

    const existingActionIds = new Set(existingActions?.map(a => a.id) || [])
    const incomingActionIds = new Set(actions.filter(a => a.id).map(a => a.id))

    // Actions to create (no id or temporary id)
    const actionsToCreate = actions.filter(action => !action.id || action.id.startsWith('temp_'))
    
    // Actions to update (has id and exists and is not temporary)
    const actionsToUpdate = actions.filter(action => action.id && !action.id.startsWith('temp_') && existingActionIds.has(action.id))
    
    // Actions to soft delete (exist in incoming areas but not in incoming list)
    const actionIdsToDelete = [...existingActionIds].filter(id => !incomingActionIds.has(id))

    // Create new actions
    let createdActions = []
    if (actionsToCreate.length > 0) {
      // Get all existing positions for each area to avoid duplicates
      const areaIds = [...new Set(actionsToCreate.map(a => a.area_id))]
      const existingPositions: Record<string, Set<number>> = {}
      
      for (const areaId of areaIds) {
        const { data: existingActions } = await sb
          .from('actions')
          .select('position')
          .eq('area_id', areaId)
          .eq('user_id', user.id)
          .is('deleted_at', null)
        
        existingPositions[areaId] = new Set(existingActions?.map(a => a.position) || [])
      }

      // Sort actions by position within each area
      const sortedActionsToCreate = actionsToCreate.sort((a, b) => (a.position || 0) - (b.position || 0))

      const { data, error } = await sb
        .from('actions')
        .insert(
          sortedActionsToCreate.map((action, index) => {
            // Find next available position for this area
            const areaPositions = existingPositions[action.area_id]
            let newPosition = action.position ?? 0
            
            // Always find the next available position to avoid conflicts
            // Find the highest existing position and add 1
            const maxPosition = Math.max(...Array.from(areaPositions), 0) // Start from 0, so first position is 1
            newPosition = maxPosition + 1
            
            // Add this position to the set to avoid conflicts within this batch
            areaPositions.add(newPosition)
            
            return {
              user_id: user.id,
              dream_id: dream_id,
              area_id: action.area_id,
              title: action.title,
              est_minutes: action.est_minutes || null,
              difficulty: action.difficulty || 'medium',
              repeat_every_days: action.repeat_every_days || null,
              slice_count_target: action.slice_count_target || null,
              acceptance_criteria: action.acceptance_criteria || null,
              position: newPosition,
              is_active: action.is_active !== undefined ? action.is_active : true
            }
          })
        )
        .select()

      if (error) throw error
      createdActions = data || []
    }

    // Update existing actions
    let updatedActions = []
    
    // Group actions by area_id to handle position conflicts properly
    const actionsByArea: Record<string, any[]> = {}
    for (const action of actionsToUpdate) {
      if (!actionsByArea[action.area_id]) {
        actionsByArea[action.area_id] = []
      }
      actionsByArea[action.area_id].push(action)
    }
    
    // Process each area separately to avoid position conflicts
    for (const [areaId, areaActions] of Object.entries(actionsByArea)) {
      // First, temporarily set all positions to negative values to avoid conflicts
      for (const action of areaActions) {
        await sb
          .from('actions')
          .update({
            dream_id: dream_id,
            area_id: action.area_id,
            title: action.title,
            est_minutes: action.est_minutes || null,
            difficulty: action.difficulty || 'medium',
            repeat_every_days: action.repeat_every_days || null,
            slice_count_target: action.slice_count_target || null,
            acceptance_criteria: action.acceptance_criteria || null,
            position: -1, // Temporary negative position
            is_active: action.is_active !== undefined ? action.is_active : true,
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id)
      }
      
      // Now set the correct positions for this area
      for (const action of areaActions) {
        const { data, error } = await sb
          .from('actions')
          .update({
            position: action.position,
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id)
          .select()
          .single()

        if (error) throw error
        updatedActions.push(data)
      }
    }

    // Soft delete removed actions
    if (actionIdsToDelete.length > 0) {
      await sb
        .from('actions')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', actionIdsToDelete)
    }

    // Return all current actions for the incoming areas only
    const { data: allActions, error: fetchError } = await sb
      .from('actions')
      .select('*')
      .in('area_id', [...incomingAreaIds])
      .is('deleted_at', null)
      .order('area_id, position')

    if (fetchError) throw fetchError

    return NextResponse.json({ actions: allActions || [] })

  } catch (error) {
    console.error('Actions upsert error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
