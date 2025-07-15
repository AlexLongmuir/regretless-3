/**
 * Custom LLM Evaluation Framework (DeepEval-inspired)
 * For testing the quality of our AI prompt chains
 *   To run the tests:

  # Run all tests
  npm test

  # Run tests in watch mode
  npm run test:watch

  # Run tests with coverage
  npm run test:coverage
 */

import { callOpenAIComplete, parseOpenAIResponse } from '../services/openai.js';

export interface EvaluationMetric {
  name: string;
  description: string;
  scoreRange: [number, number];
  threshold: number;
}

export interface EvaluationResult {
  metric: string;
  score: number;
  passed: boolean;
  reasoning: string;
}

export interface TestCase {
  id: string;
  description: string;
  input: any;
  expectedCriteria?: Record<string, any>;
  tags?: string[];
}

export interface EvaluationReport {
  testCase: TestCase;
  results: EvaluationResult[];
  overallScore: number;
  passed: boolean;
  timestamp: string;
}

// Standard evaluation metrics for LLM outputs
export const EVALUATION_METRICS = {
  RELEVANCE: {
    name: 'relevance',
    description: 'How relevant is the output to the input goal/context',
    scoreRange: [1, 10] as [number, number],
    threshold: 7
  },
  COHERENCE: {
    name: 'coherence',
    description: 'How logical and well-structured is the output',
    scoreRange: [1, 10] as [number, number],
    threshold: 7
  },
  ACTIONABILITY: {
    name: 'actionability',
    description: 'How specific and actionable are the recommendations',
    scoreRange: [1, 10] as [number, number],
    threshold: 7
  },
  PERSONALIZATION: {
    name: 'personalization',
    description: 'How well does the output account for user-specific context',
    scoreRange: [1, 10] as [number, number],
    threshold: 7
  },
  COMPLETENESS: {
    name: 'completeness',
    description: 'How comprehensive is the output for achieving the goal',
    scoreRange: [1, 10] as [number, number],
    threshold: 7
  }
};

/**
 * Evaluate LLM output using an LLM as judge
 */
export async function evaluateWithLLM(
  output: any,
  input: any,
  metric: EvaluationMetric
): Promise<EvaluationResult> {
  const evaluationPrompt = `
You are an expert evaluator assessing the quality of AI-generated content.

Evaluation Metric: ${metric.name.toUpperCase()}
Description: ${metric.description}
Score Range: ${metric.scoreRange[0]}-${metric.scoreRange[1]}

Input Context:
${JSON.stringify(input, null, 2)}

Output to Evaluate:
${JSON.stringify(output, null, 2)}

Please evaluate the output based on the ${metric.name} metric and provide:
1. A score between ${metric.scoreRange[0]} and ${metric.scoreRange[1]}
2. Clear reasoning for your score
3. Specific examples from the output that support your evaluation

Respond in this exact JSON format:
{
  "score": <number>,
  "reasoning": "<detailed explanation of your scoring>",
  "examples": ["<specific examples from the output>"]
}
`;

  try {
    const response = await callOpenAIComplete(
      'goal-generation', // Using existing service type for evaluation
      'critic',
      { evaluationPrompt },
      { temperature: 0.3 } // Lower temperature for more consistent evaluation
    );
    
    const evaluation = parseOpenAIResponse<{
      score: number;
      reasoning: string;
      examples: string[];
    }>(response);
    
    return {
      metric: metric.name,
      score: evaluation.score,
      passed: evaluation.score >= metric.threshold,
      reasoning: evaluation.reasoning
    };
    
  } catch (error) {
    throw new Error(`Failed to evaluate ${metric.name}: ${error}`);
  }
}

/**
 * Run a comprehensive evaluation on a test case
 */
export async function evaluateTestCase(
  testCase: TestCase,
  actualOutput: any,
  metrics: EvaluationMetric[] = Object.values(EVALUATION_METRICS)
): Promise<EvaluationReport> {
  const results: EvaluationResult[] = [];
  
  // Run all metric evaluations in parallel
  const evaluationPromises = metrics.map(metric => 
    evaluateWithLLM(actualOutput, testCase.input, metric)
  );
  
  try {
    const evaluationResults = await Promise.all(evaluationPromises);
    results.push(...evaluationResults);
    
    // Calculate overall score and pass/fail
    const overallScore = results.reduce((sum, result) => sum + result.score, 0) / results.length;
    const passed = results.every(result => result.passed);
    
    return {
      testCase,
      results,
      overallScore,
      passed,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    throw new Error(`Failed to evaluate test case ${testCase.id}: ${error}`);
  }
}

/**
 * Run evaluation suite on multiple test cases
 */
export async function runEvaluationSuite(
  testCases: TestCase[],
  testFunction: (input: any) => Promise<any>,
  metrics?: EvaluationMetric[]
): Promise<EvaluationReport[]> {
  const reports: EvaluationReport[] = [];
  
  for (const testCase of testCases) {
    try {
      // Execute the test function to get output
      const actualOutput = await testFunction(testCase.input);
      
      // Evaluate the output
      const report = await evaluateTestCase(testCase, actualOutput, metrics);
      reports.push(report);
      
      console.log(`✅ Test case ${testCase.id}: ${report.passed ? 'PASSED' : 'FAILED'} (Score: ${report.overallScore.toFixed(2)})`);
      
    } catch (error) {
      console.error(`❌ Test case ${testCase.id} failed with error:`, error);
      
      // Create a failed report
      reports.push({
        testCase,
        results: [],
        overallScore: 0,
        passed: false,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return reports;
}

/**
 * Generate summary statistics from evaluation reports
 */
export function generateEvaluationSummary(reports: EvaluationReport[]): {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  averageScore: number;
  metricBreakdown: Record<string, { averageScore: number; passRate: number }>;
} {
  const totalTests = reports.length;
  const passedTests = reports.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = totalTests > 0 ? passedTests / totalTests : 0;
  
  const allScores = reports.map(r => r.overallScore).filter(score => score > 0);
  const averageScore = allScores.length > 0 
    ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
    : 0;
  
  // Calculate metric breakdown
  const metricBreakdown: Record<string, { averageScore: number; passRate: number }> = {};
  
  const allResults = reports.flatMap(r => r.results);
  const metricNames = [...new Set(allResults.map(r => r.metric))];
  
  metricNames.forEach(metric => {
    const metricResults = allResults.filter(r => r.metric === metric);
    if (metricResults.length > 0) {
      const avgScore = metricResults.reduce((sum, r) => sum + r.score, 0) / metricResults.length;
      const passCount = metricResults.filter(r => r.passed).length;
      const passRate = passCount / metricResults.length;
      
      metricBreakdown[metric] = {
        averageScore: avgScore,
        passRate
      };
    }
  });
  
  return {
    totalTests,
    passedTests,
    failedTests,
    passRate,
    averageScore,
    metricBreakdown
  };
}