import { NextResponse } from 'next/server'
import { generateJson, GEMINI_MODEL } from '../../../../lib/ai/gemini'
import { GOAL_FEASIBILITY_SYSTEM } from '../../../../lib/ai/prompts'
import { GOAL_FEASIBILITY_SCHEMA } from '../../../../lib/ai/schemas'
import { saveAIEvent } from '../../../../lib/ai/telemetry'
import { supabaseServer, supabaseServerAuth } from '../../../../lib/supabaseServer'

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ','')
  if (!token) return null
  const supabase = supabaseServer()
  const { data, error } = await supabase.auth.getUser(token)
  return data.user ?? null
}

export async function POST(req: Request) {
  const startTime = Date.now()
  
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ','')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, baseline, obstacles, enjoyment } = await req.json()
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Build the prompt with available context
    const contextInfo = []
    if (baseline) contextInfo.push(`Current baseline: ${baseline}`)
    if (obstacles) contextInfo.push(`Potential obstacles: ${obstacles}`)
    if (enjoyment) contextInfo.push(`What they enjoy: ${enjoyment}`)

    const contextString = contextInfo.length > 0 ? `\n\nAdditional context:\n${contextInfo.join('\n')}` : ''

    const prompt = `Analyze this dream goal and provide improved suggestions:

Dream Title: "${title}"${contextString}

Please provide:
1. A brief summary explaining why the original goal needs improvement
2. Up to 4 improved title suggestions that are more specific and actionable (max 10 words each)`

    const { data, usage } = await generateJson({
      system: GOAL_FEASIBILITY_SYSTEM,
      messages: [{ text: prompt }],
      schema: GOAL_FEASIBILITY_SCHEMA,
      maxOutputTokens: 600,
      modelId: GEMINI_MODEL
    })

    const latencyMs = Date.now() - startTime

    // Save telemetry using authenticated client
    const sb = supabaseServerAuth(token)
    await saveAIEvent(
      user.id,
      'goal-feasibility',
      'gemini-2.5-flash-lite',
      usage,
      latencyMs,
      sb
    )

    return NextResponse.json(data)

  } catch (error) {
    console.error('Goal feasibility analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze goal feasibility' }, 
      { status: 500 }
    )
  }
}
