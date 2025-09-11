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

    // Update the occurrence with the note
    const { data: updatedOccurrence, error: updateError } = await supabase
      .from('action_occurrences')
      .update({
        note: note || null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', occurrenceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating action occurrence:', updateError);
      return NextResponse.json(
        { error: 'Failed to update action occurrence' },
        { status: 500 }
      );
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