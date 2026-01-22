import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAuth } from '../../../../lib/supabaseServer';

// Evolution milestones: 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100...
const EVOLUTION_MILESTONES = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/**
 * Helper function to find the next available evolution milestone
 */
function getNextEvolutionMilestone(currentLevel: number, existingEvolutionLevels: number[]): number | null {
  // Find the highest milestone that the user has reached but not evolved
  for (let i = EVOLUTION_MILESTONES.length - 1; i >= 0; i--) {
    const milestone = EVOLUTION_MILESTONES[i];
    if (currentLevel >= milestone && !existingEvolutionLevels.includes(milestone)) {
      return milestone;
    }
  }
  return null;
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
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

    // Get user's overall level from view
    const { data: overallLevelData, error: levelError } = await supabase
      .from('v_user_overall_level')
      .select('overall_level')
      .eq('user_id', user.id)
      .single();

    if (levelError || !overallLevelData) {
      // If no XP data exists, user is level 1
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          evolution_level: null,
          current_level: 1
        }
      });
    }

    const currentLevel = overallLevelData.overall_level || 1;

    // Get existing evolutions for this user
    const { data: existingEvolutions, error: evolutionsError } = await supabase
      .from('user_evolutions')
      .select('evolution_level')
      .eq('user_id', user.id);

    if (evolutionsError) {
      console.error('Error fetching existing evolutions:', evolutionsError);
      return NextResponse.json(
        { error: 'Failed to check evolution status' },
        { status: 500 }
      );
    }

    const existingEvolutionLevels = (existingEvolutions || []).map(e => e.evolution_level);
    const nextMilestone = getNextEvolutionMilestone(currentLevel, existingEvolutionLevels);

    return NextResponse.json({
      success: true,
      data: {
        available: nextMilestone !== null,
        evolution_level: nextMilestone,
        current_level: currentLevel
      }
    });

  } catch (error) {
    console.error('Error in evolution check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
