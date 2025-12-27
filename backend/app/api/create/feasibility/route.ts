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

    let data, usage
    try {
      const result = await generateJson({
        system: GOAL_FEASIBILITY_SYSTEM,
        messages: [{ text: prompt }],
        schema: GOAL_FEASIBILITY_SCHEMA,
        maxOutputTokens: 2000,
        modelId: GEMINI_MODEL // Using Flash Lite model without thinking
      })
      data = result.data
      usage = result.usage
      console.log('[FEASIBILITY] AI Response:', JSON.stringify(data, null, 2))
    } catch (aiError) {
      // Enhanced error logging for Vercel visibility
      console.error('[FEASIBILITY] AI generation failed');
      console.error('[FEASIBILITY] Error message:', aiError instanceof Error ? aiError.message : String(aiError));
      console.error('[FEASIBILITY] Error stack:', aiError instanceof Error ? aiError.stack : 'N/A');
      console.error('[FEASIBILITY] Error details:', JSON.stringify({
        name: aiError instanceof Error ? aiError.name : 'Unknown',
        message: aiError instanceof Error ? aiError.message : String(aiError),
        timestamp: new Date().toISOString()
      }));
      
      const aiErrorMessage = aiError instanceof Error ? aiError.message : String(aiError)
      throw new Error(`AI generation failed: ${aiErrorMessage}`)
    }

    const latencyMs = Date.now() - startTime

    // Save telemetry using authenticated client
    const sb = supabaseServerAuth(token)
    await saveAIEvent(
      user.id,
      'feasibility',
      'gemini-3-flash-preview',
      usage,
      latencyMs,
      sb
    )

    return NextResponse.json(data)

  } catch (error) {
    // Enhanced error logging for Vercel visibility
    console.error('[FEASIBILITY] Top-level error caught');
    console.error('[FEASIBILITY] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[FEASIBILITY] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[FEASIBILITY] Error stack:', error instanceof Error ? error.stack : 'N/A');
    
    // Log structured error details
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.headers.get('x-vercel-id') || 'unknown'
    };
    console.error('[FEASIBILITY] Structured error:', JSON.stringify(errorDetails, null, 2));
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to analyze feasibility', details: errorMessage }, 
      { status: 500 }
    )
  }
}
