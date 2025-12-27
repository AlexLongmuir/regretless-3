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

    const prompt = `Help make this dream even more powerful and achievable:

Dream Title: "${title}"${contextString}

Please provide:
1. An encouraging summary that celebrates what's strong about this goal and suggests ways to make it even more powerful
2. Up to 4 improved title suggestions that are more specific and actionable (max 10 words each) - only if the original can be meaningfully enhanced

Remember: Frame everything as enhancement and possibility, not criticism.`

    let data, usage
    try {
      const result = await generateJson({
        system: GOAL_FEASIBILITY_SYSTEM,
        messages: [{ text: prompt }],
        schema: GOAL_FEASIBILITY_SCHEMA,
        maxOutputTokens: 2000,
        modelId: GEMINI_MODEL
      })
      data = result.data
      usage = result.usage
      console.error('[GOAL-FEASIBILITY] AI Response:', JSON.stringify(data, null, 2))
    } catch (aiError) {
      // Enhanced error logging for Vercel visibility
      console.error('[GOAL-FEASIBILITY] AI generation failed');
      console.error('[GOAL-FEASIBILITY] Error message:', aiError instanceof Error ? aiError.message : String(aiError));
      console.error('[GOAL-FEASIBILITY] Error stack:', aiError instanceof Error ? aiError.stack : 'N/A');
      console.error('[GOAL-FEASIBILITY] Error details:', JSON.stringify({
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
      'goal-feasibility',
      'gemini-3-flash-preview',
      usage,
      latencyMs,
      sb
    )

    return NextResponse.json(data)

  } catch (error) {
    // Enhanced error logging for Vercel visibility
    console.error('[GOAL-FEASIBILITY] Top-level error caught');
    console.error('[GOAL-FEASIBILITY] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[GOAL-FEASIBILITY] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[GOAL-FEASIBILITY] Error stack:', error instanceof Error ? error.stack : 'N/A');
    
    // Log structured error details
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.headers.get('x-vercel-id') || 'unknown'
    };
    console.error('[GOAL-FEASIBILITY] Structured error:', JSON.stringify(errorDetails, null, 2));
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to analyze goal feasibility', details: errorMessage }, 
      { status: 500 }
    )
  }
}
