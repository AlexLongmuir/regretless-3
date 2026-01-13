import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../lib/supabaseServer';

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    // Allow unauthenticated access for onboarding
    const isOnboarding = !authHeader;
    
    let supabase;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const userToken = authHeader.split(' ')[1];
      supabase = supabaseServerAuth(userToken);
    } else {
      // For onboarding, use service role to access public precreated figurines
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }

    // List precreated figurines from the precreated folder
    const { data: files, error: listError } = await supabase.storage
      .from('figurines')
      .list('precreated', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('Error listing precreated figurines:', listError);
      // Return empty array if bucket doesn't exist yet or folder is empty
      return NextResponse.json({
        success: true,
        data: { figurines: [] }
      });
    }

    // Filter for image files only
    const imageFiles = (files || []).filter(file => 
      file.name.match(/\.(png|jpg|jpeg|webp)$/i)
    );

    // Generate signed URLs for each figurine
    const figurines = await Promise.all(
      imageFiles.map(async (file) => {
        const path = `precreated/${file.name}`;
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('figurines')
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year expiry

        if (signedUrlError) {
          console.error(`Error creating signed URL for ${path}:`, signedUrlError);
          return null;
        }

        return {
          id: file.name.replace(/\.(png|jpg|jpeg|webp)$/i, ''),
          name: file.name,
          signed_url: signedUrlData.signedUrl,
          path: path
        };
      })
    );

    // Filter out null values (failed signed URL generation)
    const validFigurines = figurines.filter((f): f is NonNullable<typeof f> => f !== null);

    return NextResponse.json({
      success: true,
      data: { figurines: validFigurines }
    });

  } catch (error) {
    console.error('Error listing precreated figurines:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
