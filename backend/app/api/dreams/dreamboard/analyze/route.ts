import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../../lib/supabaseServer';
import { generateJson, GEMINI_FLASH_MODEL } from '../../../../../lib/ai/gemini';
import { DREAMBOARD_ANALYSIS_SYSTEM } from '../../../../../lib/ai/prompts';
import { DREAMBOARD_ANALYSIS_SCHEMA } from '../../../../../lib/ai/schemas';

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  return bytes.toString('base64');
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    // Allow unauthenticated access for onboarding preview
    const isOnboarding = !token;
    
    let user = null;
    let sb = null;
    let signedUrl = null;
    
    if (token) {
      sb = supabaseServerAuth(token);
      const { data: userData } = await sb.auth.getUser();
      user = userData?.user;
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Next.js Request.formData type is compatible but TS lib might not include get()
    const form: any = await req.formData();
    const file = (form as any).get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

    // Store the image only if authenticated
    if (!isOnboarding && user && sb) {
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { data: uploadRes, error: uploadErr } = await sb.storage
        .from('dreamboard-images')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });

      if (uploadErr) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

      const { data: signed } = await sb.storage
        .from('dreamboard-images')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      
      signedUrl = signed?.signedUrl ?? null;
    }

    const base64 = await fileToBase64(file);

    console.error('🖼️ Analyzing dreamboard image, size:', base64.length, 'bytes');
    
    let result;
    try {
      result = await generateJson({
        system: DREAMBOARD_ANALYSIS_SYSTEM,
        messages: [
          { text: 'Analyze this dreamboard image carefully. Extract 5-10 distinct, specific, and achievable dreams represented by the imagery, words, and themes. Make each dream concrete with measurable outcomes, realistic timeframes, and clear success criteria. Ensure variety across different life aspects (fitness, style, relationships, hobbies, career, travel, skills, etc.).' },
          { inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } },
        ],
        schema: DREAMBOARD_ANALYSIS_SCHEMA,
        maxOutputTokens: 6000,
        modelId: GEMINI_FLASH_MODEL,
      });
      console.error('✅ Successfully generated dreams:', result?.data?.dreams?.length || 0);
    } catch (generateError) {
      console.error('❌ Error in generateJson:', generateError);
      throw generateError;
    }

    const dreams: Array<{ title: string; emoji: string; interpretation?: string }> = result?.data?.dreams ?? [];
    
    if (!dreams || dreams.length === 0) {
      console.error('❌ No dreams generated or invalid response structure:', result);
      throw new Error('No dreams generated from dreamboard analysis');
    }
    
    console.error('📊 Extracted', dreams.length, 'dreams from dreamboard');

    // Persist to ai_generated_dreams only if authenticated
    if (!isOnboarding && user && sb && Array.isArray(dreams) && dreams.length > 0) {
      const rows = dreams.map((d) => ({
        user_id: user.id,
        title: d.title,
        emoji: d.emoji,
        source_type: 'dreamboard',
        source_data: { image_url: signedUrl },
      }));
      await sb.from('ai_generated_dreams').insert(rows).select('id');
    }

    return NextResponse.json({ success: true, data: { dreams, image_url: signedUrl ?? null } });
  } catch (error) {
    console.error('❌ Dreamboard analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}


