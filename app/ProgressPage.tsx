import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import {
  DayStreakCard,
  ThisWeekCard,
  ProgressPhotosSection,
  GoalProgressCard,
  HistorySection,
} from '../components';
import { useData } from '../contexts/DataContext';

const ProgressPage = ({ navigation, scrollRef }: { navigation?: any; scrollRef?: React.RefObject<ScrollView | null> }) => {
  const [isPhotosExpanded, setIsPhotosExpanded] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'Week' | 'Month' | 'Year' | 'All Time'>('Week');
  const { state, getDreamsWithStats, getProgress, onScreenFocus } = useData();

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
  
  const weeklyProgress = progress?.weeklyProgress || {
    monday: 'future' as const,
    tuesday: 'future' as const,
    wednesday: 'future' as const,
    thursday: 'future' as const,
    friday: 'future' as const,
    saturday: 'future' as const,
    sunday: 'future' as const,
  };
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
  const overallStreak = progress?.overallStreak || 0;

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
          <Text style={styles.title}>Progress</Text>
        </View>

        <DayStreakCard streakCount={overallStreak} weeklyProgress={weeklyProgress} />
        
        <ThisWeekCard
          actionsPlanned={thisWeekStats.actionsPlanned}
          actionsDone={thisWeekStats.actionsDone}
          actionsOverdue={thisWeekStats.actionsOverdue}
        />

        <ProgressPhotosSection
          photos={progressPhotos}
          onPhotoPress={handlePhotoPress}
          onExpandPress={() => setIsPhotosExpanded(!isPhotosExpanded)}
          isExpanded={isPhotosExpanded}
          columns={6}
        />

        {dreams.map((dream) => {
          // Calculate day progress
          const startDate = new Date(dream.start_date);
          const endDate = dream.end_date ? new Date(dream.end_date) : null;
          const today = new Date();
          
          let currentDay = 1;
          let totalDays = 1;
          
          if (endDate) {
            totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            currentDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            currentDay = Math.max(1, Math.min(currentDay, totalDays));
          } else {
            currentDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            currentDay = Math.max(1, currentDay);
          }

          // Debug logging
          console.log(`Dream ${dream.title}:`, {
            completed_total: dream.completed_total,
            total_actions: dream.total_actions,
            completed_today: dream.completed_today
          });

          return (
            <GoalProgressCard
              key={dream.id}
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
          );
        })}

        <HistorySection
          actionsComplete={currentHistoryStats.actionsComplete}
          activeDays={currentHistoryStats.activeDays}
          actionsOverdue={currentHistoryStats.actionsOverdue}
          onTimePeriodChange={handleTimePeriodChange}
          selectedPeriod={selectedTimePeriod}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
  },
});

export default ProgressPage;