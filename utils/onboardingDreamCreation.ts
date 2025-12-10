/**
 * Onboarding Dream Creation Utilities
 * 
 * Shared functions for creating dreams from onboarding data.
 * This ensures dreams are saved regardless of where the user signs in.
 */

import { upsertDream, upsertAreas, upsertActions, activateDream } from '../frontend-services/backend-bridge';
import type { PendingOnboardingDream } from './onboardingFlow';
import type { Area, Action } from '../backend/database/types';
import { trackEvent } from '../lib/mixpanel';

/**
 * Interface for onboarding data that can come from context or AsyncStorage
 */
export interface OnboardingDreamData {
  name: string;
  answers: Record<number, string>;
  dreamImageUrl: string | null;
  generatedAreas: Area[];
  generatedActions: Action[];
}

/**
 * Create a dream from onboarding data
 * 
 * This function:
 * 1. Creates the dream with user's answers
 * 2. Saves user's name to profile
 * 3. Saves onboarding responses
 * 4. Saves areas and actions
 * 5. Activates the dream and schedules actions
 * 
 * @param data - Onboarding data (areas, actions, answers, etc.)
 * @param token - Authentication token
 * @param userId - User ID for saving profile and responses
 * @returns Dream ID if successful, null otherwise
 */
export const createDreamFromOnboardingData = async (
  data: OnboardingDreamData,
  token: string,
  userId: string
): Promise<string | null> => {
  try {
    console.log('🎯 [ONBOARDING] Starting dream creation from onboarding data...');
    
    // Check if we have the required data
    if (!data.generatedAreas.length || !data.generatedActions.length) {
      console.log('⚠️ [ONBOARDING] No generated areas or actions found, skipping dream creation');
      return null;
    }

    // Map onboarding answers to dream parameters
    const dreamTitle = data.answers[2] || 'My Dream'; // Main dream answer
    const dreamBaseline = data.answers[1] || ''; // Current life answer
    const dreamObstacles = data.answers[10] || ''; // Obstacles answer (ID 10)
    const dreamEnjoyment = data.answers[11] || ''; // Motivation answer (ID 11)
    const timeCommitment = data.answers[3] || ''; // Time commitment answer (ID 3)

    // Parse time commitment from "0h 30m" format to JSON
    let timeCommitmentJson = null;
    if (timeCommitment) {
      const match = timeCommitment.match(/(\d+)h?\s*(\d+)?m?/);
      if (match) {
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        timeCommitmentJson = { hours, minutes };
      }
    }

    // Create the dream
    console.log('🎯 [ONBOARDING] Creating dream:', dreamTitle);
    const dreamResponse = await upsertDream({
      title: dreamTitle,
      image_url: data.dreamImageUrl,
      baseline: dreamBaseline,
      obstacles: dreamObstacles,
      enjoyment: dreamEnjoyment,
      time_commitment: timeCommitmentJson,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 3 months from now
    }, token);

    console.log('✅ [ONBOARDING] Dream created with ID:', dreamResponse.id);

    // Note: Profile name and onboarding responses should be saved via backend API endpoints
    // These are not critical for dream creation and can be handled separately

    // Save areas - strip temp IDs and let backend create new ones
    console.log('🎯 [ONBOARDING] Saving areas...');
    const areasToSave = data.generatedAreas.map((area, index) => ({
      title: area.title,
      icon: area.icon,
      position: area.position ?? index + 1,
      // Remove temp ID - backend will create new one
      // Also remove other fields that shouldn't be sent
    }));
    
    const areasResponse = await upsertAreas({
      dream_id: dreamResponse.id,
      areas: areasToSave
    }, token);

    console.log('✅ [ONBOARDING] Areas saved:', areasResponse.areas.length);

    // Map temp area IDs to real area IDs by matching title, position, and icon
    const areaIdMap = new Map<string, string>();
    const usedRealAreaIds = new Set<string>();
    
    data.generatedAreas.forEach((tempArea) => {
      // Helper to normalize icon for comparison (handle null, undefined, empty string)
      const normalizeIcon = (icon: string | undefined | null): string => {
        return (icon || '').trim();
      };
      
      // Try to find matching area by title, position, and icon (most specific match)
      let realArea = areasResponse.areas.find((realArea) => 
        realArea.title === tempArea.title && 
        realArea.position === tempArea.position &&
        normalizeIcon(realArea.icon) === normalizeIcon(tempArea.icon) &&
        !usedRealAreaIds.has(realArea.id)
      );
      
      // Fallback: match by title and position only
      if (!realArea) {
        realArea = areasResponse.areas.find((realArea) => 
          realArea.title === tempArea.title && 
          realArea.position === tempArea.position &&
          !usedRealAreaIds.has(realArea.id)
        );
      }
      
      // Last resort: match by position only (if unique)
      if (!realArea) {
        realArea = areasResponse.areas.find((realArea) => 
          realArea.position === tempArea.position &&
          !usedRealAreaIds.has(realArea.id)
        );
      }
      
      if (realArea) {
        areaIdMap.set(tempArea.id, realArea.id);
        usedRealAreaIds.add(realArea.id);
        console.log(`🔗 [ONBOARDING] Mapped area "${tempArea.title}" (pos ${tempArea.position}): ${tempArea.id} -> ${realArea.id}`);
      } else {
        console.error(`❌ [ONBOARDING] Could not find matching real area for temp area "${tempArea.title}" (pos ${tempArea.position})`);
      }
    });

    // Update action area_ids with real area IDs
    const actionsWithRealAreaIds = data.generatedActions.map((action) => {
      const realAreaId = areaIdMap.get(action.area_id);
      if (!realAreaId) {
        console.warn(`⚠️ [ONBOARDING] Could not find real area ID for temp area ID: ${action.area_id}`);
        // Try to find by position as fallback
        const tempArea = data.generatedAreas.find(a => a.id === action.area_id);
        if (tempArea) {
          const fallbackArea = areasResponse.areas.find((realArea) => 
            realArea.position === tempArea.position
          );
          if (fallbackArea) {
            console.log(`🔗 [ONBOARDING] Using fallback mapping for area at position ${tempArea.position}`);
            return { ...action, area_id: fallbackArea.id };
          }
        }
        // If still no match, skip this action
        return null;
      }
      return { ...action, area_id: realAreaId };
    }).filter((action): action is Action => action !== null);

    if (actionsWithRealAreaIds.length !== data.generatedActions.length) {
      console.warn(`⚠️ [ONBOARDING] Some actions were dropped during area ID mapping. Original: ${data.generatedActions.length}, After mapping: ${actionsWithRealAreaIds.length}`);
    }

    // Save actions with real area IDs
    console.log('🎯 [ONBOARDING] Saving actions...');
    const actionsToSave = actionsWithRealAreaIds.map((action, index) => ({
      title: action.title,
      area_id: action.area_id, // Now using real area ID
      est_minutes: action.est_minutes,
      difficulty: action.difficulty,
      repeat_every_days: action.repeat_every_days,
      slice_count_target: action.slice_count_target,
      acceptance_criteria: action.acceptance_criteria,
      acceptance_intro: action.acceptance_intro,
      acceptance_outro: action.acceptance_outro,
      position: action.position ?? index + 1,
      is_active: action.is_active !== undefined ? action.is_active : true,
      // Remove temp ID - backend will create new one
    }));

    const actionsResponse = await upsertActions({
      dream_id: dreamResponse.id,
      actions: actionsToSave
    }, token);

    console.log('✅ [ONBOARDING] Actions saved:', actionsResponse.actions.length);

    // Activate dream and schedule actions
    console.log('🎯 [ONBOARDING] Activating dream and scheduling actions...');
    const activationResponse = await activateDream({
      dream_id: dreamResponse.id
    }, token);

    if (activationResponse.success) {
      console.log('✅ [ONBOARDING] Dream activated and actions scheduled successfully!');
      
      // Track Dream Created event
      trackEvent('Dream Created', {
        dream_id: dreamResponse.id,
        dream_title: dreamTitle,
        total_areas: data.generatedAreas.length,
        total_actions: data.generatedActions.length,
      });

      return dreamResponse.id;
    } else {
      console.error('❌ [ONBOARDING] Dream activation failed:', activationResponse.error);
      return dreamResponse.id; // Still return dream ID even if scheduling failed
    }

  } catch (error) {
    console.error('❌ [ONBOARDING] Failed to create dream from onboarding data:', error);
    return null;
  }
};

/**
 * Check if a dream with the same title already exists for the user
 * This prevents creating duplicate dreams if the creation process is retried
 * 
 * Note: This check is currently disabled as it requires server-side Supabase access.
 * Duplicate prevention can be handled at the backend API level if needed.
 */
export const checkDreamExists = async (title: string, token: string): Promise<boolean> => {
  // Disabled for now - duplicate prevention can be handled at backend level
  // or we can check via the dreams list API if needed
  return false;
};

