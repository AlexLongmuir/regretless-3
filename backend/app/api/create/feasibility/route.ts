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

    const { title, start_date, end_date, baseline, obstacles, enjoyment } = await req.json()
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Build the prompt with all available context
    const contextInfo = []
    if (baseline) contextInfo.push(`Current baseline: ${baseline}`)
    if (obstacles) contextInfo.push(`Potential obstacles: ${obstacles}`)
    if (enjoyment) contextInfo.push(`What they enjoy: ${enjoyment}`)
    if (start_date) contextInfo.push(`Start date: ${start_date}`)
    if (end_date) contextInfo.push(`End date: ${end_date}`)

    const contextString = contextInfo.length > 0 ? `\n\nAdditional context:\n${contextInfo.join('\n')}` : ''

    const prompt = `Analyze this dream for feasibility and provide improved suggestions:

Dream Title: "${title}"${contextString}

Please provide:
1. Up to 4 improved title suggestions that are more specific and actionable (max 10 words each)
2. An assessment of whether the timeline is realistic and a suggested end date if needed`

    const { data, usage } = await generateJson({
      system: GOAL_FEASIBILITY_SYSTEM,
      messages: [{ text: prompt }],
      schema: GOAL_FEASIBILITY_SCHEMA,
      maxOutputTokens: 800,
      modelId: GEMINI_MODEL // Using Flash Lite model without thinking
    })

    const latencyMs = Date.now() - startTime

    // Save telemetry using authenticated client
    const sb = supabaseServerAuth(token)
    await saveAIEvent(
      user.id,
      'feasibility',
      'gemini-2.5-flash-lite',
      usage,
      latencyMs,
      sb
    )

    return NextResponse.json(data)

  } catch (error) {
    console.error('Feasibility analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze feasibility' }, 
      { status: 500 }
    )
  }
}
