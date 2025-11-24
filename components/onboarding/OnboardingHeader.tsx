/**
 * OnboardingHeader - Shared header component for onboarding screens
 * 
 * Provides consistent header styling with back button and optional progress indicator
 * Automatically calculates progress based on current screen in the onboarding flow
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { IconButton } from '../IconButton';

// Define the complete onboarding flow order
const ONBOARDING_SCREEN_ORDER = [
  'Intro',
  'Welcome', 
  'Name',
  'Understanding',
  'CurrentLife',
  'MainDream',
  'RealisticGoal',
  'DreamImage',
  'TimeCommitment',
  'CurrentProgress',
  'AchievementComparison',
  'LongTermResults',
  'Obstacles',
  'Motivation',
  'Potential',
  'Rating',
  'Generating',
  'Progress',
  'Final',
  'Paywall',
  'PostPurchaseSignIn'
];

// Helper function to calculate progress based on current screen
const calculateProgress = (currentScreenName: string): number => {
  const currentIndex = ONBOARDING_SCREEN_ORDER.indexOf(currentScreenName);
  if (currentIndex === -1) return 0;
  return (currentIndex + 1) / ONBOARDING_SCREEN_ORDER.length;
};

interface OnboardingHeaderProps {
  onBack?: () => void;
  showProgress?: boolean;
  progress?: number; // 0-1 - if not provided, will be calculated automatically
  showBackButton?: boolean;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  onBack,
  showProgress = false,
  progress, // No default value - will be calculated if not provided
  showBackButton = true,
}) => {
  const route = useRoute();
  
  // Calculate progress automatically if not provided
  const calculatedProgress = progress !== undefined 
    ? progress 
    : calculateProgress(route.name);

  return (
    <View style={styles.container}>
      {/* Top row with back button and progress */}
      <View style={styles.topRow}>
        {showBackButton && (
          <IconButton
            icon="chevron_left_rounded"
            onPress={onBack || (() => {})}
            variant="ghost"
            size="lg"
            iconSize={42}
            iconWrapperStyle={{ marginLeft: -1 }}
          />
        )}
        
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${calculatedProgress * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}
        
        {/* Invisible icon button on the right for balance */}
        <View style={styles.rightSpacer}>
          <IconButton
            icon="arrow_left"
            onPress={() => {}}
            variant="ghost"
            size="md"
            style={styles.invisibleButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    paddingHorizontal: theme.spacing.lg, // Match main content padding
    paddingTop: 30, // Add 30px top padding
    marginTop: 44, // Add space for status bar like create flow
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.grey[400], // Darker incomplete grey
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[600],
    borderRadius: 2,
  },
  rightSpacer: {
    width: 44, // Same width as the back button (lg size)
  },
  invisibleButton: {
    opacity: 0,
  },
});
