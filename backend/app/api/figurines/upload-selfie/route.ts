import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../lib/supabaseServer';
import { generateImage } from '../../../../lib/ai/gemini';
import { v4 as uuidv4 } from 'uuid';

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  return bytes.toString('base64');
}

async function base64ToBlob(base64: string, mimeType: string = 'image/png'): Promise<Blob> {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');
  // Create blob from buffer
  return new Blob([buffer], { type: mimeType });
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
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
    const fileData = (formData as any).get('file');
    
    // Handle both web File objects and React Native file objects
    let file: File | null = null;
    if (fileData instanceof File) {
      file = fileData;
    } else if (fileData && typeof fileData === 'object' && fileData.uri) {
      // React Native file object - fetch from URI
      try {
        const response = await fetch(fileData.uri);
        const blob = await response.blob();
        file = new File([blob], fileData.name || 'selfie.jpg', { type: fileData.type || blob.type });
      } catch (error) {
        console.error('Error fetching file from URI:', error);
        return NextResponse.json(
          { error: 'Failed to process image file' },
          { status: 400 }
        );
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Convert file to base64 for Gemini
    const base64Image = await fileToBase64(file);
    const mimeType = file.type || 'image/jpeg';

    // Generate figurine using Gemini
    console.log('🎨 Generating figurine from selfie...');
    const prompt = `Make a miniature, full-body, isometric, realistic figurine of this person facing straight on with their arms down by their sides on a transparent background. Dress the figurine in a plain white crew-neck t-shirt, mid-blue straight-leg jeans, and clean white trainers. Minimal, 4K resolution, studio lighting, soft shadows, no text/logos. Make the person slightly more attractive and fashionable.`;
    
    let generatedImageData: string;
    try {
      const result = await generateImage({
        prompt,
        referenceImage: {
          data: base64Image,
          mimeType: mimeType
        }
      });
      generatedImageData = result.imageData;
      console.log('✅ Figurine generated successfully');
    } catch (error) {
      console.error('❌ Error generating figurine:', error);
      return NextResponse.json(
        { error: 'Failed to generate figurine. Please try again.' },
        { status: 500 }
      );
    }

    // Convert base64 image data to Blob for storage
    const imageBlob = await base64ToBlob(generatedImageData, 'image/png');
    const imageFile = new File([imageBlob], 'figurine.png', { type: 'image/png' });

    // Generate storage path
    const fileId = uuidv4();
    const storagePath = `${user.id}/figurine-${fileId}.png`;

    // Upload generated figurine to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('figurines')
      .upload(storagePath, imageFile, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading figurine:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload figurine' },
        { status: 500 }
      );
    }

    // Get signed URL for the uploaded figurine
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('figurines')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to create signed URL' },
        { status: 500 }
      );
    }

    // Save figurine URL to user's profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ figurine_url: signedUrlData.signedUrl })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error updating profile with figurine URL:', profileError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      data: {
        id: fileId,
        path: storagePath,
        signed_url: signedUrlData.signedUrl,
        content_type: 'image/png'
      }
    });

  } catch (error) {
    console.error('Error in figurine upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
