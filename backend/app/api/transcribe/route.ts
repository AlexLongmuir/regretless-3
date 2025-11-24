import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Get auth token (optional - allows unauthenticated transcription for onboarding)
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    let userId: string | null = null;
    
    // If token is provided, verify user (but don't require it)
    if (token) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }

    // Extract audio file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB for Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 25MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported audio format. Supported: mp3, m4a, wav, webm' },
        { status: 400 }
      );
    }

    console.log(`[TRANSCRIBE] Processing audio file${userId ? ` for user ${userId}` : ' (unauthenticated)'}:`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Convert File to a format OpenAI can use
    const audioBuffer = await file.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: file.type });
    
    // Create a File object for OpenAI
    const audioFile = new File([audioBlob], file.name, { type: file.type });

    // Call OpenAI Whisper API for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Optional: specify language for better accuracy
      response_format: 'text',
    });

    console.log(`[TRANSCRIBE] Transcription successful${userId ? ` for user ${userId}` : ' (unauthenticated)'}`);

    return NextResponse.json({
      success: true,
      data: {
        text: transcription
      }
    });

  } catch (error) {
    console.error('[TRANSCRIBE] Error:', error);
    
    // Handle OpenAI-specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('invalid_api_key')) {
        return NextResponse.json(
          { error: 'Transcription service configuration error' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to transcribe audio. Please try again.' },
      { status: 500 }
    );
  }
}





