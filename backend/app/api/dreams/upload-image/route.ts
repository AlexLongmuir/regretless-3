import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dreamId = formData.get('dreamId') as string;

    if (!file || !dreamId) {
      return NextResponse.json(
        { error: 'File and dream ID are required' },
        { status: 400 }
      );
    }

    // Verify the dream exists and belongs to the user
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('id, user_id')
      .eq('id', dreamId)
      .eq('user_id', user.id)
      .single();

    if (dreamError || !dream) {
      return NextResponse.json(
        { error: 'Dream not found' },
        { status: 404 }
      );
    }

    // Generate file extension from MIME type
    const getFileExtension = (mimeType: string) => {
      const mimeToExt: { [key: string]: string } = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/heic': 'heic',
        'image/heif': 'heif'
      };
      return mimeToExt[mimeType] || 'jpg';
    };

    const fileExtension = getFileExtension(file.type);
    const fileId = uuidv4();
    const storagePath = `${user.id}/${dreamId}/${fileId}.${fileExtension}`;

    // Upload file to Supabase Storage in dream-images bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dream-images')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get signed URL for the uploaded image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('dream-images')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to create signed URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: fileId,
        path: storagePath,
        signed_url: signedUrlData.signedUrl,
        content_type: file.type,
        size: file.size
      }
    });

  } catch (error) {
    console.error('Error in dream image upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
