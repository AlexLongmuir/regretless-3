import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../lib/supabaseServer';

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { areaId } = await request.json();

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

    // Call the database function to soft delete the area and cascade to actions
    const { error: deleteError } = await supabase.rpc('soft_delete_area', {
      p_area_id: areaId
    });

    if (deleteError) {
      console.error('Error deleting area:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete area' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Area deleted successfully' 
    });

  } catch (error) {
    console.error('Error in delete area API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

