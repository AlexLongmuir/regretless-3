import { NextResponse } from 'next/server'
import { generateJson, GEMINI_MODEL } from '../../../../lib/ai/gemini'
import { TIMELINE_FEASIBILITY_SYSTEM } from '../../../../lib/ai/prompts'
import { TIMELINE_FEASIBILITY_SCHEMA } from '../../../../lib/ai/schemas'
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

    const { title, start_date, end_date, baseline, obstacles, enjoyment, timeCommitment } = await req.json()
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!timeCommitment || !timeCommitment.hours && !timeCommitment.minutes) {
      return NextResponse.json({ error: 'Time commitment is required' }, { status: 400 })
    }

    // Build the prompt with all available context
    const contextInfo = []
    if (baseline) contextInfo.push(`Current baseline: ${baseline}`)
    if (obstacles) contextInfo.push(`Potential obstacles: ${obstacles}`)
    if (enjoyment) contextInfo.push(`What they enjoy: ${enjoyment}`)
    if (start_date) contextInfo.push(`Start date: ${start_date}`)
    if (end_date) contextInfo.push(`End date: ${end_date}`)
    
    const timeCommitmentText = `${timeCommitment.hours || 0}h ${timeCommitment.minutes || 0}m daily`
    contextInfo.push(`Daily time commitment: ${timeCommitmentText}`)

    const contextString = contextInfo.length > 0 ? `\n\nAdditional context:\n${contextInfo.join('\n')}` : ''

    const today = new Date().toISOString().split('T')[0]
    
    const prompt = `Analyze this dream timeline and provide realistic suggestions:

TODAY'S DATE: ${today}

Dream Title: "${title}"${contextString}

Please provide:
1. An assessment of whether their timeline is realistic
2. A suggested end date based on their daily time commitment
3. Clear reasoning for your assessment`

    let data, usage
    try {
      const result = await generateJson({
        system: TIMELINE_FEASIBILITY_SYSTEM,
        messages: [{ text: prompt }],
        schema: TIMELINE_FEASIBILITY_SCHEMA,
        maxOutputTokens: 800,
        modelId: GEMINI_MODEL
      })
      data = result.data
      usage = result.usage
      console.log('[TIMELINE-FEASIBILITY] AI Response:', JSON.stringify(data, null, 2))
    } catch (aiError) {
      // Enhanced error logging for Vercel visibility
      console.error('[TIMELINE-FEASIBILITY] AI generation failed');
      console.error('[TIMELINE-FEASIBILITY] Error message:', aiError instanceof Error ? aiError.message : String(aiError));
      console.error('[TIMELINE-FEASIBILITY] Error stack:', aiError instanceof Error ? aiError.stack : 'N/A');
      console.error('[TIMELINE-FEASIBILITY] Error details:', JSON.stringify({
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
      'timeline-feasibility',
      'gemini-3-flash-preview',
      usage,
      latencyMs,
      sb
    )

    return NextResponse.json(data)

  } catch (error) {
    // Enhanced error logging for Vercel visibility
    console.error('[TIMELINE-FEASIBILITY] Top-level error caught');
    console.error('[TIMELINE-FEASIBILITY] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[TIMELINE-FEASIBILITY] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[TIMELINE-FEASIBILITY] Error stack:', error instanceof Error ? error.stack : 'N/A');
    
    // Log structured error details
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.headers.get('x-vercel-id') || 'unknown'
    };
    console.error('[TIMELINE-FEASIBILITY] Structured error:', JSON.stringify(errorDetails, null, 2));
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to analyze timeline feasibility', details: errorMessage }, 
      { status: 500 }
    )
  }
}
