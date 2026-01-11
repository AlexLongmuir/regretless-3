import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

export async function PUT(request: NextRequest) {
  try {
    const { actionId, updates } = await request.json();

    if (!actionId) {
      return NextResponse.json(
        { error: 'Action ID is required' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Updates are required' },
        { status: 400 }
      );
    }

    // Validate allowed fields
    const allowedFields = ['title', 'est_minutes', 'difficulty', 'repeat_every_days', 'repeat_until_date', 'slice_count_target', 'acceptance_criteria', 'acceptance_intro', 'acceptance_outro'];
    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { error: `Invalid fields: ${invalidFields.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Get the action to verify it exists
    const { data: action, error: fetchError } = await supabase
      .from('actions')
      .select('id')
      .eq('id', actionId)
      .single();

    if (fetchError || !action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      );
    }

    // Update the action
    const { data: updatedAction, error: updateError } = await supabase
      .from('actions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating action:', updateError);
      return NextResponse.json(
        { error: 'Failed to update action' },
        { status: 500 }
      );
    }

    // Handle rescheduling if repeat settings changed
    if (updates.repeat_every_days !== undefined || updates.repeat_until_date !== undefined) {
      try {
        // Fetch dream to get end_date
        const { data: dream } = await supabase
          .from('dreams')
          .select('end_date, start_date')
          .eq('id', updatedAction.dream_id)
          .single();

        // Fetch existing occurrences
        const { data: occurrences } = await supabase
          .from('action_occurrences')
          .select('*')
          .eq('action_id', actionId)
          .order('occurrence_no', { ascending: true });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update/route.ts:86',message:'Rescheduling debug',data:{actionId,dreamId:updatedAction.dream_id,occurrencesCount:occurrences?.length,updates,repeatEveryDays:updatedAction.repeat_every_days,repeatUntil:updatedAction.repeat_until_date},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'reschedule-debug'})}).catch(()=>{});
        // #endregion

        if (occurrences && dream) {
          // 1. Determine effective end date
          let effectiveEndDate: Date;
          
          if (dream.end_date) {
            // Dream has a hard end date
            effectiveEndDate = new Date(dream.end_date);
            // If action has an earlier end date, respect it
            if (updatedAction.repeat_until_date) {
              const actionEnd = new Date(updatedAction.repeat_until_date);
              if (!isNaN(actionEnd.getTime()) && actionEnd < effectiveEndDate) {
                effectiveEndDate = actionEnd;
              }
            }
          } else {
            // Dream is open-ended
            if (updatedAction.repeat_until_date) {
              // User specified an end date for the action, use it
              effectiveEndDate = new Date(updatedAction.repeat_until_date);
            } else {
              // Default to 90 days from start if neither is set
              effectiveEndDate = new Date(new Date(dream.start_date).getTime() + 90 * 24 * 60 * 60 * 1000);
            }
          }

          // 2. Identify anchor occurrence
          // We keep all completed occurrences.
          // We also keep the FIRST occurrence if it's the only one or if we want to preserve the start date.
          // For simplicity, let's find the last occurrence we definitely want to keep.
          let lastKeeperIndex = -1;
          
          // Find last completed occurrence
          for (let i = occurrences.length - 1; i >= 0; i--) {
            if (occurrences[i].completed_at) {
              lastKeeperIndex = i;
              break;
            }
          }

          // If no completed occurrences, we keep the first one (occurrence_no 1) as anchor
          if (lastKeeperIndex === -1 && occurrences.length > 0) {
            lastKeeperIndex = 0;
          }

          const anchorOccurrence = lastKeeperIndex >= 0 ? occurrences[lastKeeperIndex] : null;

          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update/route.ts:130',message:'Anchor analysis',data:{lastKeeperIndex,anchorId:anchorOccurrence?.id,anchorDate:anchorOccurrence?.due_on,effectiveEndDate},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'reschedule-debug'})}).catch(()=>{});
          // #endregion

          // 3. Delete obsolete future occurrences
          // Delete all occurrences AFTER the anchor that are NOT completed (which should be all of them if we logic correctly)
          const occurrencesToDelete = occurrences.filter((occ, index) => 
            index > lastKeeperIndex && !occ.completed_at
          );
          
            if (occurrencesToDelete.length > 0) {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update/route.ts:143',message:'Deleting occurrences',data:{count:occurrencesToDelete.length,ids:occurrencesToDelete.map(o=>o.id)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'reschedule-debug'})}).catch(()=>{});
              // #endregion
              
              await supabase
                .from('action_occurrences')
                .delete()
                .in('id', occurrencesToDelete.map(o => o.id));
            }

            // 4. Generate new occurrences if repeating
            if (updatedAction.repeat_every_days && anchorOccurrence) {
              const frequency = updatedAction.repeat_every_days;
              const anchorDate = new Date(anchorOccurrence.due_on); // Use due_on or planned_due_on? due_on tracks current reality.
              
              let nextDate = new Date(anchorDate);
              nextDate.setDate(nextDate.getDate() + frequency);
              
              let nextOccurrenceNo = anchorOccurrence.occurrence_no + 1;
              const newOccurrences = [];

              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update/route.ts:160',message:'Generating new occurrences',data:{startNextDate:nextDate,effectiveEndDate,frequency},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'reschedule-debug'})}).catch(()=>{});
              // #endregion

              while (nextDate <= effectiveEndDate) {
              // Skip rest days (Sunday=0) if we want to mimic scheduler exactly, 
              // but for simple update logic we might skip this complexity or implement simple check.
              // Scheduler uses REST_DAYS = [0]. Let's respect it.
              if (nextDate.getDay() === 0) {
                nextDate.setDate(nextDate.getDate() + 1);
                if (nextDate > effectiveEndDate) break;
              }

              newOccurrences.push({
                action_id: updatedAction.id,
                dream_id: updatedAction.dream_id,
                area_id: updatedAction.area_id,
                user_id: updatedAction.user_id,
                occurrence_no: nextOccurrenceNo,
                planned_due_on: nextDate.toISOString().split('T')[0],
                due_on: nextDate.toISOString().split('T')[0],
                defer_count: 0
              });

              nextDate.setDate(nextDate.getDate() + frequency);
              nextOccurrenceNo++;
            }

              if (newOccurrences.length > 0) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update/route.ts:181',message:'Inserting new occurrences',data:{count:newOccurrences.length,first:newOccurrences[0],last:newOccurrences[newOccurrences.length-1]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'reschedule-debug'})}).catch(()=>{});
                // #endregion

                await supabase
                  .from('action_occurrences')
                  .insert(newOccurrences);
              }
            }
          }
        } catch (err) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'update/route.ts:188',message:'Error rescheduling',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'reschedule-debug'})}).catch(()=>{});
          // #endregion
          console.error('Error rescheduling occurrences during update:', err);
          // Don't fail the request, just log error as action update succeeded
        }
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedAction,
      message: 'Action updated successfully' 
    });

  } catch (error) {
    console.error('Error in update action API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
