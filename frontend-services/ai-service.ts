/**
 * AI Service Integration Layer
 * 
 * ARCHITECTURE OVERVIEW:
 * This file serves as a bridge between React Native frontend components and the backend AI services.
 * It provides a clean API for the frontend while handling database operations and data transformations.
 * 
 * WHY THIS LAYER EXISTS:
 * 1. Separation of Concerns: Keeps database logic out of React components
 * 2. Data Transformation: Converts between frontend UI formats and backend database schemas
 * 3. Error Handling: Centralized error handling for all AI operations
 * 4. Type Safety: Provides TypeScript interfaces for frontend components
 * 5. Reusability: Can be used by multiple components without duplication
 * 6. Testing: Easier to test business logic separately from UI logic
 * 
 * RELATIONSHIP TO BACKEND SERVICES:
 * - THIS FILE (services/ai-service.ts): Frontend integration layer with database operations
 * - backend/services/: Real AI implementations with OpenAI API calls and prompt chains
 * 
 * FLOW:
 * React Component → ai-service.ts → Database → backend/services/ → OpenAI API
 *                ←                ←            ←                  ←
 * 
 * This approach allows us to:
 * - Test frontend separately from AI services
 * - Gradually migrate from mock to real AI
 * - Maintain clean component code
 * - Handle complex data transformations
 */

import { supabase } from '../lib/supabase';
import type { 
  Goal, 
  PersonalizationQuestion, 
  ActionPlanData,
  UserResponse
} from '../backend/database/types';

// Import backend AI services via React Native compatible bridge
import { 
  generateImprovedGoal, 
  generatePersonalizationQuestions as generateAIQuestions, 
  generateActionPlan as generateAIPlan 
} from './backend-bridge';

// Frontend-specific interfaces for UI components
// These match the React Native component expectations and may differ from database schemas
export interface GoalData {
  title: string;
  startDate: string;
  duration: number | null;
  images: string[];
  reason: string;
  schedule: any[] | null;
  startingLevel: string;
  restrictions: string;
  category?: string;
}

export interface AIAction {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  day: number;
  dueDate?: string;
}

/**
 * Create a new goal with AI-generated improvements
 * 
 * This function:
 * 1. Transforms frontend data to database format
 * 2. Stores the goal in the database
 * 3. Calls backend AI services for improvements (TODO: currently mock)
 * 4. Returns formatted data for the frontend
 * 
 * @param goalData - Frontend goal data from React components
 * @param userId - User ID from AuthContext
 * @returns Promise with created goal and AI improvements
 */
