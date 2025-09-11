import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../../lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ occurrenceId: string }> }
) {
  try {
    const { occurrenceId } = await params;

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
        note,
        completed_at,
        ai_rating,
        ai_feedback,
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

    // Get artifacts for this occurrence
    const { data: artifacts, error: artifactsError } = await supabase
      .from('action_artifacts')
      .select('*')
      .eq('occurrence_id', occurrenceId)
      .order('created_at', { ascending: true });

    if (artifactsError) {
      console.error('Error fetching artifacts:', artifactsError);
      return NextResponse.json(
        { error: 'Failed to fetch artifacts' },
        { status: 500 }
      );
    }

    // Generate signed URLs for each artifact
    const artifactsWithUrls = await Promise.all(
      (artifacts || []).map(async (artifact) => {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('artifacts')
          .createSignedUrl(artifact.storage_path, 3600); // 1 hour expiry

        return {
          ...artifact,
          signed_url: signedUrlError ? null : signedUrlData?.signedUrl
        };
      })
    );

    return NextResponse.json({ 
      success: true, 
      data: {
        occurrence: {
          id: occurrence.id,
          note: occurrence.note,
          completed_at: occurrence.completed_at,
          ai_rating: occurrence.ai_rating,
          ai_feedback: occurrence.ai_feedback
        },
        artifacts: artifactsWithUrls
      }
    });

  } catch (error) {
    console.error('Error in get artifacts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
