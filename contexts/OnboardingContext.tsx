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

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncOnboardingDraft } from '../frontend-services/backend-bridge';
import type { Area, Action } from '../backend/database/types';
import type { DreamImage } from '../frontend-services/backend-bridge';

interface OnboardingState {
  // Session tracking
  sessionId?: string;

  // User information
  name: string;
  
  // Question responses
  answers: Record<number, string>;
  
  // Dream image
  dreamImageUrl: string | null;
  
  // Generated content from onboarding
  generatedAreas: Area[];
  generatedActions: Action[];
  
  // Subscription info
  hasActiveSubscription: boolean;
  
  // Navigation state
  currentStep: string;
  progress: number;
  
  // Preloaded images
  preloadedDefaultImages: DreamImage[] | null;
}

interface OnboardingContextType {
  state: OnboardingState;
  updateName: (name: string) => void;
  updateAnswer: (questionId: number, answer: string) => void;
  updateAnswers: (answers: Record<number, string>) => void;
  setDreamImageUrl: (imageUrl: string | null) => void;
  setGeneratedAreas: (areas: Area[]) => void;
  setGeneratedActions: (actions: Action[]) => void;
  setSubscriptionStatus: (hasActive: boolean) => void;
  setCurrentStep: (step: string) => void;
  setProgress: (progress: number) => void;
  resetOnboarding: () => void;
  setPreloadedDefaultImages: (images: DreamImage[] | null) => void;
}

const defaultState: OnboardingState = {
  sessionId: undefined,
  name: '',
  answers: {},
  dreamImageUrl: null,
  generatedAreas: [],
  generatedActions: [],
  hasActiveSubscription: false,
  currentStep: 'Intro',
  progress: 0,
  preloadedDefaultImages: null,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [state, setState] = useState<OnboardingState>(defaultState);

  // Initialize session ID
  useEffect(() => {
    const initSession = async () => {
      try {
        let sid = await AsyncStorage.getItem('onboarding_session_id');
        if (!sid) {
          sid = Crypto.randomUUID();
          await AsyncStorage.setItem('onboarding_session_id', sid);
        }
        setState(prev => ({ ...prev, sessionId: sid }));
      } catch (error) {
        console.error('Error initializing onboarding session:', error);
      }
    };
    initSession();
  }, []);

  // Background sync
  useEffect(() => {
    if (!state.sessionId) return;

    const timeoutId = setTimeout(async () => {
      try {
        // Filter out transient state
        const { preloadedDefaultImages, hasActiveSubscription, ...dataToSave } = state;
        
        await syncOnboardingDraft({
          sessionId: state.sessionId!,
          data: dataToSave
        });
        // console.log('✅ [ONBOARDING] Background sync completed');
      } catch (error) {
        // Silent fail for background sync to not disturb user
        console.warn('⚠️ [ONBOARDING] Background sync failed:', error);
      }
    }, 2000); // 2s debounce

    return () => clearTimeout(timeoutId);
  }, [state]);

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

  const setDreamImageUrl = (imageUrl: string | null) => {
    setState(prev => ({ ...prev, dreamImageUrl: imageUrl }));
  };

  const setGeneratedAreas = (areas: Area[]) => {
    setState(prev => {
      // Check if area IDs have changed
      const prevAreaIds = new Set(prev.generatedAreas.map(a => a.id))
      const newAreaIds = new Set(areas.map(a => a.id))
      const areasChanged = 
        prevAreaIds.size !== newAreaIds.size ||
        ![...newAreaIds].every(id => prevAreaIds.has(id))
      
      // If areas changed, clear actions since they reference old areas
      if (areasChanged) {
        return { ...prev, generatedAreas: areas, generatedActions: [] }
      }
      
      return { ...prev, generatedAreas: areas }
    });
  };

  const setGeneratedActions = (actions: Action[]) => {
    setState(prev => ({ ...prev, generatedActions: actions }));
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

  const setPreloadedDefaultImages = (images: DreamImage[] | null) => {
    setState(prev => ({ ...prev, preloadedDefaultImages: images }));
  };

  const value: OnboardingContextType = {
    state,
    updateName,
    updateAnswer,
    updateAnswers,
    setDreamImageUrl,
    setGeneratedAreas,
    setGeneratedActions,
    setSubscriptionStatus,
    setCurrentStep,
    setProgress,
    resetOnboarding,
    setPreloadedDefaultImages,
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
