/**
 * AchievementPopup.tsx
 * 
 * Global component that listens to unlocked achievements from DataContext
 * and displays the celebration modal.
 */

import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { AchievementUnlockedSheet } from './AchievementUnlockedSheet';
import { AchievementsSheet } from './AchievementsSheet';
import { getAchievements } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import type { Achievement, UserAchievement } from '../backend/database/types';

export const AchievementPopup: React.FC = () => {
  const { state, clearUnlockedAchievements } = useData();
  const [showAchievementsList, setShowAchievementsList] = useState(false);
  const [allAchievements, setAllAchievements] = useState<(Achievement & { user_progress?: UserAchievement | null })[]>([]);

  // If we have unlocked achievements, show the modal
  const showUnlockModal = state.unlockedAchievements && state.unlockedAchievements.length > 0;

  const handleClose = () => {
    clearUnlockedAchievements();
  };

  const handleViewAchievements = async () => {
    // Clear the unlock modal
    clearUnlockedAchievements();
    
    try {
      // Fetch all achievements to show the gallery
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        const response = await getAchievements(session.access_token);
        if (response.success) {
          setAllAchievements(response.data.achievements);
          setShowAchievementsList(true);
        }
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  return (
    <>
      <AchievementUnlockedSheet
        visible={showUnlockModal}
        achievements={state.unlockedAchievements || []}
        onClose={handleClose}
        onViewAchievements={handleViewAchievements}
      />
      
      <AchievementsSheet
        visible={showAchievementsList}
        onClose={() => setShowAchievementsList(false)}
        achievements={allAchievements}
      />
    </>
  );
};
