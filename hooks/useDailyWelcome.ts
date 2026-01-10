import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'lastDailyWelcomeDate';

/**
 * Utility function to reset the daily welcome so it shows again
 * Can be called from anywhere in the app
 */
export const resetDailyWelcome = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting daily welcome:', error);
  }
};

export const useDailyWelcome = () => {
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const checkEligibility = useCallback(async () => {
    try {
      const lastDate = await AsyncStorage.getItem(STORAGE_KEY);
      const today = new Date().toISOString().split('T')[0];
      
      if (lastDate !== today) {
        setShouldShow(true);
      } else {
        setShouldShow(false);
      }
    } catch (error) {
      console.error('Error checking daily welcome eligibility:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsSeen = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(STORAGE_KEY, today);
      setShouldShow(false);
    } catch (error) {
      console.error('Error marking daily welcome as seen:', error);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  // Check on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkEligibility();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkEligibility]);

  return {
    shouldShow,
    markAsSeen,
    isLoading,
    // For debugging/testing
    reset: async () => {
        await resetDailyWelcome();
        checkEligibility();
    }
  };
};
