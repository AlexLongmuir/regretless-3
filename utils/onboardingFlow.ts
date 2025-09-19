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
  } catch (error) {
    console.error('Error resetting onboarding state:', error);
  }
};
