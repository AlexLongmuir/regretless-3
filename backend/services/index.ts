/**
 * Backend AI Services - Main Export File
 * 
 * ARCHITECTURE OVERVIEW:
 * This directory contains the REAL AI service implementations that:
 * 1. Call OpenAI API with sophisticated prompt chains
 * 2. Use planner → critic → rewriter pattern for quality assurance
 * 3. Store evaluation metrics and rubric scores
 * 4. Track real-world outcomes for continuous improvement
 * 
 * WHY SEPARATE FROM services/ai-service.ts:
 * - services/ai-service.ts: Frontend integration layer (database operations + UI formatting)
 * - backend/services/: Pure AI logic (OpenAI API calls + prompt engineering)
 * 
 * CURRENT STATE:
 * These services are fully implemented but not yet connected to the frontend.
 * The frontend currently uses mock data while we test the database integration.
 * 
 * NEXT STEPS:
 * 1. Test database operations with mock data
 * 2. Connect these services to services/ai-service.ts
 * 3. Replace mock responses with real AI-generated content
 * 
 * SERVICES INCLUDED:
 * - goal-generation: Improves user goals using AI
 * - question-generation: Creates personalization questions
 * - action-planning: Generates detailed action plans
 * - feedback-processing: Processes user feedback for plan improvements
 * - prompt-chains: Orchestrates the planner → critic → rewriter workflow
 * - openai: Handles OpenAI API communication
 */

// Export all service functions
export * from './goal-generation';
export * from './question-generation';
export * from './action-planning';
export * from './feedback-processing';
export * from './prompt-chains';
export * from './openai';

// Re-export database types for convenience
export type * from '../database/types';