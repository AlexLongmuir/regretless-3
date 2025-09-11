import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../../lib/supabaseServer';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
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

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // Extract form data values using type assertions
    const fileData = (formData as any).get('file');
    const occurrenceId = (formData as any).get('occurrenceId') as string | null;
    const replaceArtifactId = (formData as any).get('replaceArtifactId') as string | null;

    // Handle both web File objects and React Native file objects
    let file: File | null = null;
    if (fileData instanceof File) {
      file = fileData;
    } else if (fileData && typeof fileData === 'object' && fileData.uri) {
      // React Native file object - we'll need to fetch the file from the URI
      try {
        const response = await fetch(fileData.uri);
        const blob = await response.blob();
        file = new File([blob], fileData.name || 'image.jpg', { type: fileData.type || blob.type });
      } catch (error) {
        console.error('Error fetching file from URI:', error);
        return NextResponse.json(
          { error: 'Failed to process file' },
          { status: 400 }
        );
      }
    }

    if (!file || !occurrenceId) {
      return NextResponse.json(
        { error: 'File and occurrence ID are required' },
        { status: 400 }
      );
    }

    // Verify the occurrence exists and belongs to the user
    const { data: occurrence, error: occurrenceError } = await supabase
      .from('action_occurrences')
      .select(`
        id,
        action_id,
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
    const storagePath = `${user.id}/${occurrenceId}/${fileId}.${fileExtension}`;

    // Upload file directly to Supabase Storage
    // Use the file object directly as Supabase handles the conversion
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('artifacts')
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

    // Create artifact record in database
    const { data: artifact, error: artifactError } = await supabase
      .from('action_artifacts')
      .insert({
        occurrence_id: occurrenceId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        kind: 'photo', // Default to 'photo' for image uploads
        metadata: {
          uploaded_at: new Date().toISOString(),
          original_name: file.name
        }
      })
      .select()
      .single();

    if (artifactError) {
      console.error('Error creating artifact record:', artifactError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('artifacts').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create artifact record' },
        { status: 500 }
      );
    }

    // If replacing an existing artifact, delete the old one
    if (replaceArtifactId) {
      const { data: oldArtifact, error: oldArtifactError } = await supabase
        .from('action_artifacts')
        .select('storage_path')
        .eq('id', replaceArtifactId)
        .eq('occurrence_id', occurrenceId)
        .single();

      if (!oldArtifactError && oldArtifact) {
        // Delete old file from storage
        await supabase.storage.from('artifacts').remove([oldArtifact.storage_path]);
        
        // Delete old artifact record
        await supabase
          .from('action_artifacts')
          .delete()
          .eq('id', replaceArtifactId);
      }
    }

    // Generate signed URL for the uploaded file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('artifacts')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...artifact,
        signed_url: signedUrlData?.signedUrl
      },
      message: 'File uploaded successfully' 
    });

  } catch (error) {
    console.error('Error in upload artifact API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
