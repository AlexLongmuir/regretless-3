/**
 * Feedback Processing Service
 * Processes user feedback and adjusts action plans accordingly
 */

import { executePromptChainWithRetry } from './prompt-chains';
import { createClient } from '@supabase/supabase-js';
import { getActionPlanById, getUserResponses } from './action-planning';
import type { 
  Database, 
  ActionPlan, 
  PlanFeedback,
  FeedbackProcessingInput, 
  FeedbackProcessingOutput,
  UserResponse 
} from '../database/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export interface ProcessedFeedbackResult {
  updatedPlanId: string;
  feedbackId: string;
  updatedActionPlan: FeedbackProcessingOutput['updated_action_plan'];
  feedbackAnalysis: FeedbackProcessingOutput['feedback_analysis'];
  changesMade: string[];
  rationale: string[];
  qualityScore: number;
  version: number;
}

/**
 * Process user feedback and update action plan
 */
export async function processFeedbackAndUpdatePlan(
  planId: string,
  feedbackText: string,
  feedbackType?: string
): Promise<ProcessedFeedbackResult> {
  // Get the original plan
  const originalPlan = await getActionPlanById(planId);
  if (!originalPlan) {
    throw new Error('Original action plan not found');
  }
  
  // Get user responses for context
  const userResponses = await getUserResponses(originalPlan.goal_id);
  
  // Get the goal (we'll need this for context)
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', originalPlan.goal_id)
    .single();
  
  if (goalError) {
    throw new Error(`Failed to get goal: ${goalError.message}`);
  }
  
  // Store the feedback
  const feedbackData: Omit<PlanFeedback, 'id' | 'created_at'> = {
    plan_id: planId,
    feedback_text: feedbackText,
    feedback_type: feedbackType
  };
  
  const { data: feedback, error: feedbackError } = await supabase
    .from('plan_feedback')
    .insert(feedbackData)
    .select()
    .single();
  
  if (feedbackError) {
    throw new Error(`Failed to store feedback: ${feedbackError.message}`);
  }
  
  // Input for the prompt chain
  const input: FeedbackProcessingInput = {
    original_plan: originalPlan.plan_data,
    user_feedback: feedbackText,
    goal: goal.improved_goal || goal.original_goal,
    user_responses: userResponses
  };
  
  // Execute the prompt chain (planner -> critic -> rewriter if needed)
  const result = await executePromptChainWithRetry<FeedbackProcessingOutput>(
    'feedback-processing',
    input,
    7.0, // Quality threshold
    2    // Max retries
  );
  
  // Validate the updated plan structure
  if (!result.result.updated_action_plan.phases || result.result.updated_action_plan.phases.length === 0) {
    throw new Error('Updated action plan must contain at least one phase');
  }
  
  // Get the current highest version for this goal
  const { data: existingPlans, error: versionError } = await supabase
    .from('action_plans')
    .select('version')
    .eq('goal_id', originalPlan.goal_id)
    .order('version', { ascending: false })
    .limit(1);
  
  if (versionError) {
    throw new Error(`Failed to get existing plan versions: ${versionError.message}`);
  }
  
  const nextVersion = existingPlans && existingPlans.length > 0 ? existingPlans[0].version + 1 : 1;
  
  // Mark the current plan as not current
  await supabase
    .from('action_plans')
    .update({ is_current: false })
    .eq('goal_id', originalPlan.goal_id)
    .eq('is_current', true);
  
  // Store the updated action plan
  const updatedPlanData: Omit<ActionPlan, 'id' | 'created_at'> = {
    goal_id: originalPlan.goal_id,
    plan_data: result.result.updated_action_plan,
    version: nextVersion,
    is_current: true
  };
  
  const { data: updatedPlan, error } = await supabase
    .from('action_plans')
    .insert(updatedPlanData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to store updated action plan: ${error.message}`);
  }
  
  return {
    updatedPlanId: updatedPlan.id,
    feedbackId: feedback.id,
    updatedActionPlan: result.result.updated_action_plan,
    feedbackAnalysis: result.result.feedback_analysis,
    changesMade: result.result.changes_made,
    rationale: result.result.rationale,
    qualityScore: result.finalScore,
    version: nextVersion
  };
}

/**
 * Get all feedback for a specific plan
 */
export async function getFeedbackForPlan(planId: string): Promise<PlanFeedback[]> {
  const { data: feedback, error } = await supabase
    .from('plan_feedback')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to get feedback for plan: ${error.message}`);
  }
  
  return feedback || [];
}

/**
 * Get all feedback for a goal (across all plan versions)
 */
export async function getFeedbackForGoal(goalId: string): Promise<(PlanFeedback & { plan_version: number })[]> {
  const { data: feedback, error } = await supabase
    .from('plan_feedback')
    .select(`
      *,
      action_plans!inner(version)
    `)
    .eq('action_plans.goal_id', goalId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to get feedback for goal: ${error.message}`);
  }
  
  return (feedback || []).map(f => ({
    ...f,
    plan_version: (f as any).action_plans.version
  }));
}

/**
 * Get feedback by ID
 */
export async function getFeedbackById(feedbackId: string): Promise<PlanFeedback | null> {
  const { data: feedback, error } = await supabase
    .from('plan_feedback')
    .select('*')
    .eq('id', feedbackId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get feedback: ${error.message}`);
  }
  
  return feedback;
}

/**
 * Get feedback statistics for a goal
 */
export async function getFeedbackStats(goalId: string): Promise<{
  totalFeedback: number;
  feedbackTypes: Record<string, number>;
  planVersionsWithFeedback: number[];
  averageFeedbackPerPlan: number;
}> {
  const feedback = await getFeedbackForGoal(goalId);
  
  const totalFeedback = feedback.length;
  
  // Count feedback by type
  const feedbackTypes: Record<string, number> = {};
  feedback.forEach(f => {
    const type = f.feedback_type || 'general';
    feedbackTypes[type] = (feedbackTypes[type] || 0) + 1;
  });
  
  // Get unique plan versions that received feedback
  const planVersionsWithFeedback = [...new Set(feedback.map(f => f.plan_version))];
  
  // Calculate average feedback per plan
  const averageFeedbackPerPlan = planVersionsWithFeedback.length > 0 
    ? totalFeedback / planVersionsWithFeedback.length 
    : 0;
  
  return {
    totalFeedback,
    feedbackTypes,
    planVersionsWithFeedback,
    averageFeedbackPerPlan
  };
}

/**
 * Process multiple feedback items in batch
 */
export async function processBatchFeedback(
  feedbackItems: Array<{
    planId: string;
    feedbackText: string;
    feedbackType?: string;
  }>
): Promise<ProcessedFeedbackResult[]> {
  const results: ProcessedFeedbackResult[] = [];
  
  // Process feedback sequentially to maintain plan version order
  for (const item of feedbackItems) {
    try {
      const result = await processFeedbackAndUpdatePlan(
        item.planId,
        item.feedbackText,
        item.feedbackType
      );
      results.push(result);
    } catch (error) {
      console.error(`Failed to process feedback for plan ${item.planId}:`, error);
      // Continue with other feedback items
    }
  }
  
  return results;
}