import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

export async function DELETE(request: NextRequest) {
  try {
    const { occurrenceId } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: 'Occurrence ID is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Get the occurrence to verify it exists and get the action_id
    const { data: occurrence, error: fetchError } = await supabase
      .from('action_occurrences')
      .select('id, action_id')
      .eq('id', occurrenceId)
      .single();

    if (fetchError || !occurrence) {
      return NextResponse.json(
        { error: 'Action occurrence not found' },
        { status: 404 }
      );
    }

    // Delete the occurrence
    const { error: deleteError } = await supabase
      .from('action_occurrences')
      .delete()
      .eq('id', occurrenceId);

    if (deleteError) {
      console.error('Error deleting action occurrence:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete action occurrence' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Action occurrence deleted successfully' 
    });

  } catch (error) {
    console.error('Error in delete action occurrence API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
