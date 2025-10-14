import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../lib/supabaseServer';

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { areaId, updates } = await request.json();

    if (!areaId) {
      return NextResponse.json(
        { error: 'Area ID is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServerAuth(token);

    // Get the area to verify it exists
    const { data: area, error: fetchError } = await supabase
      .from('areas')
      .select('id, dream_id')
      .eq('id', areaId)
      .single();

    if (fetchError || !area) {
      return NextResponse.json(
        { error: 'Area not found' },
        { status: 404 }
      );
    }

    // Update the area
    const { data: updatedArea, error: updateError } = await supabase
      .from('areas')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', areaId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating area:', updateError);
      return NextResponse.json(
        { error: 'Failed to update area' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedArea,
      message: 'Area updated successfully' 
    });

  } catch (error) {
    console.error('Error in update area API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

