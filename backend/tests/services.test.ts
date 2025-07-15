/**
 * Integration tests for AI prompt chain services
 */

import { executePromptChain } from '../services/prompt-chains.js';
import { runEvaluationSuite, EVALUATION_METRICS } from './evaluation-framework.js';
import { ALL_TEST_CASES } from './sample-data.js';
import type { GoalGenerationOutput, QuestionGenerationOutput, ActionPlanningOutput, FeedbackProcessingOutput } from '../database/types.js';

// Test timeouts for LLM calls
const TEST_TIMEOUT = 45000;

describe('Goal Generation Service', () => {
  test('should improve vague goals with specific metrics and timelines', async () => {
    const testCases = ALL_TEST_CASES.goalGeneration;
    
    const testFunction = async (input: any): Promise<GoalGenerationOutput> => {
      const result = await executePromptChain<GoalGenerationOutput>('goal-generation', input);
      return result.result;
    };
    
    const reports = await runEvaluationSuite(
      testCases,
      testFunction,
      [EVALUATION_METRICS.RELEVANCE, EVALUATION_METRICS.ACTIONABILITY, EVALUATION_METRICS.COHERENCE]
    );
    
    // Assertions
    const passedTests = reports.filter(r => r.passed);
    expect(passedTests.length).toBeGreaterThan(testCases.length * 0.8); // 80% pass rate
    
    // Check specific improvements for first test case
    const fitnessResult = reports.find(r => r.testCase.id === 'goal-gen-001');
    expect(fitnessResult).toBeDefined();
    expect(fitnessResult!.overallScore).toBeGreaterThan(7);
    
  }, TEST_TIMEOUT);
  
  test('should maintain goal essence while adding structure', async () => {
    const creativeTestCase = ALL_TEST_CASES.goalGeneration.find(t => t.id === 'goal-gen-003');
    
    const result = await executePromptChain<GoalGenerationOutput>(
      'goal-generation',
      creativeTestCase!.input
    );
    
    expect(result.result.improved_goal).toContain('book');
    expect(result.result.timeline).toBeDefined();
    expect(result.result.success_metrics).toHaveLength(result.result.success_metrics.length);
    expect(result.finalScore).toBeGreaterThan(7);
    
  }, TEST_TIMEOUT);
});

describe('Question Generation Service', () => {
  test('should generate relevant personalization questions', async () => {
    const testCases = ALL_TEST_CASES.questionGeneration;
    
    const testFunction = async (input: any): Promise<QuestionGenerationOutput> => {
      const result = await executePromptChain<QuestionGenerationOutput>('question-generation', input);
      return result.result;
    };
    
    const reports = await runEvaluationSuite(
      testCases,
      testFunction,
      [EVALUATION_METRICS.RELEVANCE, EVALUATION_METRICS.PERSONALIZATION, EVALUATION_METRICS.COHERENCE]
    );
    
    // Should have high relevance and personalization scores
    reports.forEach(report => {
      const relevanceResult = report.results.find(r => r.metric === 'relevance');
      const personalizationResult = report.results.find(r => r.metric === 'personalization');
      
      expect(relevanceResult?.score).toBeGreaterThan(6);
      expect(personalizationResult?.score).toBeGreaterThan(6);
    });
    
  }, TEST_TIMEOUT);
  
  test('should always generate exactly 3 questions with correct types', async () => {
    const testCase = ALL_TEST_CASES.questionGeneration[0];
    
    const result = await executePromptChain<QuestionGenerationOutput>(
      'question-generation',
      testCase.input
    );
    
    expect(result.result.questions).toHaveLength(3);
    
    const questionTypes = result.result.questions.map(q => q.type);
    expect(questionTypes).toContain('experience');
    expect(questionTypes).toContain('limitations');
    expect(questionTypes).toContain('personalization');
    
  }, TEST_TIMEOUT);
});

