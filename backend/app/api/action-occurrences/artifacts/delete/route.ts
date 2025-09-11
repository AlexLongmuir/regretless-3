import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../../lib/supabaseServer';

export async function DELETE(request: NextRequest) {
  try {
    const { artifactId } = await request.json();

    if (!artifactId) {
      return NextResponse.json(
        { error: 'Artifact ID is required' },
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

    // Get the artifact and verify ownership
    const { data: artifact, error: artifactError } = await supabase
      .from('action_artifacts')
      .select(`
        id,
        storage_path,
        occurrence_id,
        action_occurrences!inner(
          id,
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
        )
      `)
      .eq('id', artifactId)
      .single();

    if (artifactError || !artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('artifacts')
      .remove([artifact.storage_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete the artifact record from database
    const { error: deleteError } = await supabase
      .from('action_artifacts')
      .delete()
      .eq('id', artifactId);

    if (deleteError) {
      console.error('Error deleting artifact record:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete artifact' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Artifact deleted successfully' 
    });

  } catch (error) {
    console.error('Error in delete artifact API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
