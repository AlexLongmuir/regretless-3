import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../../lib/supabaseServer'
import { scheduleActionsForDream } from '../../../../lib/scheduling/scheduleActionsForDream'

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

    // Use the shared scheduling function
    const schedulingResult = await scheduleActionsForDream(dream_id, user.id, token)

    if (!schedulingResult.success) {
      return NextResponse.json(
        { 
          error: schedulingResult.error || 'Scheduling failed',
          details: schedulingResult.details
        },
        { status: schedulingResult.error === 'Dream not found' ? 404 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      scheduled_count: schedulingResult.scheduled_count,
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
