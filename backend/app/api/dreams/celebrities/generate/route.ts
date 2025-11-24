import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth, supabaseServer } from '../../../../../lib/supabaseServer';
import { generateJson, GEMINI_MODEL } from '../../../../../lib/ai/gemini';
import { CELEBRITY_DREAMS_SYSTEM } from '../../../../../lib/ai/prompts';
import { CELEBRITY_DREAMS_SCHEMA } from '../../../../../lib/ai/schemas';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    // Allow unauthenticated access for onboarding preview
    const isOnboarding = !token;
    
    console.log('🎯 Celebrity dream generation request:', {
      hasToken: !!token,
      isOnboarding,
      tokenLength: token?.length || 0
    });
    
    let user = null;
    let sb = null;
    if (token) {
      sb = supabaseServerAuth(token);
      const { data: userData } = await sb.auth.getUser();
      user = userData?.user;
      console.log('👤 User authentication:', {
        authenticated: !!user,
        userId: user?.id || 'none'
      });
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name: string = body.custom_name || body.celebrity_name || body.name || '';
    if (!name) return NextResponse.json({ error: 'Missing celebrity name' }, { status: 400 });

    // Normalize celebrity name to lowercase for consistent lookups
    const normalizedName = name.toLowerCase().trim();

    // Check for existing dreams (works for both authenticated and onboarding)
    console.log('🔍 Checking database for existing dreams for celebrity:', normalizedName);
    try {
      // During onboarding, use service role to bypass RLS and check all users' dreams
      // During authenticated flow, use the authenticated client
      const queryClient = isOnboarding ? supabaseServer() : sb;
      
      if (!queryClient) {
        console.error('❌ No query client available');
        throw new Error('No query client available');
      }
      
      if (isOnboarding) {
        console.log('🔓 Onboarding mode: using service role to check database');
      }
      
      // Fetch celebrity dreams (for authenticated: user's dreams, for onboarding: all dreams)
      let query = queryClient
        .from('ai_generated_dreams')
        .select('id, title, emoji, source_type, source_data, created_at')
        .eq('source_type', 'celebrity');
      
      // If authenticated, filter by user_id
      if (!isOnboarding && user) {
        query = query.eq('user_id', user.id);
      }
      
      const { data: allDreams, error: queryError } = await query;

      if (queryError) {
        console.error('❌ Error querying existing dreams:', queryError);
      } else if (allDreams && allDreams.length > 0) {
        console.log('📊 Retrieved', allDreams.length, 'celebrity dreams from database');
        // Log all celebrity names found for debugging
        const celebNames = allDreams.map((d: any) => d.source_data?.celebrity_name).filter(Boolean);
        console.log('📋 Celebrity names in database:', [...new Set(celebNames)]);
        
        // Filter by normalized celebrity name (case-insensitive)
        const existing = allDreams.filter((d: any) => {
          const celebName = d.source_data?.celebrity_name?.toLowerCase()?.trim();
          const matches = celebName === normalizedName;
          if (matches) {
            console.log('✅ Match found:', celebName, '===', normalizedName);
          }
          return matches;
        });

        if (existing.length > 0) {
          console.log('✅ Found existing dreams in database:', existing.length, 'for', normalizedName);
          // Return existing dreams in the expected format
          // For onboarding, return unique dreams (deduplicate by title)
          const uniqueDreams = existing.reduce((acc: any[], dream: any) => {
            if (!acc.find(d => d.title === dream.title)) {
              acc.push(dream);
            }
            return acc;
          }, []);
          
          const formattedDreams = uniqueDreams.map((d: any) => ({
            title: d.title,
            emoji: d.emoji,
            reasoning: d.source_data?.reasoning,
          }));
          return NextResponse.json({ success: true, data: { dreams: formattedDreams } });
        } else {
          console.log('📭 No existing dreams found for', normalizedName, '(checked', allDreams.length, 'total celebrity dreams)');
          console.log('🔍 Looking for:', normalizedName);
          console.log('📋 Available names:', [...new Set(celebNames.map((n: string) => n?.toLowerCase()?.trim()).filter(Boolean))]);
        }
      } else {
        console.log('📭 No celebrity dreams found in database', isOnboarding ? '(across all users)' : 'for user');
      }
    } catch (checkError) {
      console.error('⚠️ Error checking for existing dreams:', checkError);
      // Continue to generation if check fails
    }

    // Generate new dreams
    console.log('🆕 Generating new dreams for celebrity:', normalizedName);
    const prompt = `Generate 3-5 distinct, concrete dreams for someone inspired by ${name}. Avoid duplicates and keep them actionable.`;

    const { data } = await generateJson({
      system: CELEBRITY_DREAMS_SYSTEM,
      messages: [{ text: prompt }],
      schema: CELEBRITY_DREAMS_SCHEMA,
      maxOutputTokens: 1000,
      modelId: GEMINI_MODEL,
    });

    const dreams: Array<{ title: string; emoji: string; reasoning?: string }> = data?.dreams ?? [];

    // Persist to ai_generated_dreams only if authenticated
    if (!isOnboarding && user && sb && Array.isArray(dreams) && dreams.length > 0) {
      try {
        const rows = dreams.map((d) => ({
          user_id: user.id,
          title: d.title,
          emoji: d.emoji,
          source_type: 'celebrity',
          source_data: { celebrity_name: normalizedName },
        }));
        
        console.log('💾 Storing', rows.length, 'dreams in database');
        const { data: inserted, error: insertError } = await sb
          .from('ai_generated_dreams')
          .insert(rows)
          .select('id');
        
        if (insertError) {
          console.error('❌ Failed to insert dreams:', insertError);
          // Still return the dreams even if insert fails
        } else {
          console.log('✅ Successfully stored', inserted?.length || 0, 'dreams in database');
        }
      } catch (insertError) {
        console.error('❌ Error inserting dreams:', insertError);
        // Still return the dreams even if insert fails
      }
    }

    return NextResponse.json({ success: true, data: { dreams } });
  } catch (error) {
    console.error('Celebrity dream generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


