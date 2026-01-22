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

/**
 * Calculate relative progression within current evolution tier
 * If evolution level is 10 and user is at level 12, show progress toward next evolution (20)
 */
function calculateSkillProgression(skillLevel: number, currentEvolutionLevel: number): string {
  // Find next milestone
  const milestones = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const currentIndex = milestones.indexOf(currentEvolutionLevel);
  const nextMilestone = currentIndex < milestones.length - 1 ? milestones[currentIndex + 1] : 100;
  
  // Calculate progress within tier
  const tierStart = currentEvolutionLevel;
  const tierEnd = nextMilestone;
  const tierRange = tierEnd - tierStart;
  const progressInTier = Math.max(0, skillLevel - tierStart);
  const percentProgress = tierRange > 0 ? Math.round((progressInTier / tierRange) * 100) : 0;
  
  return `${skillLevel} (${percentProgress}% progress toward evolution level ${nextMilestone})`;
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
    const { evolution_level, original_figurine_url, skill_levels, dream_titles } = body;

    if (!evolution_level || !original_figurine_url || !skill_levels) {
      return NextResponse.json(
        { error: 'evolution_level, original_figurine_url, and skill_levels are required' },
        { status: 400 }
      );
    }

    // Verify evolution level is valid milestone
    const milestones = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    if (!milestones.includes(evolution_level)) {
      return NextResponse.json(
        { error: 'Invalid evolution level. Must be one of: 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100' },
        { status: 400 }
      );
    }

    // Check if evolution already exists for this level
    const { data: existingEvolution, error: checkError } = await supabase
      .from('user_evolutions')
      .select('id')
      .eq('user_id', user.id)
      .eq('evolution_level', evolution_level)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing evolution:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing evolution' },
        { status: 500 }
      );
    }

    if (existingEvolution) {
      return NextResponse.json(
        { error: 'Evolution already exists for this level' },
        { status: 400 }
      );
    }

    // Fetch the original figurine image
    console.log('📥 Fetching original figurine image...');
    let originalFigurineImage: { data: string; mimeType: string };
    try {
      originalFigurineImage = await fetchImageAsBase64(original_figurine_url);
    } catch (error) {
      console.error('Error fetching original figurine:', error);
      return NextResponse.json(
        { error: 'Failed to fetch original figurine image' },
        { status: 400 }
      );
    }

    // Build skill progression text
    const skillProgressionText = Object.entries(skill_levels)
      .map(([skillName, level]: [string, any]) => {
        const progression = calculateSkillProgression(level, evolution_level);
        return `${skillName}: Level ${progression}`;
      })
      .join(', ');

    // Build dream titles text
    const dreamTitlesText = Array.isArray(dream_titles) && dream_titles.length > 0
      ? `Dreams: ${dream_titles.join(', ')}. `
      : '';

    // Generate evolution prompt
    const prompt = `Evolve this miniature figurine to reflect the user's growth and achievements. 

Original figurine: This is the base figurine - maintain the person's core appearance and identity.

Current skill progression (relative to evolution tier ${evolution_level}): ${skillProgressionText}

${dreamTitlesText}

Based on the skill levels and dreams, evolve the figurine by:
- Updating clothing/outfit to reflect the user's primary skills (e.g., athletic wear for Fitness, business attire for Business/Career, creative clothing for Creativity/Music)
- Adding items or accessories that represent their skills (e.g., weights for Strength, books for Learning, instruments for Music)
- Adjusting pose or action to show engagement with their skills
- Subtle visual improvements that show progression (better posture, more confident stance, refined appearance)

Keep the same isometric, realistic style on a dark blue background. Maintain 4K resolution, studio lighting, soft shadows, no text/logos. The evolution should be noticeable but not dramatic - show growth and refinement. Make the person slightly more attractive and fashionable.`;

    console.log('🎨 Generating evolved figurine...');
    let generatedImageData: string;
    try {
      const result = await generateImage({
        prompt,
        referenceImage: originalFigurineImage
      });
      generatedImageData = result.imageData;
      console.log('✅ Evolved figurine generated successfully');
    } catch (error) {
      console.error('❌ Error generating evolved figurine:', error);
      return NextResponse.json(
        { error: 'Failed to generate evolved figurine. Please try again.' },
        { status: 500 }
      );
    }

    // Convert base64 image data to Blob for storage
    const imageBlob = await base64ToBlob(generatedImageData, 'image/png');
    const imageFile = new File([imageBlob], 'evolution.png', { type: 'image/png' });

    // Generate storage path
    const fileId = uuidv4();
    const storagePath = `${user.id}/evolution-${evolution_level}-${fileId}.png`;

    // Upload generated figurine to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('figurines')
      .upload(storagePath, imageFile, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading evolved figurine:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload evolved figurine' },
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

    // Create evolution record
    const { data: evolutionRecord, error: evolutionError } = await supabase
      .from('user_evolutions')
      .insert({
        user_id: user.id,
        evolution_level: evolution_level,
        figurine_url: signedUrlData.signedUrl,
        skill_levels_snapshot: skill_levels,
        dream_titles_snapshot: Array.isArray(dream_titles) ? dream_titles : []
      })
      .select()
      .single();

    if (evolutionError) {
      console.error('Error creating evolution record:', evolutionError);
      return NextResponse.json(
        { error: 'Failed to create evolution record' },
        { status: 500 }
      );
    }

    // Update profile with new figurine URL and evolution level
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        figurine_url: signedUrlData.signedUrl,
        current_evolution_level: evolution_level
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      data: {
        id: evolutionRecord.id,
        evolution_level: evolution_level,
        figurine_url: signedUrlData.signedUrl,
        path: storagePath
      }
    });

  } catch (error) {
    console.error('Error in evolution generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
