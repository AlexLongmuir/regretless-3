import { NextResponse } from 'next/server'
import { generateJson, GEMINI_FLASH_MODEL, THINKING_BUDGETS } from '../../../../lib/ai/gemini'
import { ACTIONS_SYSTEM } from '../../../../lib/ai/prompts'
import { ACTIONS_SCHEMA } from '../../../../lib/ai/schemas'
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

    const { 
      dream_id, 
      title,
      start_date,
      end_date,
      baseline,
      obstacles,
      enjoyment,
      areas,
      feedback,
      original_actions
    } = await req.json()
    
    if (!dream_id || !title || !areas || !Array.isArray(areas) || areas.length === 0) {
      return NextResponse.json({ 
        error: 'Dream ID, title, and areas are required' 
      }, { status: 400 })
    }

    // Build the prompt with all available context
    const contextInfo = []
    if (baseline) contextInfo.push(`Current baseline: ${baseline}`)
    if (obstacles) contextInfo.push(`Potential obstacles: ${obstacles}`)
    if (enjoyment) contextInfo.push(`What they enjoy: ${enjoyment}`)
    if (start_date) contextInfo.push(`Start date: ${start_date}`)
    if (end_date) contextInfo.push(`End date: ${end_date}`)

    const contextString = contextInfo.length > 0 ? `\n\nAdditional context:\n${contextInfo.join('\n')}` : ''

    // Build areas information for the prompt
    const areasText = areas.map((area: any, index: number) => 
      `${index + 1}. ${area.title} (${area.icon || '🚀'})`
    ).join('\n')

    // Build prompt based on whether this is initial generation or feedback-based regeneration
    let prompt: string
    
    if (feedback && original_actions && original_actions.length > 0) {
      // Feedback-based regeneration
      const originalActionsText = original_actions.map((action: any, index: number) => 
        `${index + 1}. ${action.title} (${action.est_minutes}min, ${action.difficulty})`
      ).join('\n')
      
      prompt = `Regenerate actions for this dream based on user feedback:

Dream Title: "${title}"${contextString}

Area to regenerate (only this area will be updated):
${areasText}

Current actions in this area:
${originalActionsText}

User feedback: "${feedback}"

Please create 2-4 actions for this area that address the user's feedback. 

CRITICAL RULES:
- Finite series: For big finite jobs (>120 min), set slice_count_target (3-12) and use est_minutes as per-slice duration. Do NOT set repeat_every_days.
- Indefinite repeats: For ongoing habits, set repeat_every_days ∈ {1,2,3} and do NOT set slice_count_target.
- Size guidelines: >120 min → make it a series; 60-120 min → consider series; <60 min → one-off action.
- Titles: No time/cadence in titles. No brackets. Keep titles short and scope-clear.
- Acceptance criteria: ≤2 bullets, single-slice focused. Examples: "Added ≥500 words", "Scene marked Drafted".
- Ensure the first 2-3 actions in the first area are 20-45 minutes for momentum.

Note: Only regenerate actions for the area listed above.`
    } else {
      // Initial generation
      prompt = `Create execution-focused actions for this dream:

Dream Title: "${title}"${contextString}

Areas to work within:
${areasText}

Please create 2-4 actions per area that are necessary and sufficient to achieve this goal.

CRITICAL RULES:
- Finite series: For big finite jobs (>120 min), set slice_count_target (3-12) and use est_minutes as per-slice duration. Do NOT set repeat_every_days.
- Indefinite repeats: For ongoing habits, set repeat_every_days ∈ {1,2,3} and do NOT set slice_count_target.
- Size guidelines: >120 min → make it a series; 60-120 min → consider series; <60 min → one-off action.
- Titles: No time/cadence in titles. No brackets. Keep titles short and scope-clear.
- Acceptance criteria: ≤2 bullets, single-slice focused. Examples: "Added ≥500 words", "Scene marked Drafted".
- Ensure the first 2-3 actions in the first area are 20-45 minutes for momentum.
- Avoid overlapping actions across areas.

Each action should be atomic, measurable, and bounded.`
    }

    console.log('📝 Prompt being sent to AI:', prompt)

    const { data, usage } = await generateJson({
      system: ACTIONS_SYSTEM,
      messages: [{ text: prompt }],
      schema: ACTIONS_SCHEMA,
      maxOutputTokens: 8000,
      modelId: GEMINI_FLASH_MODEL, // Using Flash model (not lite)
      enableThinking: true,
      thinkingBudget: THINKING_BUDGETS.MAXIMUM // Maximum budget for complex action planning
    })

    console.log('🤖 AI Response:', JSON.stringify(data, null, 2))

    const latencyMs = Date.now() - startTime

    // Save telemetry using authenticated client
    const sb = supabaseServerAuth(token)
    await saveAIEvent(
      user.id,
      'actions',
      'gemini-2.5-flash',
      usage,
      latencyMs,
      sb
    )

    // Check if AI returned valid data
    if (!data || !data.actions || !Array.isArray(data.actions) || data.actions.length === 0) {
      console.error('❌ AI returned invalid or empty actions data:', data)
      return NextResponse.json({ error: 'AI failed to generate actions' }, { status: 500 })
    }

    // Create a mapping from area titles to area IDs
    const areaTitleToIdMap = new Map<string, string>()
    areas.forEach(area => {
      // Map both the full title and just the title part (without emoji)
      areaTitleToIdMap.set(area.title, area.id)
      areaTitleToIdMap.set(area.title.replace(/\s*\([^)]*\)\s*$/, ''), area.id) // Remove emoji part
    })

    // Convert AI response to Action objects and save to database
    const actionsToInsert = data.actions.map((action: any) => {
      // Find the correct area ID by matching the area_id from AI response
      let areaId = action.area_id
      
      // If the area_id looks like a title instead of UUID, try to find the matching area
      if (!areaId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Try to find matching area by title
        const matchingArea = areas.find(area => 
          area.title === areaId || 
          area.title.replace(/\s*\([^)]*\)\s*$/, '') === areaId ||
          areaId.includes(area.title) ||
          area.title.includes(areaId)
        )
        
        if (matchingArea) {
          areaId = matchingArea.id
        } else {
          console.warn(`⚠️ Could not find matching area for: ${action.area_id}`)
          // Fallback to first area if no match found
          areaId = areas[0]?.id || action.area_id
        }
      }

      return {
        user_id: user.id,
        dream_id,
        area_id: areaId,
        title: action.title,
        est_minutes: action.est_minutes,
        difficulty: action.difficulty,
        repeat_every_days: action.repeat_every_days || null,
        slice_count_target: action.slice_count_target || null,
        acceptance_criteria: action.acceptance_criteria || [],
        position: action.position
      }
    })

    console.log('💾 Actions to insert:', JSON.stringify(actionsToInsert, null, 2))

    // Use authenticated client for database operations
    const supabase = supabaseServerAuth(token)
    
    // Get area IDs that are being regenerated
    const regeneratingAreaIds = areas.map(area => area.id)
    
    // Only soft delete existing actions for areas that are being regenerated
    // RLS will automatically filter by user_id
    const { error: deleteError } = await supabase
      .from('actions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('dream_id', dream_id)
      .in('area_id', regeneratingAreaIds)
      .is('deleted_at', null)
    
    if (deleteError) {
      console.error('❌ Database delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to clear existing actions' }, { status: 500 })
    }
    
    // Then insert new actions
    const { error: insertError } = await supabase.from('actions').insert(actionsToInsert)
    
    if (insertError) {
      console.error('❌ Database insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save actions to database' }, { status: 500 })
    }
    
    const { data: savedActions, error: selectError } = await supabase
      .from('actions')
      .select('*')
      .eq('dream_id', dream_id)
      .is('deleted_at', null)
      .order('area_id, position')

    if (selectError) {
      console.error('❌ Database select error:', selectError)
      return NextResponse.json({ error: 'Failed to retrieve saved actions' }, { status: 500 })
    }

    console.log('✅ Saved actions:', JSON.stringify(savedActions, null, 2))
    return NextResponse.json(savedActions ?? [])

  } catch (error) {
    console.error('Actions generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate actions' }, 
      { status: 500 }
    )
  }
}