import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../../lib/supabaseServer';
import { generateJson } from '../../../../../lib/ai/gemini';
import { AI_REVIEW_SCHEMA } from '../../../../../lib/ai/schemas';
import { AI_REVIEW_SYSTEM } from '../../../../../lib/ai/prompts';

export async function POST(request: NextRequest) {
  try {
    const { occurrenceId, note, artifacts } = await request.json();

    if (!occurrenceId) {
      return NextResponse.json(
        { error: 'Occurrence ID is required' },
        { status: 400 }
      );
    }

    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = supabaseServerAuth(token);

    // Get occurrence details first
    const { data: occurrence, error: occurrenceError } = await supabase
      .from('action_occurrences')
      .select('id, note, action_id')
      .eq('id', occurrenceId)
      .single();

    if (occurrenceError || !occurrence) {
      console.error('Occurrence query error:', occurrenceError);
      return NextResponse.json(
        { error: 'Occurrence not found' },
        { status: 404 }
      );
    }

    // Get action details
    const { data: action, error: actionError } = await supabase
      .from('actions')
      .select('title, acceptance_criteria, area_id')
      .eq('id', occurrence.action_id)
      .single();

    if (actionError || !action) {
      console.error('Action query error:', actionError);
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      );
    }

    // Get area details
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('title, dream_id')
      .eq('id', action.area_id)
      .single();

    if (areaError || !area) {
      console.error('Area query error:', areaError);
      return NextResponse.json(
        { error: 'Area not found' },
        { status: 404 }
      );
    }

    // Get dream details
    const { data: dream, error: dreamError } = await supabase
      .from('dreams')
      .select('title')
      .eq('id', area.dream_id)
      .single();

    if (dreamError || !dream) {
      console.error('Dream query error:', dreamError);
      return NextResponse.json(
        { error: 'Dream not found' },
        { status: 404 }
      );
    }

    console.log('Data loaded successfully:', {
      occurrence: occurrence.id,
      action: action.title,
      area: area.title,
      dream: dream.title
    });

    // Prepare the prompt for AI review
    let prompt = `
Action: ${action.title}
Dream: ${dream.title}
Area: ${area.title}
Acceptance Criteria: ${JSON.stringify(action.acceptance_criteria || [])}
User Note: ${note || 'No note provided'}
Photos: ${artifacts?.length || 0} photo(s) uploaded

Please review this submission against the action criteria and provide a rating and feedback.
`;

    // If we have artifacts, include them in the review
    if (artifacts && artifacts.length > 0) {
      prompt += `\n\nPhoto Details:`;
      for (const artifact of artifacts) {
        prompt += `\n- ${artifact.file_name} (${artifact.mime_type})`;
      }
    }

    // Prepare messages with image data if available
    const messages: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [
      { text: prompt }
    ];

    // Add image data if we have artifacts
    if (artifacts && artifacts.length > 0) {
      for (const artifact of artifacts) {
        if (artifact.mime_type?.startsWith('image/')) {
          try {
            // Get the signed URL for the image
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('artifacts')
              .createSignedUrl(artifact.storage_path, 60); // 60 seconds expiry

            if (signedUrlError || !signedUrlData?.signedUrl) {
              console.error('Error creating signed URL for artifact:', signedUrlError);
              continue;
            }

            // Fetch the image data
            const imageResponse = await fetch(signedUrlData.signedUrl);
            if (!imageResponse.ok) {
              console.error('Error fetching image:', imageResponse.statusText);
              continue;
            }

            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            
            messages.push({
              inlineData: {
                data: base64Image,
                mimeType: artifact.mime_type
              }
            });
          } catch (error) {
            console.error('Error processing image for AI review:', error);
            // Continue without this image
          }
        }
      }
    }

    // Generate AI review
    const { data: review, usage } = await generateJson({
      system: AI_REVIEW_SYSTEM,
      messages: messages,
      schema: AI_REVIEW_SCHEMA,
      maxOutputTokens: 500,
      enableThinking: false
    });

    // Update the occurrence with AI review
    const { error: updateError } = await supabase
      .from('action_occurrences')
      .update({
        ai_rating: review.rating,
        ai_feedback: review.feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', occurrenceId);

    if (updateError) {
      console.error('Error updating occurrence with AI review:', updateError);
      return NextResponse.json(
        { error: 'Failed to save AI review' },
        { status: 500 }
      );
    }

    // Log AI usage
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('ai_events').insert({
        user_id: user.id,
        kind: 'action_review',
        model: 'gemini-2.5-flash-lite',
        prompt_tokens: usage?.promptTokenCount || 0,
        output_tokens: usage?.candidatesTokenCount || 0,
        total_tokens: usage?.totalTokenCount || 0,
        latency_ms: 0 // Usage metadata doesn't include timing
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        rating: review.rating,
        feedback: review.feedback,
        category: review.category
      }
    });

  } catch (error) {
    console.error('AI review error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI review' },
      { status: 500 }
    );
  }
}
