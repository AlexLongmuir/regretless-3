import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

export async function PUT(request: NextRequest) {
  try {
    const { occurrenceId, updates } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: 'Occurrence ID is required' },
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
    const allowedFields = ['note', 'due_on'];
    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { error: `Invalid fields: ${invalidFields.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Get the occurrence to verify it exists
    const { data: occurrence, error: fetchError } = await supabase
      .from('action_occurrences')
      .select('id')
      .eq('id', occurrenceId)
      .single();

    if (fetchError || !occurrence) {
      return NextResponse.json(
        { error: 'Action occurrence not found' },
        { status: 404 }
      );
    }

    // Update the occurrence
    const { data: updatedOccurrence, error: updateError } = await supabase
      .from('action_occurrences')
      .update({
        ...updates,
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
      message: 'Action occurrence updated successfully' 
    });

  } catch (error) {
    console.error('Error in update action occurrence API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
