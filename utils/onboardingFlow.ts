/**
 * Onboarding Flow Utilities
 * 
 * Handles the logic for determining whether to show onboarding, paywall, or main app
 * based on subscription status and user state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from '../lib/revenueCat';

// Try to get types from RevenueCat, fall back to mock types
let CustomerInfo: any;

try {
  const RevenueCat = require('react-native-purchases');
  CustomerInfo = RevenueCat.CustomerInfo;
} catch (error) {
  console.log('RevenueCat types not available, using mock types');
  const MockRevenueCat = require('./revenueCatMock');
  CustomerInfo = MockRevenueCat.MockCustomerInfo;
}

export interface OnboardingFlowState {
  shouldShowOnboarding: boolean;
  shouldShowPaywall: boolean;
  shouldShowMainApp: boolean;
  hasActiveSubscription: boolean;
  isFirstTimeUser: boolean;
}

/**
 * Check the current onboarding flow state
 * 
 * This function determines what screen the user should see based on:
 * - Whether they've completed onboarding
 * - Their subscription status
 * - Whether they're authenticated
 * 
 * Flow logic:
 * 1. First time users → Onboarding
 * 2. Completed onboarding but no subscription → Paywall
 * 3. Has subscription but not authenticated → PostPurchaseSignIn
 * 4. Has subscription and authenticated → Main App
 */
export const checkOnboardingFlowState = async (isAuthenticated: boolean): Promise<OnboardingFlowState> => {
  try {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
    const isFirstTimeUser = !hasCompletedOnboarding;
    
    // Check subscription status
    const customerInfo = await Purchases.getCustomerInfo();
    const hasActiveSubscription = !!customerInfo.entitlements.active['pro'];
    
    // Check last known entitlement status from AsyncStorage
    const lastKnownEntitled = await AsyncStorage.getItem('lastKnownEntitled');
    const cachedEntitled = lastKnownEntitled === 'true';
    
    // Determine what to show
    if (isFirstTimeUser) {
      return {
        shouldShowOnboarding: true,
        shouldShowPaywall: false,
        shouldShowMainApp: false,
        hasActiveSubscription,
        isFirstTimeUser: true,
      };
    }
    
    if (!hasActiveSubscription && !cachedEntitled) {
      return {
        shouldShowOnboarding: false,
        shouldShowPaywall: true,
        shouldShowMainApp: false,
        hasActiveSubscription: false,
        isFirstTimeUser: false,
      };
    }
    
    if (hasActiveSubscription && !isAuthenticated) {
      return {
        shouldShowOnboarding: false,
        shouldShowPaywall: false,
        shouldShowMainApp: false,
        hasActiveSubscription: true,
        isFirstTimeUser: false,
      };
    }
    
    // Has subscription and is authenticated
    return {
      shouldShowOnboarding: false,
      shouldShowPaywall: false,
      shouldShowMainApp: true,
      hasActiveSubscription: true,
      isFirstTimeUser: false,
    };
    
  } catch (error) {
    console.error('Error checking onboarding flow state:', error);
    
    // Default to onboarding on error
    return {
      shouldShowOnboarding: true,
      shouldShowPaywall: false,
      shouldShowMainApp: false,
      hasActiveSubscription: false,
      isFirstTimeUser: true,
    };
  }
};

/**
 * Mark onboarding as completed
 */
export const markOnboardingCompleted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
  } catch (error) {
    console.error('Error marking onboarding as completed:', error);
  }
};

/**
 * Update subscription status in AsyncStorage
 */
export const updateSubscriptionStatus = async (hasActiveSubscription: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem('lastKnownEntitled', hasActiveSubscription.toString());
  } catch (error) {
    console.error('Error updating subscription status:', error);
  }
};

/**
 * Reset onboarding state (useful for testing or logout)
 */
export const resetOnboardingState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('hasCompletedOnboarding');
    await AsyncStorage.removeItem('lastKnownEntitled');
    await AsyncStorage.removeItem('pendingOnboardingDream');
  } catch (error) {
    console.error('Error resetting onboarding state:', error);
  }
};

/**
 * Pending onboarding dream data structure
 * Stores the onboarding data needed to create a dream when user signs in
 */
export interface PendingOnboardingDream {
  name: string;
  answers: Record<number, string>;
  dreamImageUrl: string | null;
  generatedAreas: Array<{
    id: string;
    user_id: string;
    dream_id: string;
    title: string;
    icon?: string;
    position: number;
    created_at: string;
    updated_at: string;
  }>;
  generatedActions: Array<{
    id: string;
    user_id: string;
    dream_id: string;
    area_id: string;
    title: string;
    est_minutes?: number;
    difficulty: 'easy' | 'medium' | 'hard';
    repeat_every_days?: number;
    slice_count_target?: number;
    acceptance_criteria?: string[];
    acceptance_intro?: string;
    acceptance_outro?: string;
    position: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

const PENDING_DREAM_KEY = 'pendingOnboardingDream';

/**
 * Save pending onboarding dream data to AsyncStorage
 * This allows the dream to be created when user signs in from any entry point
 */
export const savePendingOnboardingDream = async (data: PendingOnboardingDream): Promise<void> => {
  try {
    const jsonData = JSON.stringify(data);
    await AsyncStorage.setItem(PENDING_DREAM_KEY, jsonData);
    console.log('✅ [ONBOARDING] Saved pending onboarding dream data');
  } catch (error) {
    console.error('❌ [ONBOARDING] Error saving pending onboarding dream:', error);
    throw error;
  }
};

/**
 * Get pending onboarding dream data from AsyncStorage
 * Returns null if no pending data exists
 */
export const getPendingOnboardingDream = async (): Promise<PendingOnboardingDream | null> => {
  try {
    const jsonData = await AsyncStorage.getItem(PENDING_DREAM_KEY);
    if (!jsonData) {
      return null;
    }
    const data = JSON.parse(jsonData) as PendingOnboardingDream;
    console.log('✅ [ONBOARDING] Retrieved pending onboarding dream data');
    return data;
  } catch (error) {
    console.error('❌ [ONBOARDING] Error retrieving pending onboarding dream:', error);
    return null;
  }
};

/**
 * Clear pending onboarding dream data from AsyncStorage
 * Should be called after successfully creating the dream
 */
export const clearPendingOnboardingDream = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PENDING_DREAM_KEY);
    console.log('✅ [ONBOARDING] Cleared pending onboarding dream data');
  } catch (error) {
    console.error('❌ [ONBOARDING] Error clearing pending onboarding dream:', error);
  }
};

/**
 * Check if there is pending onboarding dream data (synchronous check via AsyncStorage key)
 * This is a lightweight check that doesn't parse the data
 */
export const hasPendingOnboardingDream = async (): Promise<boolean> => {
  try {
    const jsonData = await AsyncStorage.getItem(PENDING_DREAM_KEY);
    if (!jsonData) {
      return false;
    }
    // Quick validation that data exists and has required fields
    const data = JSON.parse(jsonData);
    return !!(data && data.generatedAreas && data.generatedAreas.length > 0 && 
              data.generatedActions && data.generatedActions.length > 0);
  } catch (error) {
    return false;
  }
};
