/**
 * Sample test data for evaluating AI prompt chains
 */

import type { TestCase } from './evaluation-framework.js';

// Sample test cases for Goal Generation
export const GOAL_GENERATION_TEST_CASES: TestCase[] = [
  {
    id: 'goal-gen-001',
    description: 'Vague fitness goal should be made specific and measurable',
    input: {
      original_goal: 'I want to get fit'
    },
    expectedCriteria: {
      hasSpecificMetrics: true,
      hasTimeframe: true,
      isActionable: true
    },
    tags: ['fitness', 'vague-goal']
  },
  {
    id: 'goal-gen-002', 
    description: 'Career goal should include concrete steps and timeline',
    input: {
      original_goal: 'I want to become a software engineer'
    },
    expectedCriteria: {
      hasLearningPath: true,
      hasSkillRequirements: true,
      hasTimeframe: true
    },
    tags: ['career', 'learning']
  },
  {
    id: 'goal-gen-003',
    description: 'Creative goal should maintain artistic vision while adding structure',
    input: {
      original_goal: 'I want to write a book'
    },
    expectedCriteria: {
      maintainsCreativity: true,
      hasWritingSchedule: true,
      hasWordCountTargets: true
    },
    tags: ['creative', 'writing']
  },
  {
    id: 'goal-gen-004',
    description: 'Financial goal should be specific about amounts and methods',
    input: {
      original_goal: 'I want to save money'
    },
    expectedCriteria: {
      hasSpecificAmount: true,
      hasSavingStrategy: true,
      hasTimeframe: true
    },
    tags: ['financial', 'savings']
  },
  {
    id: 'goal-gen-005',
    description: 'Language learning goal should include proficiency targets and practice schedule',
    input: {
      original_goal: 'I want to learn Spanish'
    },
    expectedCriteria: {
      hasProficiencyLevel: true,
      hasPracticeSchedule: true,
      hasLearningResources: true
    },
    tags: ['language', 'learning']
  }
];

// Sample test cases for Question Generation
export const QUESTION_GENERATION_TEST_CASES: TestCase[] = [
  {
    id: 'question-gen-001',
    description: 'Fitness goal should generate relevant personalization questions',
    input: {
      goal: 'Run a half marathon in 6 months, training 4 days per week and tracking progress weekly'
    },
    expectedCriteria: {
      hasExperienceQuestion: true,
      hasLimitationsQuestion: true,
      hasPreferenceQuestion: true,
      questionsAreSpecific: true
    },
    tags: ['fitness', 'running']
  },
  {
    id: 'question-gen-002',
    description: 'Technical skill goal should ask about background and learning preferences',
    input: {
      goal: 'Master React development by building 5 projects over 4 months, dedicating 2 hours daily to learning'
    },
    expectedCriteria: {
      asksAboutTechBackground: true,
      asksAboutTimeConstraints: true,
      asksAboutLearningStyle: true
    },
    tags: ['programming', 'web-development']
  },
  {
    id: 'question-gen-003',
    description: 'Business goal should inquire about resources and market knowledge',
    input: {
      goal: 'Launch an online business generating $5000/month within 12 months through digital product sales'
    },
    expectedCriteria: {
      asksAboutBusiness Experience: true,
      asksAboutResources: true,
      asksAboutTargetMarket: true
    },
    tags: ['business', 'entrepreneurship']
  }
];