export async function createGoalWithAI(goalData: GoalData, userId: string): Promise<{
  goal: Goal;
  improvedTitle: string;
  suggestions: string[];
}> {
  try {
    console.log('🎆 [AI SERVICE] createGoalWithAI called');
    console.log('📊 [AI SERVICE] Input goalData:', goalData);
    console.log('👤 [AI SERVICE] User ID:', userId);

    // Calculate target end date
    const startDate = new Date(goalData.startDate);
    const targetEndDate = new Date(startDate);
    if (goalData.duration) {
      targetEndDate.setDate(startDate.getDate() + goalData.duration);
    }

    console.log('📅 [AI SERVICE] Calculated dates:', { startDate, targetEndDate });

    // Prepare goal record for database
    const goalRecord = {
      user_id: userId,
      title: goalData.title,
      description: goalData.reason,
      original_input: goalData.title,
      start_date: goalData.startDate,
      target_end_date: goalData.duration ? targetEndDate.toISOString().split('T')[0] : undefined,
      duration_days: goalData.duration,
      status: 'active',
      category: goalData.category,
      experience_level: goalData.startingLevel,
      constraints_notes: goalData.restrictions,
      motivation_reason: goalData.reason,
      images: goalData.images,
      schedule_preferences: goalData.schedule ? {
        preferred_days: goalData.schedule
          .filter((day: any) => day.selected)
          .map((day: any) => day.id),
        time_blocks: goalData.schedule
          .filter((day: any) => day.selected && day.timeBlocks?.length > 0)
          .flatMap((day: any) => day.timeBlocks),
        daily_duration_minutes: 60, // Default
        flexibility: 'medium'
      } : undefined,
    };

    console.log('📊 [AI SERVICE] Inserting goal record:', goalRecord);

    // Store goal in database
    const { data: goal, error } = await supabase
      .from('goals_v2')
      .insert(goalRecord)
      .select()
      .single();

    if (error) {
      console.error('❌ [AI SERVICE] Database error:', error);
      throw error;
    }

    console.log('✅ [AI SERVICE] Goal created in database:', goal);

    // Call backend AI service for goal improvement
    try {
      console.log('🤖 [AI SERVICE] Calling generateImprovedGoal...');
      const aiResult = await generateImprovedGoal(userId, goalData.title);
      console.log('🤖 [AI SERVICE] AI Result:', aiResult);
      
      // Update goal with AI improvements
      const updateData = {
        title: aiResult.improvedGoal,
        ai_suggestions: [{
          title: aiResult.improvedGoal,
          duration_days: goalData.duration || 30,
          improvements: aiResult.keyImprovements,
          ai_score: aiResult.qualityScore
        }]
      };
      
      console.log('📝 [AI SERVICE] Updating goal with AI data:', updateData);
      
      const { error: updateError } = await supabase
        .from('goals_v2')
        .update(updateData)
        .eq('id', goal.id);
      
      if (updateError) {
        console.error('❌ [AI SERVICE] Update error:', updateError);
        throw updateError;
      }
      
      console.log('✅ [AI SERVICE] Goal updated with AI improvements');
      
      return {
        goal: { ...goal, title: aiResult.improvedGoal },
        improvedTitle: aiResult.improvedGoal,
        suggestions: aiResult.keyImprovements
      };
    } catch (aiError) {
      console.warn('⚠️ [AI SERVICE] AI service unavailable, using original goal:', aiError);
      // Fallback to original goal if AI service fails
      return {
        goal,
        improvedTitle: goalData.title,
        suggestions: [
          'Goal stored successfully',
          'AI improvements will be applied when service is available'
        ]
      };
    }

  } catch (error) {
    console.error('❌ [AI SERVICE] Error creating goal:', error);
    throw error;
  }
}

/**
 * Generate personalization questions for a goal
 * 
 * This function:
 * 1. Calls backend AI service to generate questions (TODO: currently mock)
 * 2. Stores questions in database
 * 3. Returns formatted questions for frontend display
 * 
 * @param goalId - ID of the goal to generate questions for
 * @returns Promise with personalization questions
 */
export async function generatePersonalizationQuestions(goalId: string): Promise<PersonalizationQuestion[]> {
  try {
    console.log('❓ [AI SERVICE] generatePersonalizationQuestions called');
    console.log('🎯 [AI SERVICE] Goal ID:', goalId);

    // Get goal details for AI service
    const { data: goal, error: goalError } = await supabase
      .from('goals_v2')
      .select('*')
      .eq('id', goalId)
      .single();
    
    if (goalError || !goal) {
      console.error('❌ [AI SERVICE] Goal fetch error:', goalError);
      throw goalError || new Error('Goal not found');
    }
    
    console.log('📝 [AI SERVICE] Retrieved goal:', goal);
    
    // Call backend AI service for question generation
    try {
      console.log('🤖 [AI SERVICE] Calling generateAIQuestions...');
      const aiResult = await generateAIQuestions(goalId, goal.title);
      console.log('🤖 [AI SERVICE] AI Questions Result:', aiResult);
      
      // Questions are already stored by the backend service
      console.log('✅ [AI SERVICE] Returning AI-generated questions');
      return aiResult.questions;
    } catch (aiError) {
      console.warn('⚠️ [AI SERVICE] AI service unavailable, using default questions:', aiError);
      // Fallback to default questions if AI service fails
      const defaultQuestions: PersonalizationQuestion[] = [
        {
          type: 'experience',
          question: `What's your current experience level with ${goal.title}?`,
          purpose: 'Understanding your starting point'
        },
        {
          type: 'limitations',
          question: 'What constraints or challenges do you anticipate?',
          purpose: 'Identifying potential obstacles'
        },
        {
          type: 'personalization',
          question: 'How do you prefer to learn and stay motivated?',
          purpose: 'Tailoring the approach to your preferences'
        }
      ];
      
      console.log('📝 [AI SERVICE] Generated default questions:', defaultQuestions);
      
      // Store default questions in database
      const { error } = await supabase
        .from('personalization_questions_v2')
        .insert({
          goal_id: goalId,
          questions: defaultQuestions
        });
      
      if (error) {
        console.error('❌ [AI SERVICE] Question storage error:', error);
        throw error;
      }
      
      console.log('✅ [AI SERVICE] Stored default questions in database');
      return defaultQuestions;
    }

  } catch (error) {
    console.error('❌ [AI SERVICE] Error generating questions:', error);
    throw error;
  }
}

