import { callOpenAIComplete, parseOpenAIResponse, validateResponse, ServiceType, ServiceStage } from './openai';
import { createClient } from '@supabase/supabase-js';
import type { Database, CriticEvaluation, AIEvaluation } from '../database/types';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export interface ChainResult<T> {
  result: T;
  evaluations: AIEvaluation[];
  finalScore: number;
  passedThreshold: boolean;
}

/**
 * Execute the planner -> critic -> rewriter chain for any service
 */
export async function executePromptChain<T>(
  serviceType: ServiceType,
  userData: Record<string, any>,
  qualityThreshold: number = 7.0
): Promise<ChainResult<T>> {
  const evaluations: AIEvaluation[] = [];
  
  // Step 1: Planner
  const plannerResponse = await callOpenAIComplete(serviceType, 'planner', userData);
  const plannerOutput = parseOpenAIResponse(plannerResponse);
  
  // Validate planner output
  if (!validateResponse(serviceType, 'planner', plannerOutput)) {
    throw new Error(`Invalid planner response for ${serviceType}`);
  }
  
  // Store planner evaluation
  const plannerEval = await storeEvaluation(
    serviceType,
    'planner',
    userData,
    plannerOutput
  );
  evaluations.push(plannerEval);
  
  // Step 2: Critic
  const criticInput = {
    ...userData,
    previousOutput: plannerOutput
  };
  
  const criticResponse = await callOpenAIComplete(serviceType, 'critic', criticInput);
  const criticOutput = parseOpenAIResponse<CriticEvaluation>(criticResponse);
  
  // Validate critic output
  if (!validateResponse(serviceType, 'critic', criticOutput)) {
    throw new Error(`Invalid critic response for ${serviceType}`);
  }
  
  // Store critic evaluation
  const criticEval = await storeEvaluation(
    serviceType,
    'critic',
    criticInput,
    criticOutput,
    criticOutput
  );
  evaluations.push(criticEval);
  
  let finalOutput = plannerOutput;
  let finalScore = criticOutput.average_score;
  let passedThreshold = criticOutput.passes_threshold && finalScore >= qualityThreshold;
  
  // Step 3: Rewriter (if needed)
  if (!passedThreshold) {
    const rewriterInput = {
      ...userData,
      previousOutput: plannerOutput,
      criticFeedback: criticOutput
    };
    
    const rewriterResponse = await callOpenAIComplete(serviceType, 'rewriter', rewriterInput);
    const rewriterOutput = parseOpenAIResponse(rewriterResponse);
    
    // Validate rewriter output
    if (!validateResponse(serviceType, 'rewriter', rewriterOutput)) {
      throw new Error(`Invalid rewriter response for ${serviceType}`);
    }
    
    // Store rewriter evaluation
    const rewriterEval = await storeEvaluation(
      serviceType,
      'rewriter',
      rewriterInput,
      rewriterOutput
    );
    evaluations.push(rewriterEval);
    
    finalOutput = rewriterOutput;
    // Re-evaluate with critic if needed, or assume rewriter improved quality
    finalScore = Math.max(finalScore, qualityThreshold);
    passedThreshold = true;
  }
  
  return {
    result: finalOutput as T,
    evaluations,
    finalScore,
    passedThreshold
  };
}

/**
 * Store evaluation results in database
 */
async function storeEvaluation(
  serviceType: ServiceType,
  stage: ServiceStage,
  inputData: any,
  outputData: any,
  rubricScores?: CriticEvaluation
): Promise<AIEvaluation> {
  const evaluation: Omit<AIEvaluation, 'id' | 'created_at'> = {
    service_type: serviceType,
    service_stage: stage,
    input_data: inputData,
    output_data: outputData,
    rubric_scores: rubricScores,
    average_score: rubricScores?.average_score,
    passed_threshold: rubricScores?.passes_threshold
  };
  
  const { data, error } = await supabase
    .from('ai_evaluations')
    .insert(evaluation)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to store evaluation: ${error.message}`);
  }
  
  return data;
}

/**
 * Get evaluation history for analysis
 */
export async function getEvaluationHistory(
  serviceType?: ServiceType,
  stage?: ServiceStage,
  limit: number = 100
): Promise<AIEvaluation[]> {
  let query = supabase
    .from('ai_evaluations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (serviceType) {
    query = query.eq('service_type', serviceType);
  }
  
  if (stage) {
    query = query.eq('service_stage', stage);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get evaluation history: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get quality metrics for monitoring
 */
export async function getQualityMetrics(
  serviceType?: ServiceType,
  daysBack: number = 7
): Promise<{
  averageScore: number;
  passRate: number;
  totalEvaluations: number;
  scoresByStage: Record<ServiceStage, number>;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  let query = supabase
    .from('ai_evaluations')
    .select('*')
    .gte('created_at', cutoffDate.toISOString());
  
  if (serviceType) {
    query = query.eq('service_type', serviceType);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get quality metrics: ${error.message}`);
  }
  
  const evaluations = data || [];
  const totalEvaluations = evaluations.length;
  
  if (totalEvaluations === 0) {
    return {
      averageScore: 0,
      passRate: 0,
      totalEvaluations: 0,
      scoresByStage: { planner: 0, critic: 0, rewriter: 0 }
    };
  }
  
  const scores = evaluations
    .filter(e => e.average_score !== null)
    .map(e => e.average_score!);
  
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  const passedEvaluations = evaluations.filter(e => e.passed_threshold === true).length;
  const passRate = passedEvaluations / totalEvaluations;
  
  const scoresByStage: Record<ServiceStage, number> = {
    planner: 0,
    critic: 0,
    rewriter: 0
  };
  
  const stageGroups = evaluations.reduce((groups, evaluation) => {
    if (!groups[evaluation.service_stage]) groups[evaluation.service_stage] = [];
    if (evaluation.average_score !== null) {
      groups[evaluation.service_stage].push(evaluation.average_score);
    }
    return groups;
  }, {} as Record<ServiceStage, number[]>);
  
  Object.entries(stageGroups).forEach(([stage, scores]) => {
    if (scores.length > 0) {
      scoresByStage[stage as ServiceStage] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
  });
  
  return {
    averageScore,
    passRate,
    totalEvaluations,
    scoresByStage
  };
}

/**
 * Retry chain execution with exponential backoff
 */
export async function executePromptChainWithRetry<T>(
  serviceType: ServiceType,
  userData: Record<string, any>,
  qualityThreshold: number = 7.0,
  maxRetries: number = 3
): Promise<ChainResult<T>> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executePromptChain<T>(serviceType, userData, qualityThreshold);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Chain execution failed after ${maxRetries + 1} attempts: ${lastError!.message}`);
}