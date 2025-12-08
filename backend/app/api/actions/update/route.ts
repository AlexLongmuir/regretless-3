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
    const allowedFields = ['title', 'est_minutes', 'difficulty', 'repeat_every_days', 'slice_count_target', 'acceptance_criteria', 'acceptance_intro', 'acceptance_outro'];
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
