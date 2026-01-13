import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { AchievementUnlockedSheet } from '../components/AchievementUnlockedSheet';
import { useData } from '../contexts/DataContext';
import { AchievementsSheet } from '../components/AchievementsSheet';
import { getAchievements } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import type { Achievement, UserAchievement } from '../backend/database/types';

export const AchievementUnlockedPage = () => {
  const navigation = useNavigation();
  const { state, clearUnlockedAchievements } = useData();
  const [showAchievementsList, setShowAchievementsList] = React.useState(false);
  const [allAchievements, setAllAchievements] = React.useState<(Achievement & { user_progress?: UserAchievement | null })[]>([]);

  const handleClose = () => {
    clearUnlockedAchievements();
    navigation.goBack();
  };

  const handleViewAchievements = async () => {
    // We want to transition to the full list.
    // We can either navigate to a new screen or show a modal here.
    // Showing a modal here is fine since we are already in a modal screen.
    
    try {
      // Clear the unlock state so we don't show this again if we go back
      clearUnlockedAchievements();
      
      // Fetch all achievements
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

  // If list is shown, we render that instead (or over it)
  // But wait, AchievementsSheet is a RN Modal.
  // It's better if we just navigate to a new screen if possible, but we don't have an "Achievements" screen registered yet (it's a sheet in AccountPage).
  // So we'll use the existing component which uses Modal.
  // Since we are inside a Native Stack Modal, presenting a RN Modal should work on top of it.

  return (
    <>
      <AchievementUnlockedSheet
        achievements={state.unlockedAchievements || []}
        onClose={handleClose}
        onViewAchievements={handleViewAchievements}
      />
      
      {showAchievementsList && (
        <AchievementsSheet
          visible={showAchievementsList}
          onClose={() => {
            setShowAchievementsList(false);
            navigation.goBack(); // Go back after closing list
          }}
          achievements={allAchievements}
        />
      )}
    </>
  );
};
