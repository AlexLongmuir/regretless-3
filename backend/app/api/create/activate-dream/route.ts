import { NextResponse } from 'next/server'
import { supabaseServer, supabaseServerAuth } from '../../../../lib/supabaseServer'

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

    // Activate the dream - RLS will automatically filter by user_id
    const { error: updateError } = await sb
      .from('dreams')
      .update({ activated_at: new Date().toISOString() })
      .eq('id', dream_id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to activate dream' },
        { status: 500 }
      )
    }

    // Schedule actions for the dream
    let schedulingResult = null
    try {
      const authHeader = req.headers.get('authorization')
      const scheduleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/create/schedule-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || ''
        },
        body: JSON.stringify({ dream_id })
      })

      if (scheduleResponse.ok) {
        schedulingResult = await scheduleResponse.json()
      } else {
        const scheduleError = await scheduleResponse.json()
        console.error('Scheduling failed:', scheduleError)
        return NextResponse.json(
          { 
            success: false,
            error: 'Dream activated but scheduling failed',
            details: scheduleError
          },
          { status: 500 }
        )
      }
    } catch (scheduleError) {
      console.error('Scheduling error:', scheduleError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Dream activated but scheduling failed',
          details: scheduleError instanceof Error ? scheduleError.message : 'Unknown scheduling error'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Dream activated and actions scheduled',
      scheduling: schedulingResult
    })

  } catch (error) {
    console.error('Activation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