/**
 * Generate action plan based on goal and user responses
 * 
 * This function:
 * 1. Stores user responses in database
 * 2. Calls backend AI service for action plan generation (TODO: currently mock)
 * 3. Converts AI output to frontend format
 * 4. Stores action plan draft in database
 * 
 * @param goalId - ID of the goal
 * @param goal - Goal object from database
 * @param responses - User responses to personalization questions
 * @returns Promise with actions and plan data
 */
export async function generateActionPlan(
  goalId: string,
  goal: Goal,
  responses: UserResponse[]
): Promise<{
  actions: AIAction[];
  planData: ActionPlanData;
}> {
  try {
    console.log('🎯 [AI SERVICE] generateActionPlan called');
    console.log('📝 [AI SERVICE] Goal ID:', goalId);
    console.log('📝 [AI SERVICE] Goal:', goal);
    console.log('📝 [AI SERVICE] User responses:', responses);

    // Store user responses
    const responsesData = {
      goal_id: goalId,
      responses: responses
    };
    
    console.log('💾 [AI SERVICE] Storing user responses:', responsesData);
    
    const { error: responsesError } = await supabase
      .from('user_responses_v2')
      .insert(responsesData);

    if (responsesError) {
      console.error('❌ [AI SERVICE] Responses storage error:', responsesError);
      throw responsesError;
    }

    console.log('✅ [AI SERVICE] User responses stored');

    // Call backend AI service for action plan generation
    try {
      console.log('🤖 [AI SERVICE] Calling generateAIPlan...');
      const aiResult = await generateAIPlan(goalId, goal.title, responses);
      console.log('🤖 [AI SERVICE] AI Plan Result:', aiResult);
      
      // Convert AI action plan to frontend format
      const actions: AIAction[] = [];
      const startDate = new Date(goal.start_date);
      let dayCounter = 1;
      
      console.log('🔄 [AI SERVICE] Converting AI plan to frontend format...');
      console.log('📅 [AI SERVICE] Start date:', startDate);
      console.log('📊 [AI SERVICE] Plan phases:', aiResult.actionPlan.phases);
      
      // Extract actions from all phases
      for (const phase of aiResult.actionPlan.phases) {
        console.log(`🔍 [AI SERVICE] Processing phase ${phase.phase_number}: ${phase.title}`);
        for (const action of phase.actions) {
          const actionDate = new Date(startDate);
          actionDate.setDate(startDate.getDate() + dayCounter - 1);
          
          const frontendAction = {
            id: dayCounter.toString(),
            title: action.action,
            description: action.details,
            estimatedTime: parseInt(action.time_estimate) || 30,
            day: dayCounter,
            dueDate: actionDate.toISOString().split('T')[0],
          };
          
          actions.push(frontendAction);
          console.log(`➕ [AI SERVICE] Added action ${dayCounter}:`, frontendAction);
          dayCounter++;
        }
      }
      
      console.log('✅ [AI SERVICE] Converted actions:', actions);
      console.log('✅ [AI SERVICE] Plan data:', aiResult.actionPlan);
      
      // Action plan is already stored by the backend service
      return { actions, planData: aiResult.actionPlan };
      
    } catch (aiError) {
      console.warn('⚠️ [AI SERVICE] AI service unavailable, using default plan:', aiError);
      // Fallback to default plan if AI service fails
      const actions: AIAction[] = [];
      const startDate = new Date(goal.start_date);
      const totalDays = goal.duration_days || 30;

      console.log('🔄 [AI SERVICE] Generating fallback plan...');
      console.log('📅 [AI SERVICE] Start date:', startDate);
      console.log('📊 [AI SERVICE] Total days:', totalDays);

      for (let i = 1; i <= Math.min(totalDays, 20); i++) {
        const actionDate = new Date(startDate);
        actionDate.setDate(startDate.getDate() + i - 1);

        const fallbackAction = {
          id: i.toString(),
          title: `${goal.title} - Day ${i}`,
          description: `Daily practice session focusing on ${
            i <= 5 ? 'fundamentals' : 
            i <= 10 ? 'intermediate skills' : 
            i <= 15 ? 'advanced techniques' : 
            'mastery refinement'
          }`,
          estimatedTime: 30 + (i % 3) * 15,
          day: i,
          dueDate: actionDate.toISOString().split('T')[0],
        };
        
        actions.push(fallbackAction);
        console.log(`➕ [AI SERVICE] Added fallback action ${i}:`, fallbackAction);
      }

      const planData: ActionPlanData = {
        overview: `${totalDays}-day plan for ${goal.title}`,
        total_timeline: `${totalDays} days`,
        phases: [
          {
            phase_number: 1,
            title: 'Foundation Phase',
            duration: `${Math.ceil(totalDays * 0.3)} days`,
            objective: 'Build fundamental skills and habits',
            actions: actions.slice(0, Math.ceil(totalDays * 0.3)).map(action => ({
              step: action.day,
              action: action.title,
              details: action.description,
              time_estimate: `${action.estimatedTime} minutes`
            })),
            milestone: 'Complete foundation skills'
          },
          {
            phase_number: 2,
            title: 'Development Phase',
            duration: `${Math.ceil(totalDays * 0.4)} days`,
            objective: 'Develop intermediate skills',
            actions: actions.slice(Math.ceil(totalDays * 0.3), Math.ceil(totalDays * 0.7)).map(action => ({
              step: action.day,
              action: action.title,
              details: action.description,
              time_estimate: `${action.estimatedTime} minutes`
            })),
            milestone: 'Achieve intermediate level'
          },
          {
            phase_number: 3,
            title: 'Mastery Phase',
            duration: `${Math.ceil(totalDays * 0.3)} days`,
            objective: 'Master advanced techniques',
            actions: actions.slice(Math.ceil(totalDays * 0.7)).map(action => ({
              step: action.day,
              action: action.title,
              details: action.description,
              time_estimate: `${action.estimatedTime} minutes`
            })),
            milestone: 'Achieve goal mastery'
          }
        ]
      };
      
      console.log('📝 [AI SERVICE] Generated fallback plan data:', planData);
      
      // Store fallback plan
      const planRecord = {
        goal_id: goalId,
        plan_data: planData,
        version: 1,
        status: 'pending'
      };
      
      console.log('💾 [AI SERVICE] Storing fallback plan:', planRecord);
      
      const { error: planError } = await supabase
        .from('action_plan_drafts_v2')
        .insert(planRecord);
      
      if (planError) {
        console.error('❌ [AI SERVICE] Plan storage error:', planError);
        throw planError;
      }
      
      console.log('✅ [AI SERVICE] Stored fallback plan');
      return { actions, planData };
    }

  } catch (error) {
    console.error('❌ [AI SERVICE] Error generating action plan:', error);
    throw error;
  }
}

/**
 * Get current user ID from Supabase auth
 * @deprecated Use AuthContext instead for better performance
 */
export async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  
  return user.id;
}

/**
 * Get user's goals
 * 
 * Simple database query function - no AI processing needed
 * 
 * @param userId - User ID to fetch goals for
 * @returns Promise with array of user's goals
 */
export async function getUserGoals(userId: string): Promise<Goal[]> {
  const { data: goals, error } = await supabase
    .from('goals_v2')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return goals || [];
}

/**
 * Submit feedback on action plan
 * 
 * Stores user feedback in database for future AI improvements
 * 
 * @param planId - ID of the action plan
 * @param feedback - User's feedback text
 * @param feedbackType - Optional categorization of feedback
 * @returns Promise that resolves when feedback is stored
 */
export async function submitActionPlanFeedback(
  planId: string,
  feedback: string,
  feedbackType?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('plan_feedback')
      .insert({
        plan_id: planId,
        feedback_text: feedback,
        feedback_type: feedbackType
      });

    if (error) throw error;

  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
}