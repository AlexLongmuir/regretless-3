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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:34',message:'POST request received',data:{hasAuthHeader:!!request.headers.get('authorization')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_1'})}).catch(()=>{});
  // #endregion
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:38',message:'Auth header missing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_1'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:49',message:'User auth failed',data:{userError:userError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_1'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { figurine_url, dream_title, area_title, area_context, area_id } = body;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:57',message:'Request body parsed',data:{hasFigurineUrl:!!figurine_url,hasDreamTitle:!!dream_title,hasAreaTitle:!!area_title,hasAreaId:!!area_id,area_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_2'})}).catch(()=>{});
    // #endregion

    if (!figurine_url || !dream_title || !area_title || !area_id) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:59',message:'Missing required fields',data:{hasFigurineUrl:!!figurine_url,hasDreamTitle:!!dream_title,hasAreaTitle:!!area_title,hasAreaId:!!area_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_2'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'figurine_url, dream_title, area_title, and area_id are required' },
        { status: 400 }
      );
    }

    // Verify the area exists and belongs to the user
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('id, user_id, dream_id')
      .eq('id', area_id)
      .eq('user_id', user.id)
      .single();

    if (areaError || !area) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:74',message:'Area not found',data:{area_id,areaError:areaError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_2'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Area not found' },
        { status: 404 }
      );
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:79',message:'Area verified, starting generation',data:{area_id,dreamId:area.dream_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_3'})}).catch(()=>{});
    // #endregion

    // Fetch the figurine image
    console.log('📥 Fetching figurine image...');
    let figurineImage: { data: string; mimeType: string };
    try {
      figurineImage = await fetchImageAsBase64(figurine_url);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:113',message:'Figurine fetched OK',data:{mimeType:figurineImage?.mimeType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_3'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      console.error('Error fetching figurine:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:116',message:'Figurine fetch failed',data:{error:(error as any)?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_3'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Failed to fetch figurine image' },
        { status: 400 }
      );
    }

    // Generate area-specific image
    console.log('🎨 Generating area-specific image...');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:122',message:'About to call generateImage',data:{areaTitle:area_title,hasAreaContext:!!area_context},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_4'})}).catch(()=>{});
    // #endregion
    const prompt = `Create a scene featuring this miniature figurine that represents the area: "${area_title}". ${area_context ? `Context: ${area_context}.` : ''} Adapt the figurine's outfit and pose to match the area theme. Create an appropriate background that fits the area context on a dark blue background. Make it isometric, realistic, 4K resolution, studio lighting, soft shadows, no text/logos. Make the person slightly more attractive and fashionable.`;
    
    let generatedImageData: string;
    try {
      const result = await generateImage({
        prompt,
        referenceImage: figurineImage
      });
      generatedImageData = result.imageData;
      console.log('✅ Area image generated successfully');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:132',message:'generateImage returned',data:{hasImageData:!!generatedImageData,approxLen:generatedImageData?generatedImageData.length:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_4'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      console.error('❌ Error generating area image:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:134',message:'generateImage threw',data:{error:(error as any)?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_4'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Failed to generate area image. Please try again.' },
        { status: 500 }
      );
    }

    // Convert base64 image data to Blob for storage
    const imageBlob = await base64ToBlob(generatedImageData, 'image/png');
    const imageFile = new File([imageBlob], 'area-image.png', { type: 'image/png' });

    // Generate storage path (reuse dream-images bucket with area structure)
    const fileId = uuidv4();
    const storagePath = `${user.id}/${area.dream_id}/${area_id}/area-image-${fileId}.png`;

    // Upload generated image to Supabase Storage
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:149',message:'Uploading to storage',data:{bucket:'dream-images',storagePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_5'})}).catch(()=>{});
    // #endregion
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dream-images')
      .upload(storagePath, imageFile, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading area image:', uploadError);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:158',message:'Storage upload failed',data:{error:uploadError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_5'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Failed to upload area image' },
        { status: 500 }
      );
    }

    // Get signed URL for the uploaded image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('dream-images')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'areas/generate-image/route.ts:170',message:'Signed URL creation failed',data:{error:signedUrlError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'IMG_5'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Failed to create signed URL' },
        { status: 500 }
      );
    }

    // Update area with the generated image URL
    const { error: updateError } = await supabase
      .from('areas')
      .update({ image_url: signedUrlData.signedUrl })
      .eq('id', area_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating area image_url:', updateError);
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
    console.error('Error in area image generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
