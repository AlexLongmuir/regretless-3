import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../lib/supabaseServer';
import { generateImage } from '../../../../lib/ai/gemini';
import { v4 as uuidv4 } from 'uuid';

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';
    return {
      data: base64,
      mimeType: contentType
    };
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

async function base64ToBlob(base64: string, mimeType: string = 'image/png'): Promise<Blob> {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');
  // Create blob from buffer
  return new Blob([buffer], { type: mimeType });
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

    const body = await request.json();
    const { figurine_url, dream_title, dream_context, dream_id } = body;

    if (!figurine_url || !dream_title || !dream_id) {
      return NextResponse.json(
        { error: 'figurine_url, dream_title, and dream_id are required' },
        { status: 400 }
      );
    }

    // Verify the dream exists and belongs to the user
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('id, user_id')
      .eq('id', dream_id)
      .eq('user_id', user.id)
      .single();

    if (dreamError || !dream) {
      return NextResponse.json(
        { error: 'Dream not found' },
        { status: 404 }
      );
    }

    // Fetch the figurine image
    console.log('📥 Fetching figurine image...');
    let figurineImage: { data: string; mimeType: string };
    try {
      figurineImage = await fetchImageAsBase64(figurine_url);
    } catch (error) {
      console.error('Error fetching figurine:', error);
      return NextResponse.json(
        { error: 'Failed to fetch figurine image' },
        { status: 400 }
      );
    }

    // Generate dream-specific image
    console.log('🎨 Generating dream-specific image...');
    const prompt = `Generate an image of this figurine adapted to represent the dream: ${dream_title}. The person should be standing upright with no other objects in the scene. Change the outfit, action pose, and any items they're holding to match the dream context: ${dream_context || 'No additional context provided'}. Make the person slightly more attractive and fashionable while preserving their original hair style and outfit style. Maintain the same isometric, realistic style on a white background, minimal, 4K resolution, studio lighting, soft shadows, no text/logos.`;
    
    let generatedImageData: string;
    try {
      const result = await generateImage({
        prompt,
        referenceImage: figurineImage
      });
      generatedImageData = result.imageData;
      console.log('✅ Dream image generated successfully');
    } catch (error) {
      console.error('❌ Error generating dream image:', error);
      return NextResponse.json(
        { error: 'Failed to generate dream image. Please try again.' },
        { status: 500 }
      );
    }

    // Convert base64 image data to Blob for storage
    const imageBlob = await base64ToBlob(generatedImageData, 'image/png');
    const imageFile = new File([imageBlob], 'dream-image.png', { type: 'image/png' });

    // Generate storage path
    const fileId = uuidv4();
    const storagePath = `${user.id}/${dream_id}/dream-image-${fileId}.png`;

    // Upload generated image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dream-images')
      .upload(storagePath, imageFile, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading dream image:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload dream image' },
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

    // Update dream with the generated image URL
    const { error: updateError } = await supabase
      .from('dreams')
      .update({ image_url: signedUrlData.signedUrl })
      .eq('id', dream_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating dream image_url:', updateError);
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
    console.error('Error in dream image generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
