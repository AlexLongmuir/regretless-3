import React, { useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { getMainStackNavigation } from '../navigation/index';

/**
 * AchievementListener
 * 
 * Listens for unlocked achievements in the global state and navigates
 * to the AchievementUnlocked screen when they occur.
 * 
 * Uses the global mainStackNavigation object that's set by MainStackNavigationProvider.
 */
export const AchievementListener = () => {
  const { state } = useData();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (state.unlockedAchievements && state.unlockedAchievements.length > 0 && !hasNavigatedRef.current) {
      console.log('🏆 [AchievementListener] Detected unlocked achievements, navigating to screen');
      hasNavigatedRef.current = true;
      
      // Navigate to the achievement unlocked screen
      // We use a small timeout to ensure any previous transitions are started
      setTimeout(() => {
        try {
          const navigation = getMainStackNavigation();
          
          if (navigation) {
            console.log('✅ [AchievementListener] Using global navigation');
            navigation.navigate('AchievementUnlocked');
          } else {
            console.error('❌ [AchievementListener] Global navigation is not available');
          }
        } catch (error: any) {
          console.error('❌ [AchievementListener] Navigation error:', error);
        }
      }, 300);
    } else if (!state.unlockedAchievements || state.unlockedAchievements.length === 0) {
      // Reset the flag when achievements are cleared
      hasNavigatedRef.current = false;
    }
  }, [state.unlockedAchievements]);

  return null;
};
