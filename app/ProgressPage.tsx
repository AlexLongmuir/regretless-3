import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import {
  ThisWeekCard,
  ProgressPhotosSection,
  GoalProgressCard,
  HistorySection,
  AchievementsButton,
  AchievementsSheet,
  IconButton
} from '../components';
import { StreakSheet } from '../components/StreakSheet';
import { useData } from '../contexts/DataContext';
import { trackEvent } from '../lib/mixpanel';
import { getAchievements } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import type { Achievement, UserAchievement } from '../backend/database/types';

const ProgressPage = ({ navigation, scrollRef }: { navigation?: any; scrollRef?: React.RefObject<ScrollView | null> }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme, isDark]);
  const nav = useNavigation();
  const [isPhotosExpanded, setIsPhotosExpanded] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'Week' | 'Month' | 'Year' | 'All Time'>('Week');
  const [achievements, setAchievements] = useState<(Achievement & { user_progress?: UserAchievement | null })[]>([]);
  const [showAchievementsSheet, setShowAchievementsSheet] = useState(false);
  const [showStreakSheet, setShowStreakSheet] = useState(false);
  const { state, getDreamsWithStats, getProgress, onScreenFocus, isScreenshotMode } = useData();

  // Load achievements
  useEffect(() => {
    const loadAchievements = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) return;
        const response = await getAchievements(session.access_token);
        if (response.success) {
          setAchievements(response.data.achievements);
        }
      } catch (error) {
        console.error('Error loading achievements:', error);
      }
    };
    loadAchievements();
  }, []);

  // Load data on mount
  useEffect(() => {
    console.log('ProgressPage: Loading data...');
    // Initial load - force fetch to ensure we have data
    getDreamsWithStats({ force: true });
    getProgress({ force: true });
  }, []); // No dependencies - functions are stable from DataContext

  // Re-fetch data when user navigates back to this screen
  useFocusEffect(
    React.useCallback(() => {
      console.log('ProgressPage: useFocusEffect triggered');
      onScreenFocus('dreams'); // Progress page shows dreams data
      trackEvent('progress_viewed');
      // Let the refresh system handle the fetching based on staleness
      getDreamsWithStats();
      getProgress();
    }, []) // No dependencies - functions are stable from DataContext
  );

  // Get data from context
  const dreams = state.dreamsWithStats?.dreams || [];
  const progress = state.progress;
  
  // Debug logging
  useEffect(() => {
    if (dreams.length > 0 || (progress?.progressPhotos?.length || 0) > 0) {
      console.log('ProgressPage: Data loaded successfully', {
        dreamsCount: dreams.length,
        progressPhotosCount: progress?.progressPhotos?.length || 0,
        overallStreak: Math.max(...dreams.map(d => d.current_streak || 0), 0),
      });
    }
  }, [dreams, progress]);
  
  // If no progress data yet, show loading state or fallback
  if (!progress) {
    console.log('No progress data available yet');
  }
  
  const thisWeekStats = progress?.thisWeekStats || {
    actionsPlanned: 0,
    actionsDone: 0,
    actionsOverdue: 0,
  };
  const historyStats = progress?.historyStats || {
    week: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
    month: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
    year: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
    allTime: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
  };

  // Get stats for the selected time period
  const currentHistoryStats = historyStats[selectedTimePeriod.toLowerCase() as keyof typeof historyStats] || historyStats.week;
  const progressPhotos = progress?.progressPhotos || [];

  // Calculate overall streak from progress data (across all dreams)
  // For MVP, we'll take the max streak of any dream as the "overall streak"
  // Since our new logic is dream-specific, aggregating is tricky without backend support
  const overallStreak = Math.max(...dreams.map(d => d.current_streak || 0), 0);
  const longestStreak = overallStreak; // Placeholder

  // Log if we have no data at all
  const hasRealData = dreams.length > 0 || progressPhotos.length > 0 || overallStreak > 0;
  if (!hasRealData && progress) {
    console.log('No user data found - user may be new or have no completed actions yet');
  }

  const handlePhotoPress = (photo: any) => {
    // Handle photo press - could open full screen view
    console.log('Photo pressed:', photo.id);
  };


  const handleTimePeriodChange = (period: 'Week' | 'Month' | 'Year' | 'All Time') => {
    trackEvent('progress_time_period_changed', { period });
    setSelectedTimePeriod(period);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Progress</Text>
            <View style={styles.headerActions}>
              <IconButton
                icon="fire"
                onPress={() => setShowStreakSheet(true)}
                variant="secondary"
                size="md"
                style={styles.streakButton}
              />
              <AchievementsButton
                onPress={() => setShowAchievementsSheet(true)}
                count={achievements.filter(a => a.user_progress).length}
                total={achievements.length}
              />
            </View>
          </View>
        </View>

        {/* Removed DayStreakCard - using StreakSheet in header instead */}
        
        {/* Dream chips at the top */}
        {dreams.map((dream) => {
          // Calculate day progress
          const startDate = new Date(dream.start_date);
          const endDate = dream.end_date ? new Date(dream.end_date) : null;
          // Use mocked date for screenshot mode (Jan 1, 2026), otherwise real date
          const today = isScreenshotMode ? new Date('2026-01-01') : new Date();
          
          let currentDay = 1;
          let totalDays = 1;
          
          if (endDate) {
            totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            currentDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            currentDay = Math.max(1, Math.min(currentDay, totalDays));
          } else {
            currentDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            currentDay = Math.max(1, currentDay);
          }

          return (
            <TouchableOpacity
              key={dream.id}
              onPress={() => {
                trackEvent('progress_goal_card_pressed', { dream_id: dream.id, title: dream.title });
                // Navigate to Dreams tab, then to Dream screen within that stack
                // Use the navigation prop if available, otherwise use useNavigation hook
                const navToUse = navigation || nav;
                if (navToUse && navToUse.navigate) {
                  // Try direct navigation first (for tab-to-tab)
                  navToUse.navigate('Dreams', {
                    screen: 'Dream',
                    params: {
                      dreamId: dream.id,
                      title: dream.title,
                      startDate: dream.start_date,
                      endDate: dream.end_date,
                      description: dream.description,
                    },
                  });
                }
              }}
            >
              <GoalProgressCard
                dreamId={dream.id}
                title={dream.title}
                targetDate={dream.end_date}
                currentDay={currentDay}
                totalDays={totalDays}
                streakCount={dream.current_streak || 0}
                actionsCompleted={dream.completed_total || 0}
                totalActions={dream.total_actions || 0}
                imageUri={dream.image_url}
              />
            </TouchableOpacity>
          );
        })}

        <ThisWeekCard
          actionsPlanned={thisWeekStats.actionsPlanned}
          actionsDone={thisWeekStats.actionsDone}
          actionsOverdue={thisWeekStats.actionsOverdue}
        />

        <ProgressPhotosSection
          photos={progressPhotos}
          onPhotoPress={handlePhotoPress}
          onExpandPress={() => {
            setIsPhotosExpanded(!isPhotosExpanded);
            trackEvent('progress_photo_expanded');
          }}
          isExpanded={isPhotosExpanded}
          columns={3}
        />

        <HistorySection
          actionsComplete={currentHistoryStats.actionsComplete}
          activeDays={currentHistoryStats.activeDays}
          actionsOverdue={currentHistoryStats.actionsOverdue}
          onTimePeriodChange={handleTimePeriodChange}
          selectedPeriod={selectedTimePeriod}
        />
      </ScrollView>

      <AchievementsSheet
        visible={showAchievementsSheet}
        onClose={() => setShowAchievementsSheet(false)}
        achievements={achievements}
      />

      <StreakSheet
        visible={showStreakSheet}
        onClose={() => setShowStreakSheet(false)}
        streak={overallStreak}
        longestStreak={longestStreak}
      />
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 60,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  streakButton: {
    backgroundColor: theme.colors.warning[100],
    borderWidth: 0,
  },
});

export default ProgressPage;
