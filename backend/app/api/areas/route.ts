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

  const { dream_id, areas } = await req.json()

  if (!dream_id) {
    return NextResponse.json({ error: 'dream_id is required' }, { status: 400 })
  }

  if (!Array.isArray(areas)) {
    return NextResponse.json({ error: 'areas must be an array' }, { status: 400 })
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
    // Get existing areas for this dream
    const { data: existingAreas } = await sb
      .from('areas')
      .select('id')
      .eq('dream_id', dream_id)
      .is('deleted_at', null)

    const existingAreaIds = new Set(existingAreas?.map(a => a.id) || [])
    const incomingAreaIds = new Set(areas.filter(a => a.id).map(a => a.id))

    // Areas to create (no id or temporary id)
    const areasToCreate = areas.filter(area => !area.id || area.id.startsWith('temp_'))
    
    // Areas to update (has id and exists and is not temporary)
    const areasToUpdate = areas.filter(area => area.id && !area.id.startsWith('temp_') && existingAreaIds.has(area.id))
    
    // Areas to soft delete (exist but not in incoming list)
    const areaIdsToDelete = [...existingAreaIds].filter(id => !incomingAreaIds.has(id))

    // Create new areas
    let createdAreas = []
    if (areasToCreate.length > 0) {
      const { data, error } = await sb
        .from('areas')
        .insert(
          areasToCreate.map((area, index) => ({
            user_id: user.id,
            dream_id,
            title: area.title,
            icon: area.icon || null,
            position: area.position ?? index
          }))
        )
        .select()

      if (error) throw error
      createdAreas = data || []
    }

    // Update existing areas
    // Use a two-phase update to avoid position conflicts during reordering:
    // 1. First, set all positions to negative values to free up the positions
    // 2. Then, set them to the correct positive values
    let updatedAreas = []
    
    if (areasToUpdate.length > 0) {
      // Phase 1: Set all positions to negative values to avoid conflicts
      for (const area of areasToUpdate) {
        await sb
          .from('areas')
          .update({
            position: -Math.abs(area.position),
            updated_at: new Date().toISOString()
          })
          .eq('id', area.id)
      }

      // Phase 2: Set positions to correct positive values
      for (const area of areasToUpdate) {
        const { data, error } = await sb
          .from('areas')
          .update({
            title: area.title,
            icon: area.icon || null,
            position: area.position,
            updated_at: new Date().toISOString()
          })
          .eq('id', area.id)
          .select()
          .single()

        if (error) throw error
        updatedAreas.push(data)
      }
    }

    // Soft delete removed areas
    if (areaIdsToDelete.length > 0) {
      await sb
        .from('areas')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', areaIdsToDelete)
    }

    // Return all current areas for this dream
    const { data: allAreas, error: fetchError } = await sb
      .from('areas')
      .select('*')
      .eq('dream_id', dream_id)
      .is('deleted_at', null)
      .order('created_at')

    if (fetchError) throw fetchError

    return NextResponse.json({ areas: allAreas || [] })

  } catch (error) {
    console.error('Areas upsert error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