// Sample test cases for Action Planning
export const ACTION_PLANNING_TEST_CASES: TestCase[] = [
  {
    id: 'action-plan-001',
    description: 'Beginner fitness plan should be appropriate for novice level',
    input: {
      goal: 'Run a half marathon in 6 months, training 4 days per week and tracking progress weekly',
      user_responses: [
        {
          question_type: 'experience',
          answer: 'I am completely new to running. I can barely run for 2 minutes without getting winded.'
        },
        {
          question_type: 'limitations',
          answer: 'I work long hours and only have early mornings (6-7 AM) available for training. I also have a history of knee issues.'
        },
        {
          question_type: 'personalization',
          answer: 'I prefer structured plans with clear daily goals. I get motivated by tracking progress and celebrating small wins.'
        }
      ]
    },
    expectedCriteria: {
      startsWithWalking: true,
      progressesGradually: true,
      considersKneeIssues: true,
      fitsEarlyMorningSchedule: true,
      includesProgressTracking: true
    },
    tags: ['fitness', 'beginner', 'personalized']
  },
  {
    id: 'action-plan-002',
    description: 'Experienced developer learning React should skip basics',
    input: {
      goal: 'Master React development by building 5 projects over 4 months, dedicating 2 hours daily to learning',
      user_responses: [
        {
          question_type: 'experience',
          answer: 'I am a senior backend developer with 8 years experience in Python and Node.js. I know JavaScript well but have never used React.'
        },
        {
          question_type: 'limitations', 
          answer: 'I can only dedicate weekday evenings (7-9 PM) to learning. Weekends are family time.'
        },
        {
          question_type: 'personalization',
          answer: 'I learn best by building real projects. I prefer diving deep into concepts rather than following tutorials.'
        }
      ]
    },
    expectedCriteria: {
      skipsJavaScriptBasics: true,
      focusesOnReactConcepts: true,
      includesAdvancedTopics: true,
      respectsEveningSchedule: true,
      emphasizesProjectBuilding: true
    },
    tags: ['programming', 'experienced', 'react']
  }
];

// Sample test cases for Feedback Processing
export const FEEDBACK_PROCESSING_TEST_CASES: TestCase[] = [
  {
    id: 'feedback-proc-001',
    description: 'Timeline adjustment request should modify schedule appropriately',
    input: {
      goal: 'Master React development by building 5 projects over 4 months, dedicating 2 hours daily to learning',
      original_plan: {
        overview: '4-month React mastery plan with progressive project building',
        total_timeline: '4 months',
        phases: [
          {
            phase_number: 1,
            title: 'React Fundamentals',
            duration: '4 weeks',
            objective: 'Learn core React concepts',
            actions: [
              {
                step: 1,
                action: 'Complete React official tutorial',
                details: 'Focus on components and state',
                time_estimate: '1 week'
              }
            ],
            milestone: 'Build a simple todo app'
          }
        ]
      },
      user_feedback: 'This timeline is too aggressive. I can only dedicate 1 hour per day, not 2 hours. Can we extend this to 6-8 months instead?',
      user_responses: [
        {
          question_type: 'experience',
          answer: 'I am a senior backend developer but new to React'
        }
      ]
    },
    expectedCriteria: {
      extendsTimeline: true,
      adjustsDaily Commitment: true,
      maintainsCoreStructure: true,
      explainChanges: true
    },
    tags: ['timeline-adjustment', 'feedback-processing']
  },
  {
    id: 'feedback-proc-002',
    description: 'Difficulty adjustment should modify complexity appropriately',
    input: {
      goal: 'Run a half marathon in 6 months',
      original_plan: {
        overview: '6-month half marathon training plan',
        total_timeline: '6 months',
        phases: [
          {
            phase_number: 1,
            title: 'Base Building',
            duration: '8 weeks',
            objective: 'Build aerobic base',
            actions: [
              {
                step: 1,
                action: 'Run 3 miles at easy pace',
                details: '3 times per week',
                time_estimate: '30 minutes'
              }
            ],
            milestone: 'Complete 3-mile runs comfortably'
          }
        ]
      },
      user_feedback: 'I can barely run 1 mile right now. Starting with 3 miles seems impossible. Can we start much smaller?',
      user_responses: [
        {
          question_type: 'experience',
          answer: 'Complete beginner to running'
        }
      ]
    },
    expectedCriteria: {
      reducesInitialDistance: true,
      addsWalkRunIntervals: true,
      extendsBuildingPhase: true,
      maintainsGoal: true
    },
    tags: ['difficulty-adjustment', 'beginner-friendly']
  }
];

// Combined test suite
export const ALL_TEST_CASES = {
  goalGeneration: GOAL_GENERATION_TEST_CASES,
  questionGeneration: QUESTION_GENERATION_TEST_CASES,
  actionPlanning: ACTION_PLANNING_TEST_CASES,
  feedbackProcessing: FEEDBACK_PROCESSING_TEST_CASES
};