import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const { occurrenceId, note } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: 'Occurrence ID is required' },
        { status: 400 }
      );
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const userToken = authHeader.split(' ')[1];
    const supabase = supabaseServerAuth(userToken);

    // Verify the occurrence exists and belongs to the user
    const { data: occurrence, error: occurrenceError } = await supabase
      .from('action_occurrences')
      .select(`
        id,
        action_id,
        actions!inner(
          id,
          areas!inner(
            id,
            dreams!inner(
              id,
              user_id
            )
          )
        )
      `)
      .eq('id', occurrenceId)
      .single();

    if (occurrenceError || !occurrence) {
      return NextResponse.json(
        { error: 'Action occurrence not found' },
        { status: 404 }
      );
    }

    // #region agent log
    // Get occurrence data before update to check for existing occurrences
    const { data: occurrenceBeforeUpdate } = await supabase
      .from('action_occurrences')
      .select('action_id, occurrence_no, planned_due_on, dream_id, area_id, user_id, actions!inner(repeat_every_days)')
      .eq('id', occurrenceId)
      .single();
    
    // Check existing occurrences for this action
    const actionIdForQuery = occurrenceBeforeUpdate?.action_id || occurrence?.action_id || '';
    const { data: existingOccurrences } = await supabase
      .from('action_occurrences')
      .select('occurrence_no, planned_due_on')
      .eq('action_id', actionIdForQuery)
      .order('occurrence_no', { ascending: true });
    
    // Extract repeat_every_days safely (actions is an array from Supabase relationship)
    let repeatEveryDays: number | null | undefined;
    const actions = occurrenceBeforeUpdate?.actions;
    if (actions && Array.isArray(actions) && actions.length > 0) {
      const firstAction = actions[0] as { repeat_every_days?: number | null };
      repeatEveryDays = firstAction?.repeat_every_days;
    }
    
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:56',message:'Before update - occurrence data',data:{occurrenceId,actionId:occurrenceBeforeUpdate?.action_id,currentOccurrenceNo:occurrenceBeforeUpdate?.occurrence_no,dreamId:occurrenceBeforeUpdate?.dream_id,areaId:occurrenceBeforeUpdate?.area_id,userId:occurrenceBeforeUpdate?.user_id,repeatEveryDays,existingOccurrences:existingOccurrences?.map(o=>({no:o.occurrence_no,date:o.planned_due_on})),maxOccurrenceNo:existingOccurrences?.length?Math.max(...existingOccurrences.map(o=>o.occurrence_no)):0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Update the occurrence with the note and completed_at
    // Always update completed_at to current time (allows re-completion)
    const updateData = {
      note: note || null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // First, try the update
    const { error: updateError } = await supabase
      .from('action_occurrences')
      .update(updateData)
      .eq('id', occurrenceId);

    if (updateError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:68',message:'Update error detected',data:{errorCode:updateError.code,errorMessage:updateError.message,errorDetails:updateError.details,errorHint:updateError.hint,occurrenceId,actionId:occurrenceBeforeUpdate?.action_id,isDuplicateKey:updateError.code==='23505'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.error('Error updating action occurrence:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        occurrenceId
      });
      return NextResponse.json(
        { 
          error: 'Failed to update action occurrence',
          details: updateError.message || 'Unknown error',
          code: updateError.code
        },
        { status: 500 }
      );
    }
    
    // #region agent log
    // After successful update, check if trigger created new occurrence
    setTimeout(async () => {
      const { data: occurrencesAfterUpdate } = await supabase
        .from('action_occurrences')
        .select('occurrence_no, planned_due_on, completed_at')
        .eq('action_id', occurrenceBeforeUpdate?.action_id || '')
        .order('occurrence_no', { ascending: true });
      
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:95',message:'After update - occurrences after trigger',data:{actionId:occurrenceBeforeUpdate?.action_id,occurrencesAfter:occurrencesAfterUpdate?.map(o=>({no:o.occurrence_no,date:o.planned_due_on,completed:!!o.completed_at}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    }, 1000);
    // #endregion

    // Then fetch the updated occurrence separately
    const { data: updatedOccurrence, error: fetchError } = await supabase
      .from('action_occurrences')
      .select('*')
      .eq('id', occurrenceId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated occurrence:', fetchError);
      // Still return success since the update worked
      return NextResponse.json({ 
        success: true, 
        data: null,
        message: 'Action occurrence completed successfully' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedOccurrence,
      message: 'Action occurrence completed successfully' 
    });

  } catch (error) {
    console.error('Error in complete action occurrence API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}