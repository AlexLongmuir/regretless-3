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
  console.log('🚀 [DREAMS API] POST request received')
  
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ','')
    if (!token) {
      console.log('❌ [DREAMS API] Unauthorized - no token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser(req)
    console.log('👤 [DREAMS API] User auth result:', user ? `User ID: ${user.id}` : 'No user')
    
    if (!user) {
      console.log('❌ [DREAMS API] Unauthorized - invalid token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    console.log('📝 [DREAMS API] Request body:', JSON.stringify(body, null, 2))
    
    const { id, title, start_date = null, end_date = null, image_url = null, baseline = null, obstacles = null, enjoyment = null, time_commitment = null } = body

    // Use authenticated client that respects RLS
    const sb = supabaseServerAuth(token)
    console.log('🔗 [DREAMS API] Authenticated Supabase client created')

    if (!id) {
      console.log('🆕 [DREAMS API] Creating new dream')
      if (!title?.trim()) {
        console.log('❌ [DREAMS API] No title provided')
        return NextResponse.json({ error: 'Title required' }, { status: 400 })
      }
      
      // Provide default start_date if not provided (required by database schema)
      const defaultStartDate = start_date || new Date().toISOString().split('T')[0]
      
      const insertData = {
        user_id: user.id, 
        title: title.trim(), 
        start_date: defaultStartDate, 
        end_date, 
        image_url, 
        baseline,
        obstacles,
        enjoyment,
        time_commitment,
        activated_at: null
      }
      console.log('💾 [DREAMS API] Inserting dream:', JSON.stringify(insertData, null, 2))
      
      // RLS will automatically filter by user_id, so we don't need to specify it in WHERE clauses
      const { data, error } = await sb.from('dreams').insert(insertData).select('id').single()
      
      if (error) {
        console.log('❌ [DREAMS API] Database error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      console.log('✅ [DREAMS API] Dream created successfully:', data)
      return NextResponse.json({ id: data!.id })
    }

    console.log('🔄 [DREAMS API] Updating existing dream:', id)
    // RLS will automatically filter by user_id, so we don't need .eq('user_id', user.id)
    const { data: owns } = await sb.from('dreams').select('id, activated_at').eq('id', id).maybeSingle()
    if (!owns) {
      console.log('❌ [DREAMS API] Dream not found or access denied')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const patch: any = {}
    if (typeof title === 'string') patch.title = title.trim()
    patch.start_date = start_date
    patch.end_date = end_date
    patch.image_url = image_url
    patch.baseline = baseline
    patch.obstacles = obstacles
    patch.enjoyment = enjoyment
    patch.time_commitment = time_commitment

    // For activated dreams, only allow certain fields to be updated
    if (owns.activated_at) {
      console.log('📝 [DREAMS API] Dream is activated, allowing limited updates')
      
      // Check if any restricted fields are being sent
      const restrictedFields = ['start_date', 'baseline', 'obstacles', 'enjoyment', 'time_commitment']
      const hasRestrictedUpdates = restrictedFields.some(field => patch[field] !== undefined)
      
      if (hasRestrictedUpdates) {
        console.log('❌ [DREAMS API] Cannot update restricted fields on activated dream')
        console.log('📝 [DREAMS API] Restricted fields detected:', restrictedFields.filter(field => patch[field] !== undefined))
        return NextResponse.json({ error: 'Cannot update start_date, baseline, obstacles, enjoyment, or time_commitment on activated dreams' }, { status: 409 })
      }
      
      console.log('✅ [DREAMS API] Only allowed fields being updated for activated dream')
    }

    console.log('💾 [DREAMS API] Updating dream with patch:', JSON.stringify(patch, null, 2))
    const { error } = await sb.from('dreams').update(patch).eq('id', id)
    if (error) {
      console.log('❌ [DREAMS API] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    console.log('✅ [DREAMS API] Dream updated successfully')
    return NextResponse.json({ id })
    
  } catch (error) {
    console.log('💥 [DREAMS API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  console.log('🗑️ [DREAMS API] DELETE request received')
  
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ','')
    if (!token) {
      console.log('❌ [DREAMS API] Unauthorized - no token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser(req)
    console.log('👤 [DREAMS API] User auth result:', user ? `User ID: ${user.id}` : 'No user')
    
    if (!user) {
      console.log('❌ [DREAMS API] Unauthorized - invalid token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const dreamId = url.searchParams.get('id')
    
    if (!dreamId) {
      console.log('❌ [DREAMS API] No dream ID provided')
      return NextResponse.json({ error: 'Dream ID required' }, { status: 400 })
    }

    // Use authenticated client that respects RLS
    const sb = supabaseServerAuth(token)
    console.log('🔗 [DREAMS API] Authenticated Supabase client created')

    // Check if dream exists and user owns it
    const { data: owns, error: checkError } = await sb
      .from('dreams')
      .select('id, activated_at')
      .eq('id', dreamId)
      .maybeSingle()
    
    if (checkError) {
      console.log('❌ [DREAMS API] Error checking dream ownership:', checkError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    if (!owns) {
      console.log('❌ [DREAMS API] Dream not found or access denied')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Soft delete the dream by setting archived_at
    console.log('🗑️ [DREAMS API] Soft deleting dream:', dreamId)
    const { error: deleteError } = await sb
      .from('dreams')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', dreamId)
    
    if (deleteError) {
      console.log('❌ [DREAMS API] Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }
    
    console.log('✅ [DREAMS API] Dream deleted successfully')
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.log('💥 [DREAMS API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  console.log('📝 [DREAMS API] PATCH request received')
  
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ','')
    if (!token) {
      console.log('❌ [DREAMS API] Unauthorized - no token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser(req)
    console.log('👤 [DREAMS API] User auth result:', user ? `User ID: ${user.id}` : 'No user')
    
    if (!user) {
      console.log('❌ [DREAMS API] Unauthorized - invalid token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    console.log('📝 [DREAMS API] Request body:', JSON.stringify(body, null, 2))
    
    const { id, action } = body

    if (!id || !action) {
      console.log('❌ [DREAMS API] Missing required fields')
      return NextResponse.json({ error: 'Dream ID and action required' }, { status: 400 })
    }

    // Use authenticated client that respects RLS
    const sb = supabaseServerAuth(token)
    console.log('🔗 [DREAMS API] Authenticated Supabase client created')

    // Check if dream exists and user owns it
    const { data: owns, error: checkError } = await sb
      .from('dreams')
      .select('id, activated_at')
      .eq('id', id)
      .maybeSingle()
    
    if (checkError) {
      console.log('❌ [DREAMS API] Error checking dream ownership:', checkError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    if (!owns) {
      console.log('❌ [DREAMS API] Dream not found or access denied')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let updateData: any = {}
    
    if (action === 'archive') {
      updateData.archived_at = new Date().toISOString()
      console.log('📦 [DREAMS API] Archiving dream:', id)
    } else if (action === 'unarchive') {
      updateData.archived_at = null
      console.log('📤 [DREAMS API] Unarchiving dream:', id)
    } else {
      console.log('❌ [DREAMS API] Invalid action:', action)
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error: updateError } = await sb
      .from('dreams')
      .update(updateData)
      .eq('id', id)
    
    if (updateError) {
      console.log('❌ [DREAMS API] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    
    console.log('✅ [DREAMS API] Dream updated successfully')
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.log('💥 [DREAMS API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}