describe('Action Planning Service', () => {
  test('should create personalized action plans based on user responses', async () => {
    const testCases = ALL_TEST_CASES.actionPlanning;
    
    const testFunction = async (input: any): Promise<ActionPlanningOutput> => {
      const result = await executePromptChain<ActionPlanningOutput>('action-planning', input);
      return result.result;
    };
    
    const reports = await runEvaluationSuite(
      testCases,
      testFunction,
      [EVALUATION_METRICS.PERSONALIZATION, EVALUATION_METRICS.ACTIONABILITY, EVALUATION_METRICS.COMPLETENESS]
    );
    
    // All plans should be highly personalized and actionable
    reports.forEach(report => {
      expect(report.overallScore).toBeGreaterThan(6.5);
    });
    
  }, TEST_TIMEOUT);
  
  test('should adapt difficulty to user experience level', async () => {
    const beginnerTestCase = ALL_TEST_CASES.actionPlanning.find(t => t.id === 'action-plan-001');
    const experiencedTestCase = ALL_TEST_CASES.actionPlanning.find(t => t.id === 'action-plan-002');
    
    const [beginnerResult, experiencedResult] = await Promise.all([
      executePromptChain<ActionPlanningOutput>('action-planning', beginnerTestCase!.input),
      executePromptChain<ActionPlanningOutput>('action-planning', experiencedTestCase!.input)
    ]);
    
    // Beginner plan should start with basics
    const beginnerFirstAction = beginnerResult.result.action_plan.phases[0].actions[0].action.toLowerCase();
    expect(beginnerFirstAction).toMatch(/(walk|start|begin|gradual)/);
    
    // Experienced plan should skip basics
    const experiencedPlan = JSON.stringify(experiencedResult.result.action_plan).toLowerCase();
    expect(experiencedPlan).not.toMatch(/(javascript basics|intro to programming)/);
    
  }, TEST_TIMEOUT);
});

describe('Feedback Processing Service', () => {
  test('should appropriately adjust plans based on user feedback', async () => {
    const testCases = ALL_TEST_CASES.feedbackProcessing;
    
    const testFunction = async (input: any): Promise<FeedbackProcessingOutput> => {
      const result = await executePromptChain<FeedbackProcessingOutput>('feedback-processing', input);
      return result.result;
    };
    
    const reports = await runEvaluationSuite(
      testCases,
      testFunction,
      [EVALUATION_METRICS.RELEVANCE, EVALUATION_METRICS.COHERENCE, EVALUATION_METRICS.PERSONALIZATION]
    );
    
    // Should effectively address user concerns
    reports.forEach(report => {
      expect(report.overallScore).toBeGreaterThan(6.5);
    });
    
  }, TEST_TIMEOUT);
  
  test('should extend timeline when user requests slower pace', async () => {
    const timelineTestCase = ALL_TEST_CASES.feedbackProcessing.find(t => t.id === 'feedback-proc-001');
    
    const result = await executePromptChain<FeedbackProcessingOutput>(
      'feedback-processing',
      timelineTestCase!.input
    );
    
    const updatedPlan = result.result.updated_action_plan;
    const changes = result.result.changes_made;
    
    // Should mention timeline extension in changes
    const timelineChange = changes.some(change => 
      change.toLowerCase().includes('timeline') || change.toLowerCase().includes('extended')
    );
    expect(timelineChange).toBe(true);
    
    // New timeline should be longer than original
    expect(updatedPlan.total_timeline).toMatch(/(6|7|8) months?/);
    
  }, TEST_TIMEOUT);
});

describe('Quality Metrics', () => {
  test('all services should meet minimum quality thresholds', async () => {
    const quickTests = [
      { service: 'goal-generation', input: { original_goal: 'I want to learn guitar' } },
      { service: 'question-generation', input: { goal: 'Learn guitar in 6 months with daily practice' } },
      { 
        service: 'action-planning', 
        input: { 
          goal: 'Learn guitar in 6 months',
          user_responses: [
            { question_type: 'experience', answer: 'Complete beginner' },
            { question_type: 'limitations', answer: '30 minutes per day' },
            { question_type: 'personalization', answer: 'I like structured lessons' }
          ]
        }
      }
    ];
    
    for (const test of quickTests) {
      const result = await executePromptChain(test.service as any, test.input);
      expect(result.finalScore).toBeGreaterThan(6.0);
      expect(result.passedThreshold).toBe(true);
    }
    
  }, TEST_TIMEOUT);
});