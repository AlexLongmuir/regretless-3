/**
 * Action Planning Service
 * Creates personalized action plans based on user goals and responses
 */

import { executePromptChainWithRetry } from './prompt-chains';
import { createClient } from '@supabase/supabase-js';
import type { 
  Database, 
  ActionPlan, 
  UserResponses, 
  ActionPlanningInput, 
  ActionPlanningOutput,
  UserResponse 
} from '../database/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export interface GeneratedActionPlanResult {
  planId: string;
  goalId: string;
  actionPlan: ActionPlanningOutput['action_plan'];
  personalizationNotes: string[];
  successTracking: string[];
  qualityScore: number;
  version: number;
}

/**
 * Generate a personalized action plan
 */
export async function generateActionPlan(
  goalId: string,
  goal: string,
  userResponses: UserResponse[]
): Promise<GeneratedActionPlanResult> {
  // Validate user responses
  if (userResponses.length !== 3) {
    throw new Error('Must provide exactly 3 user responses (experience, limitations, personalization)');
  }
  
  const requiredTypes = ['experience', 'limitations', 'personalization'];
  const responseTypes = userResponses.map(r => r.question_type);
  const hasAllTypes = requiredTypes.every(type => responseTypes.includes(type as any));
  
  if (!hasAllTypes) {
    throw new Error('User responses must include experience, limitations, and personalization types');
  }
  
  // Input for the prompt chain
  const input: ActionPlanningInput = {
    goal: goal,
    user_responses: userResponses
  };
  
  // Execute the prompt chain (planner -> critic -> rewriter if needed)
  const result = await executePromptChainWithRetry<ActionPlanningOutput>(
    'action-planning',
    input,
    7.0, // Quality threshold
    2    // Max retries
  );
  
  // Validate the action plan structure
  if (!result.result.action_plan.phases || result.result.action_plan.phases.length === 0) {
    throw new Error('Action plan must contain at least one phase');
  }
  
  // Store user responses first
  const responsesData: Omit<UserResponses, 'id' | 'created_at'> = {
    goal_id: goalId,
    responses: userResponses
  };
  
  const { error: responsesError } = await supabase
    .from('user_responses')
    .insert(responsesData);
  
  if (responsesError) {
    throw new Error(`Failed to store user responses: ${responsesError.message}`);
  }
  
  // Get the current highest version for this goal
  const { data: existingPlans, error: versionError } = await supabase
    .from('action_plans')
    .select('version')
    .eq('goal_id', goalId)
    .order('version', { ascending: false })
    .limit(1);
  
  if (versionError) {
    throw new Error(`Failed to get existing plan versions: ${versionError.message}`);
  }
  
  const nextVersion = existingPlans && existingPlans.length > 0 ? existingPlans[0].version + 1 : 1;
  
  // Mark any existing current plans as not current
  await supabase
    .from('action_plans')
    .update({ is_current: false })
    .eq('goal_id', goalId)
    .eq('is_current', true);
  
  // Store the action plan
  const planData: Omit<ActionPlan, 'id' | 'created_at'> = {
    goal_id: goalId,
    plan_data: result.result.action_plan,
    version: nextVersion,
    is_current: true
  };
  
  const { data: plan, error } = await supabase
    .from('action_plans')
    .insert(planData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to store action plan: ${error.message}`);
  }
  
  return {
    planId: plan.id,
    goalId: goalId,
    actionPlan: result.result.action_plan,
    personalizationNotes: result.result.personalization_notes,
    successTracking: result.result.success_tracking,
    qualityScore: result.finalScore,
    version: nextVersion
  };
}

/**
 * Get the current action plan for a goal
 */
export async function getCurrentActionPlan(goalId: string): Promise<ActionPlan | null> {
  const { data: plan, error } = await supabase
    .from('action_plans')
    .select('*')
    .eq('goal_id', goalId)
    .eq('is_current', true)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get current action plan: ${error.message}`);
  }
  
  return plan;
}

/**
 * Get all action plan versions for a goal
 */
export async function getActionPlanHistory(goalId: string): Promise<ActionPlan[]> {
  const { data: plans, error } = await supabase
    .from('action_plans')
    .select('*')
    .eq('goal_id', goalId)
    .order('version', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to get action plan history: ${error.message}`);
  }
  
  return plans || [];
}

/**
 * Get a specific action plan by ID
 */
export async function getActionPlanById(planId: string): Promise<ActionPlan | null> {
  const { data: plan, error } = await supabase
    .from('action_plans')
    .select('*')
    .eq('id', planId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get action plan: ${error.message}`);
  }
  
  return plan;
}

/**
 * Get user responses for a goal
 */
export async function getUserResponses(goalId: string): Promise<UserResponse[]> {
  const { data: responses, error } = await supabase
    .from('user_responses')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return []; // Not found
    }
    throw new Error(`Failed to get user responses: ${error.message}`);
  }
  
  return responses.responses;
}

/**
 * Regenerate action plan with different parameters
 */
export async function regenerateActionPlan(
  goalId: string,
  goal: string,
  userResponses: UserResponse[],
  qualityThreshold: number = 7.5
): Promise<GeneratedActionPlanResult> {
  const input: ActionPlanningInput = {
    goal: goal,
    user_responses: userResponses
  };
  
  const result = await executePromptChainWithRetry<ActionPlanningOutput>(
    'action-planning',
    input,
    qualityThreshold,
    2
  );
  
  // Validate the action plan structure
  if (!result.result.action_plan.phases || result.result.action_plan.phases.length === 0) {
    throw new Error('Action plan must contain at least one phase');
  }
  
  // Get the current highest version for this goal
  const { data: existingPlans, error: versionError } = await supabase
    .from('action_plans')
    .select('version')
    .eq('goal_id', goalId)
    .order('version', { ascending: false })
    .limit(1);
  
  if (versionError) {
    throw new Error(`Failed to get existing plan versions: ${versionError.message}`);
  }
  
  const nextVersion = existingPlans && existingPlans.length > 0 ? existingPlans[0].version + 1 : 1;
  
  // Mark any existing current plans as not current
  await supabase
    .from('action_plans')
    .update({ is_current: false })
    .eq('goal_id', goalId)
    .eq('is_current', true);
  
  // Store the new action plan
  const planData: Omit<ActionPlan, 'id' | 'created_at'> = {
    goal_id: goalId,
    plan_data: result.result.action_plan,
    version: nextVersion,
    is_current: true
  };
  
  const { data: plan, error } = await supabase
    .from('action_plans')
    .insert(planData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to store regenerated action plan: ${error.message}`);
  }
  
  return {
    planId: plan.id,
    goalId: goalId,
    actionPlan: result.result.action_plan,
    personalizationNotes: result.result.personalization_notes,
    successTracking: result.result.success_tracking,
    qualityScore: result.finalScore,
    version: nextVersion
  };
}