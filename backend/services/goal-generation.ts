/**
 * Goal Generation Service
 * Improves user goals using the planner -> critic -> rewriter chain
 */

import { executePromptChainWithRetry } from './prompt-chains';
import { createClient } from '@supabase/supabase-js';
import type { Database, Goal, GoalGenerationInput, GoalGenerationOutput } from '../database/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export interface ImprovedGoalResult {
  goalId: string;
  originalGoal: string;
  improvedGoal: string;
  keyImprovements: string[];
  successMetrics: string[];
  timeline: string;
  qualityScore: number;
}

/**
 * Generate an improved goal from user's original goal
 */
export async function generateImprovedGoal(
  userId: string,
  originalGoal: string
): Promise<ImprovedGoalResult> {
  // Input for the prompt chain
  const input: GoalGenerationInput = {
    original_goal: originalGoal
  };
  
  // Execute the prompt chain (planner -> critic -> rewriter if needed)
  const result = await executePromptChainWithRetry<GoalGenerationOutput>(
    'goal-generation',
    input,
    7.0, // Quality threshold
    2    // Max retries
  );
  
  // Store the goal in database
  const goalData: Omit<Goal, 'id' | 'created_at' | 'updated_at'> = {
    user_id: userId,
    original_goal: originalGoal,
    improved_goal: result.result.improved_goal,
    goal_metadata: {
      key_improvements: result.result.key_improvements,
      success_metrics: result.result.success_metrics,
      timeline: result.result.timeline
    }
  };
  
  const { data: goal, error } = await supabase
    .from('goals')
    .insert(goalData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to store goal: ${error.message}`);
  }
  
  return {
    goalId: goal.id,
    originalGoal: originalGoal,
    improvedGoal: result.result.improved_goal,
    keyImprovements: result.result.key_improvements,
    successMetrics: result.result.success_metrics,
    timeline: result.result.timeline,
    qualityScore: result.finalScore
  };
}

/**
 * Get user's goals from database
 */
export async function getUserGoals(userId: string): Promise<Goal[]> {
  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to get user goals: ${error.message}`);
  }
  
  return goals || [];
}

/**
 * Get a specific goal by ID (with user authorization)
 */
export async function getGoalById(goalId: string, userId: string): Promise<Goal | null> {
  const { data: goal, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get goal: ${error.message}`);
  }
  
  return goal;
}

/**
 * Update an existing goal
 */
export async function updateGoal(
  goalId: string,
  userId: string,
  updates: Partial<Pick<Goal, 'improved_goal' | 'goal_metadata'>>
): Promise<Goal> {
  const { data: goal, error } = await supabase
    .from('goals')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update goal: ${error.message}`);
  }
  
  return goal;
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to delete goal: ${error.message}`);
  }
}

/**
 * Regenerate improved goal with different parameters
 */
export async function regenerateImprovedGoal(
  goalId: string,
  userId: string,
  qualityThreshold: number = 7.5
): Promise<ImprovedGoalResult> {
  // Get the existing goal
  const existingGoal = await getGoalById(goalId, userId);
  if (!existingGoal) {
    throw new Error('Goal not found');
  }
  
  // Regenerate with higher threshold
  const input: GoalGenerationInput = {
    original_goal: existingGoal.original_goal
  };
  
  const result = await executePromptChainWithRetry<GoalGenerationOutput>(
    'goal-generation',
    input,
    qualityThreshold,
    2
  );
  
  // Update the existing goal
  const updatedGoal = await updateGoal(goalId, userId, {
    improved_goal: result.result.improved_goal,
    goal_metadata: {
      key_improvements: result.result.key_improvements,
      success_metrics: result.result.success_metrics,
      timeline: result.result.timeline
    }
  });
  
  return {
    goalId: updatedGoal.id,
    originalGoal: updatedGoal.original_goal,
    improvedGoal: result.result.improved_goal,
    keyImprovements: result.result.key_improvements,
    successMetrics: result.result.success_metrics,
    timeline: result.result.timeline,
    qualityScore: result.finalScore
  };
}