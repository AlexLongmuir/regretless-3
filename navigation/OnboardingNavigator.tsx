/**
 * OnboardingNavigator - Navigation for the onboarding flow
 * 
 * This navigator handles the initial user onboarding process:
 * 1. Intro step - Shows app preview with iPhone frame
 * 2. Welcome step - Introduction to the app
 * 3. Name step - User enters their name
 * 4. Understanding step - Explain how the app works
 * 5. Paywall step - Subscription options with RevenueCat
 * 6. PostPurchaseSignIn step - Authentication after purchase
 * 
 * This keeps the onboarding flow navigation separate from the main app navigation
 * and allows for easy management of the step-by-step process.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import onboarding flow screens
import IntroStep from '../app/onboarding/intro';
import WelcomeStep from '../app/onboarding/welcome';
import NameStep from '../app/onboarding/name';
import UnderstandingStep from '../app/onboarding/understanding';
import CurrentLifeStep from '../app/onboarding/current-life';
import MainDreamStep from '../app/onboarding/main-dream';
import RealisticGoalStep from '../app/onboarding/realistic-goal';
import DreamImageStep from '../app/onboarding/dream-image';
import TimeCommitmentStep from '../app/onboarding/time-commitment';
import CurrentProgressStep from '../app/onboarding/current-progress';
import AchievementComparisonStep from '../app/onboarding/achievement-comparison';
import LongTermResultsStep from '../app/onboarding/long-term-results';
import ObstaclesStep from '../app/onboarding/obstacles';
import MotivationStep from '../app/onboarding/motivation';
import PotentialStep from '../app/onboarding/potential';
import RatingStep from '../app/onboarding/rating';
import GeneratingStep from '../app/onboarding/generating';
import ProgressStep from '../app/onboarding/progress';
import AreasConfirmStep from '../app/onboarding/areas-confirm';
import ActionsGeneratingStep from '../app/onboarding/actions-generating';
import ActionsConfirmStep from '../app/onboarding/actions-confirm';
import FinalStep from '../app/onboarding/final';
import PaywallStep from '../app/onboarding/paywall';
import PostPurchaseSignInStep from '../app/onboarding/post-purchase-signin';
import TrialOfferStep from '../app/onboarding/trial-offer';
import TrialReminderStep from '../app/onboarding/trial-reminder';
import TrialContinuationStep from '../app/onboarding/trial-continuation';
import OneTimeOfferStep from '../app/onboarding/one-time-offer';

// Create stack navigator for onboarding flow
const OnboardingStack = createNativeStackNavigator();

// Note: Progress calculation is now handled automatically by OnboardingHeader component

/**
 * OnboardingNavigator - Stack navigation for onboarding flow
 * 
 * This navigator manages the step-by-step process of onboarding new users.
 * Each screen represents a step in the flow, and users can navigate
 * forward and backward through the steps.
 */
const OnboardingNavigator = () => {
  return (
    <OnboardingStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
        animationDuration: 300
      }}
    >
      <OnboardingStack.Screen 
        name="Intro" 
        component={IntroStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Welcome" 
        component={WelcomeStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Name" 
        component={NameStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Understanding" 
        component={UnderstandingStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="CurrentLife" 
        component={CurrentLifeStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="MainDream" 
        component={MainDreamStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="RealisticGoal" 
        component={RealisticGoalStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="DreamImage" 
        component={DreamImageStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="TimeCommitment" 
        component={TimeCommitmentStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="CurrentProgress" 
        component={CurrentProgressStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="AchievementComparison" 
        component={AchievementComparisonStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="LongTermResults" 
        component={LongTermResultsStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Obstacles" 
        component={ObstaclesStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Motivation" 
        component={MotivationStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Potential" 
        component={PotentialStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Rating" 
        component={RatingStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Generating" 
        component={GeneratingStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Progress" 
        component={ProgressStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="AreasConfirm" 
        component={AreasConfirmStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="ActionsGenerating" 
        component={ActionsGeneratingStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="ActionsConfirm" 
        component={ActionsConfirmStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Final" 
        component={FinalStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="Paywall" 
        component={PaywallStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="PostPurchaseSignIn" 
        component={PostPurchaseSignInStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="TrialOffer" 
        component={TrialOfferStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="TrialReminder" 
        component={TrialReminderStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="TrialContinuation" 
        component={TrialContinuationStep}
        options={{
          headerShown: false,
        }}
      />
      <OnboardingStack.Screen 
        name="OneTimeOffer" 
        component={OneTimeOfferStep}
        options={{
          headerShown: false,
        }}
      />
    </OnboardingStack.Navigator>
  );
};

export default OnboardingNavigator;
