import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // List files in the default folder of dream-images bucket
    const { data: files, error: listError } = await supabase.storage
      .from('dream-images')
      .list('default', {
        limit: 50,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('Error listing default images:', listError);
      return NextResponse.json(
        { error: 'Failed to list default images' },
        { status: 500 }
      );
    }

    // Create signed URLs for each image
    const imagesWithUrls = await Promise.all(
      files.map(async (file) => {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('dream-images')
          .createSignedUrl(`default/${file.name}`, 60 * 60 * 24 * 365); // 1 year expiry

        if (signedUrlError) {
          console.error(`Error creating signed URL for ${file.name}:`, signedUrlError);
          return null;
        }

        return {
          id: file.name,
          name: file.name,
          signed_url: signedUrlData.signedUrl,
          content_type: file.metadata?.mimetype || 'image/jpeg',
          size: file.metadata?.size || 0
        };
      })
    );

    // Filter out any failed URL generations
    const validImages = imagesWithUrls.filter(img => img !== null);

    return NextResponse.json({
      success: true,
      data: {
        images: validImages
      }
    });

  } catch (error) {
    console.error('Error getting default images:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
