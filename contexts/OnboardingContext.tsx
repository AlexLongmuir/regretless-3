/**
 * OnboardingContext - State management for onboarding flow
 * 
 * This context manages the state for the onboarding process including:
 * - User's name and personal information
 * - Question responses
 * - Subscription status
 * - Navigation state
 * 
 * Following the user's preference for state-only contexts without network calls
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingState {
  // User information
  name: string;
  
  // Question responses
  answers: Record<number, string>;
  
  // Subscription info
  hasActiveSubscription: boolean;
  
  // Navigation state
  currentStep: string;
  progress: number;
}

interface OnboardingContextType {
  state: OnboardingState;
  updateName: (name: string) => void;
  updateAnswer: (questionId: number, answer: string) => void;
  updateAnswers: (answers: Record<number, string>) => void;
  setSubscriptionStatus: (hasActive: boolean) => void;
  setCurrentStep: (step: string) => void;
  setProgress: (progress: number) => void;
  resetOnboarding: () => void;
}

const defaultState: OnboardingState = {
  name: '',
  answers: {},
  hasActiveSubscription: false,
  currentStep: 'Intro',
  progress: 0,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [state, setState] = useState<OnboardingState>(defaultState);

  const updateName = (name: string) => {
    setState(prev => ({ ...prev, name }));
  };

  const updateAnswer = (questionId: number, answer: string) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answer,
      },
    }));
  };

  const updateAnswers = (answers: Record<number, string>) => {
    setState(prev => ({ ...prev, answers }));
  };

  const setSubscriptionStatus = (hasActive: boolean) => {
    setState(prev => ({ ...prev, hasActiveSubscription: hasActive }));
  };

  const setCurrentStep = (step: string) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const setProgress = (progress: number) => {
    setState(prev => ({ ...prev, progress }));
  };

  const resetOnboarding = () => {
    setState(defaultState);
  };

  const value: OnboardingContextType = {
    state,
    updateName,
    updateAnswer,
    updateAnswers,
    setSubscriptionStatus,
    setCurrentStep,
    setProgress,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboardingContext = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
};
