import { NextResponse } from 'next/server'
import { generateJson, GEMINI_MODEL } from '../../../../lib/ai/gemini'
import { AREAS_SYSTEM } from '../../../../lib/ai/prompts'
import { AREAS_SCHEMA } from '../../../../lib/ai/schemas'
import { saveAIEvent } from '../../../../lib/ai/telemetry'
import { supabaseServer, supabaseServerAuth } from '../../../../lib/supabaseServer'

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ','')
  if (!token) return null
  const supabase = supabaseServer()
  const { data, error } = await supabase.auth.getUser(token)
  return data.user ?? null
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Handle GET requests (for testing/debugging)
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests',
      endpoint: '/api/create/generate-areas',
      requiredMethod: 'POST',
      example: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer <token>' // Optional for onboarding
        },
        body: {
          title: 'Your dream title',
          baseline: 'Optional baseline',
          obstacles: 'Optional obstacles',
          enjoyment: 'Optional enjoyment'
        }
      }
    },
    { status: 405 }
  )
}

export async function POST(req: Request) {
  const startTime = Date.now()
  console.log('🚀 [GENERATE-AREAS] Request received at', new Date().toISOString())
  
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ','')
    const user = token ? await getUser(req) : null
    
    // Allow unauthenticated access for onboarding preview
    const isOnboarding = !token || !user
    
    console.log('🔐 [GENERATE-AREAS] Auth check:', { isOnboarding, hasToken: !!token, hasUser: !!user })

    const requestBody = await req.json()
    console.log('📥 [GENERATE-AREAS] Request body received:', {
      title: requestBody.title,
      hasBaseline: !!requestBody.baseline,
      hasObstacles: !!requestBody.obstacles,
      hasEnjoyment: !!requestBody.enjoyment,
      hasFeedback: !!requestBody.feedback,
      hasOriginalAreas: !!requestBody.original_areas
    })
    
    const { 
      dream_id, 
      title, 
      start_date, 
      end_date, 
      baseline, 
      obstacles, 
      enjoyment,
      feedback,
      original_areas
    } = requestBody
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    
    // For onboarding, dream_id is optional
    if (!isOnboarding && !dream_id) {
      return NextResponse.json({ error: 'Dream ID is required for authenticated requests' }, { status: 400 })
    }

    // Build the prompt with all available context
    const contextInfo = []
    if (baseline) contextInfo.push(`Current baseline: ${baseline}`)
    if (obstacles) contextInfo.push(`Potential obstacles: ${obstacles}`)
    if (enjoyment) contextInfo.push(`What they enjoy: ${enjoyment}`)
    if (start_date) contextInfo.push(`Start date: ${start_date}`)
    if (end_date) contextInfo.push(`End date: ${end_date}`)

    const contextString = contextInfo.length > 0 ? `\n\nAdditional context:\n${contextInfo.join('\n')}` : ''

    // Build prompt based on whether this is initial generation or feedback-based regeneration
    let prompt: string
    
    if (feedback && original_areas && original_areas.length > 0) {
      // Feedback-based regeneration
      const originalAreasText = original_areas.map((area: any, index: number) => 
        `${index + 1}. ${area.title} (${area.icon})`
      ).join('\n')
      
      prompt = `Regenerate execution-focused areas for this dream based on user feedback:

Dream Title: "${title}"${contextString}

Current areas:
${originalAreasText}

User feedback: "${feedback}"

Please create 2-6 new orthogonal, stage-based areas that address the user's feedback while maintaining the execution-focused approach. Each area should have a clear start/end point and be non-overlapping. Focus on outcome-based stages rather than topical categories.`
    } else {
      // Initial generation
      prompt = `Create execution-focused areas for this dream:

Dream Title: "${title}"${contextString}

Please create 2-6 orthogonal, stage-based areas that represent distinct phases of work needed to achieve this goal. Each area should have a clear start/end point and be non-overlapping. Focus on outcome-based stages rather than topical categories.`
    }

    console.log('📝 Prompt being sent to AI:', prompt)

    let data, usage
    try {
      const result = await generateJson({
        system: AREAS_SYSTEM,
        messages: [{ text: prompt }],
        schema: AREAS_SCHEMA,
        maxOutputTokens: 600,
        modelId: GEMINI_MODEL // Using Flash Lite model without thinking
      })
      data = result.data
      usage = result.usage
      console.log('🤖 AI Response:', JSON.stringify(data, null, 2))
    } catch (aiError) {
      // Enhanced error logging for Vercel visibility
      console.error('[GENERATE-AREAS] AI generation failed');
      console.error('[GENERATE-AREAS] Error message:', aiError instanceof Error ? aiError.message : String(aiError));
      console.error('[GENERATE-AREAS] Error stack:', aiError instanceof Error ? aiError.stack : 'N/A');
      console.error('[GENERATE-AREAS] Error details:', JSON.stringify({
        name: aiError instanceof Error ? aiError.name : 'Unknown',
        message: aiError instanceof Error ? aiError.message : String(aiError),
        timestamp: new Date().toISOString()
      }));
      
      const aiErrorMessage = aiError instanceof Error ? aiError.message : String(aiError)
      throw new Error(`AI generation failed: ${aiErrorMessage}`)
    }

    const latencyMs = Date.now() - startTime

    // Save telemetry only for authenticated users
    if (!isOnboarding && user && token) {
      const sb = supabaseServerAuth(token)
      await saveAIEvent(
        user.id,
        'areas',
        'gemini-3-flash-preview',
        usage,
        latencyMs,
        sb
      )
    }

    // Check if AI returned valid data
    if (!data || !data.areas || !Array.isArray(data.areas) || data.areas.length === 0) {
      console.error('❌ AI returned invalid or empty areas data:', data)
      return NextResponse.json({ error: 'AI failed to generate areas' }, { status: 500 })
    }

    // Convert AI response to Area objects
    const areas = data.areas.map((area: any, index: number) => ({
      id: `temp-${Date.now()}-${index}`, // Temporary ID for onboarding
      user_id: user?.id || 'temp',
      dream_id: dream_id || 'temp',
      title: area.title,
      icon: area.emoji,
      position: index + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    console.log('💾 Generated areas:', JSON.stringify(areas, null, 2))

    // For onboarding, return the areas directly without saving to database
    if (isOnboarding) {
      console.log('✅ Returning areas for onboarding preview')
      return NextResponse.json(areas)
    }

    // For authenticated users, save to database
    const supabase = supabaseServerAuth(token!)
    
    // Convert to database format
    const areasToInsert = areas.map(area => ({
      user_id: user!.id,
      dream_id,
      title: area.title,
      icon: area.icon,
      position: area.position
    }))
    
    // First, soft delete existing areas for this dream to avoid position conflicts
    // RLS will automatically filter by user_id
    const { error: deleteError } = await supabase
      .from('areas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('dream_id', dream_id)
      .is('deleted_at', null)
    
    if (deleteError) {
      console.error('❌ Database soft delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to clear existing areas' }, { status: 500 })
    }
    
    // Then insert new areas
    const { error: insertError } = await supabase.from('areas').insert(areasToInsert)
    
    if (insertError) {
      console.error('❌ Database insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save areas to database' }, { status: 500 })
    }
    
    const { data: savedAreas, error: selectError } = await supabase
      .from('areas')
      .select('*')
      .eq('dream_id', dream_id)
      .is('deleted_at', null)
      .order('position')

    if (selectError) {
      console.error('❌ Database select error:', selectError)
      return NextResponse.json({ error: 'Failed to retrieve saved areas' }, { status: 500 })
    }

    console.log('✅ Saved areas:', JSON.stringify(savedAreas, null, 2))
    return NextResponse.json(savedAreas ?? [])

  } catch (error) {
    // Enhanced error logging for Vercel visibility
    console.error('[GENERATE-AREAS] Top-level error caught');
    console.error('[GENERATE-AREAS] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[GENERATE-AREAS] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[GENERATE-AREAS] Error stack:', error instanceof Error ? error.stack : 'N/A');
    
    // Log structured error details
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.headers.get('x-vercel-id') || 'unknown'
    };
    console.error('[GENERATE-AREAS] Structured error:', JSON.stringify(errorDetails, null, 2));
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to generate areas', details: errorMessage }, 
      { status: 500 }
    )
  }
}
