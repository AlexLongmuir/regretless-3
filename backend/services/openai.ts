import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface StreamingResponse {
  content: string;
  done: boolean;
}

export type ServiceType = 'goal-generation' | 'question-generation' | 'action-planning' | 'feedback-processing';
export type ServiceStage = 'planner' | 'critic' | 'rewriter';

/**
 * Load prompt template from file system
 */
function loadPrompt(serviceType: ServiceType, stage: ServiceStage): string {
  const promptPath = join(__dirname, '..', 'prompts', serviceType, `${stage}.txt`);
  try {
    return readFileSync(promptPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to load prompt for ${serviceType}/${stage}: ${error}`);
  }
}

/**
 * Create a complete prompt by combining template with user data
 */
function createPrompt(
  serviceType: ServiceType, 
  stage: ServiceStage, 
  userData: Record<string, any>
): string {
  const template = loadPrompt(serviceType, stage);
  
  // Replace placeholders in template with actual data
  let prompt = template;
  
  // Add user data to the prompt
  if (userData.goal) {
    prompt += `\n\nUser's Goal: ${userData.goal}`;
  }
  
  if (userData.originalGoal) {
    prompt += `\n\nOriginal Goal: ${userData.originalGoal}`;
  }
  
  if (userData.improvedGoal) {
    prompt += `\n\nImproved Goal: ${userData.improvedGoal}`;
  }
  
  if (userData.userResponses) {
    prompt += `\n\nUser's Responses:`;
    userData.userResponses.forEach((response: any, index: number) => {
      prompt += `\n${index + 1}. ${response.question_type}: ${response.answer}`;
    });
  }
  
  if (userData.originalPlan) {
    prompt += `\n\nOriginal Action Plan: ${JSON.stringify(userData.originalPlan, null, 2)}`;
  }
  
  if (userData.userFeedback) {
    prompt += `\n\nUser Feedback: ${userData.userFeedback}`;
  }
  
  if (userData.previousOutput) {
    prompt += `\n\nPrevious Output: ${JSON.stringify(userData.previousOutput, null, 2)}`;
  }
  
  if (userData.criticFeedback) {
    prompt += `\n\nCritic Feedback: ${JSON.stringify(userData.criticFeedback, null, 2)}`;
  }
  
  return prompt;
}

/**
 * Call OpenAI API with streaming support
 */
export async function* callOpenAI(
  serviceType: ServiceType,
  stage: ServiceStage,
  userData: Record<string, any>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): AsyncGenerator<StreamingResponse, void, unknown> {
  const prompt = createPrompt(serviceType, stage, userData);
  
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 4000
  } = options;
  
  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI assistant helping users achieve their goals. Always respond with valid JSON in the exact format specified in the prompt.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    let content = '';
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      content += delta;
      
      yield {
        content: delta,
        done: false
      };
    }
    
    // Final response with complete content
    yield {
      content,
      done: true
    };
    
  } catch (error) {
    throw new Error(`OpenAI API error for ${serviceType}/${stage}: ${error}`);
  }
}

/**
 * Non-streaming version for when full response is needed
 */
export async function callOpenAIComplete(
  serviceType: ServiceType,
  stage: ServiceStage,
  userData: Record<string, any>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const prompt = createPrompt(serviceType, stage, userData);
  
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 4000
  } = options;
  
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI assistant helping users achieve their goals. Always respond with valid JSON in the exact format specified in the prompt.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    });

    return response.choices[0]?.message?.content || '';
    
  } catch (error) {
    throw new Error(`OpenAI API error for ${serviceType}/${stage}: ${error}`);
  }
}

/**
 * Parse JSON response from OpenAI, with error handling
 */
export function parseOpenAIResponse<T>(response: string): T {
  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/```json\n?(.*?)\n?```/s) || response.match(/\{.*\}/s);
    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
    
    return JSON.parse(jsonString.trim());
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${error}\nResponse: ${response}`);
  }
}

/**
 * Validate that response has required structure for specific service
 */
export function validateResponse(
  serviceType: ServiceType,
  stage: ServiceStage,
  response: any
): boolean {
  switch (`${serviceType}-${stage}`) {
    case 'goal-generation-planner':
      return !!(response.improved_goal && response.key_improvements && response.success_metrics && response.timeline);
    
    case 'goal-generation-critic':
    case 'question-generation-critic':
    case 'action-planning-critic':
    case 'feedback-processing-critic':
      return !!(response.scores && response.average_score !== undefined && response.detailed_feedback && response.passes_threshold !== undefined);
    
    case 'question-generation-planner':
      return !!(response.questions && Array.isArray(response.questions) && response.questions.length === 3);
    
    case 'action-planning-planner':
      return !!(response.action_plan && response.action_plan.phases && Array.isArray(response.action_plan.phases));
    
    case 'feedback-processing-planner':
      return !!(response.feedback_analysis && response.updated_action_plan && response.changes_made);
    
    case 'goal-generation-rewriter':
      return !!(response.rewritten_goal && response.changes_made && response.addressed_weaknesses);
    
    case 'question-generation-rewriter':
      return !!(response.questions && Array.isArray(response.questions) && response.improvements_made);
    
    case 'action-planning-rewriter':
      return !!(response.action_plan && response.improvements_made && response.addressed_weaknesses);
    
    case 'feedback-processing-rewriter':
      return !!(response.improved_action_plan && response.better_responsiveness && response.addressed_critic_feedback);
    
    default:
      return false;
  }
}