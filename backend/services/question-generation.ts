/**
 * Question Generation Service
 * Generates personalized questions to better understand user context
 */

import { executePromptChainWithRetry } from './prompt-chains';
import { createClient } from '@supabase/supabase-js';
import type { Database, PersonalizationQuestions, QuestionGenerationInput, QuestionGenerationOutput } from '../database/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export interface GeneratedQuestionsResult {
  questionsId: string;
  goalId: string;
  questions: Array<{
    type: 'experience' | 'limitations' | 'personalization';
    question: string;
    purpose: string;
  }>;
  goalContext: string;
  qualityScore: number;
}

/**
 * Generate personalized questions for a user's goal
 */
export async function generatePersonalizationQuestions(
  goalId: string,
  goal: string
): Promise<GeneratedQuestionsResult> {
  // Input for the prompt chain
  const input: QuestionGenerationInput = {
    goal: goal
  };
  
  // Execute the prompt chain (planner -> critic -> rewriter if needed)
  const result = await executePromptChainWithRetry<QuestionGenerationOutput>(
    'question-generation',
    input,
    7.0, // Quality threshold
    2    // Max retries
  );
  
  // Validate that we have exactly 3 questions with correct types
  if (result.result.questions.length !== 3) {
    throw new Error('Generated questions must contain exactly 3 questions');
  }
  
  const requiredTypes = ['experience', 'limitations', 'personalization'];
  const questionTypes = result.result.questions.map(q => q.type);
  const hasAllTypes = requiredTypes.every(type => questionTypes.includes(type as any));
  
  if (!hasAllTypes) {
    throw new Error('Generated questions must include experience, limitations, and personalization types');
  }
  
  // Store the questions in database
  const questionsData: Omit<PersonalizationQuestions, 'id' | 'created_at'> = {
    goal_id: goalId,
    questions: result.result.questions
  };
  
  const { data: questions, error } = await supabase
    .from('personalization_questions')
    .insert(questionsData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to store questions: ${error.message}`);
  }
  
  return {
    questionsId: questions.id,
    goalId: goalId,
    questions: result.result.questions,
    goalContext: result.result.goal_context,
    qualityScore: result.finalScore
  };
}

/**
 * Get personalization questions for a goal
 */
export async function getPersonalizationQuestions(goalId: string): Promise<PersonalizationQuestions | null> {
  const { data: questions, error } = await supabase
    .from('personalization_questions')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get questions: ${error.message}`);
  }
  
  return questions;
}

/**
 * Regenerate questions with different parameters
 */
export async function regeneratePersonalizationQuestions(
  goalId: string,
  goal: string,
  qualityThreshold: number = 7.5
): Promise<GeneratedQuestionsResult> {
  const input: QuestionGenerationInput = {
    goal: goal
  };
  
  const result = await executePromptChainWithRetry<QuestionGenerationOutput>(
    'question-generation',
    input,
    qualityThreshold,
    2
  );
  
  // Validate questions
  if (result.result.questions.length !== 3) {
    throw new Error('Generated questions must contain exactly 3 questions');
  }
  
  const requiredTypes = ['experience', 'limitations', 'personalization'];
  const questionTypes = result.result.questions.map(q => q.type);
  const hasAllTypes = requiredTypes.every(type => questionTypes.includes(type as any));
  
  if (!hasAllTypes) {
    throw new Error('Generated questions must include experience, limitations, and personalization types');
  }
  
  // Delete existing questions for this goal
  await supabase
    .from('personalization_questions')
    .delete()
    .eq('goal_id', goalId);
  
  // Store new questions
  const questionsData: Omit<PersonalizationQuestions, 'id' | 'created_at'> = {
    goal_id: goalId,
    questions: result.result.questions
  };
  
  const { data: questions, error } = await supabase
    .from('personalization_questions')
    .insert(questionsData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to store new questions: ${error.message}`);
  }
  
  return {
    questionsId: questions.id,
    goalId: goalId,
    questions: result.result.questions,
    goalContext: result.result.goal_context,
    qualityScore: result.finalScore
  };
}

/**
 * Get all questions for multiple goals (for analytics/reporting)
 */
export async function getQuestionsForGoals(goalIds: string[]): Promise<PersonalizationQuestions[]> {
  if (goalIds.length === 0) return [];
  
  const { data: questions, error } = await supabase
    .from('personalization_questions')
    .select('*')
    .in('goal_id', goalIds)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to get questions for goals: ${error.message}`);
  }
  
  return questions || [];
}