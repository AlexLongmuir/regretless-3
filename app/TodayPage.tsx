import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { ActionChipsList } from '../components/ActionChipsList';
import { ActionChipSkeleton } from '../components/SkeletonLoader';
import { useData } from '../contexts/DataContext';
import type { TodayAction, ActionOccurrenceStatus } from '../backend/database/types';

interface ActionOccurrenceItem {
  id: string;
  title: string;
  est_minutes: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  repeat_every_days?: number;
  slice_count_target?: number;
  acceptance_criteria?: string[];
  due_on: string;
  completed_at?: string;
  is_done: boolean;
  is_overdue: boolean;
  occurrence_no?: number;
  dream_image?: string;
  hideEditButtons?: boolean;
}

const inspirationalQuotes = [
  "The journey of a thousand miles begins with one step.",
  "Today's accomplishments were yesterday's impossibilities.",
  "Progress, not perfection, is the goal.",
  "Every small step counts toward your bigger dreams.",
  "Focus on the process, and the results will follow.",
  "You are capable of more than you know.",
  "Consistency is the mother of mastery."
];

const TodayPage = ({ navigation }: { navigation?: any }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showLoading, setShowLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const { state, getToday, completeOccurrence, deferOccurrence, onScreenFocus } = useData();
  
  // Convert ActionOccurrenceStatus to ActionOccurrenceItem format for the UI
  // Filter occurrences by the current selected date
  const currentDateStr = currentDate.toISOString().slice(0, 10);
  const isCurrentDate = currentDateStr === new Date().toISOString().slice(0, 10);
  
  // Get the correct data source based on whether it's the current date or not
  const todayData = isCurrentDate ? state.today : state.todayByDate[currentDateStr];
  const isDataLoading = !isCurrentDate && state.loadingTodayByDate[currentDateStr];
  const hasCachedData = todayData && todayData.occurrences;
  const isLoading = !isCurrentDate && !hasCachedData && (isDataLoading || showLoading);
  
  // Debug logging
  console.log('TodayPage loading state:', {
    currentDateStr,
    isCurrentDate,
    hasCachedData: !!hasCachedData,
    isDataLoading,
    showLoading,
    isLoading,
    cachedOccurrences: todayData?.occurrences?.length || 0
  });
  const actionOccurrences: ActionOccurrenceItem[] = (todayData?.occurrences || [])
    .map(occurrence => ({
      id: occurrence.id,
      title: (occurrence as any).actions?.title || 'Untitled Action',
      est_minutes: (occurrence as any).actions?.est_minutes || 30,
      difficulty: (occurrence as any).actions?.difficulty,
      repeat_every_days: (occurrence as any).actions?.repeat_every_days,
      slice_count_target: (occurrence as any).actions?.slice_count_target,
      acceptance_criteria: (occurrence as any).actions?.acceptance_criteria || [],
      due_on: occurrence.due_on,
      completed_at: occurrence.completed_at,
      is_done: occurrence.is_done,
      is_overdue: occurrence.is_overdue,
      occurrence_no: occurrence.occurrence_no,
      dream_image: (occurrence as any).actions?.areas?.dreams?.image_url || '🎯', // Use dream image if available
      hideEditButtons: true
    }));

  // Sort tasks by creation date (most recent first)
  const sortedActionOccurrences = [...actionOccurrences].sort((a, b) => {
    // Get the creation date from the original occurrence data
    const aOccurrence = todayData?.occurrences.find(occ => occ.id === a.id);
    const bOccurrence = todayData?.occurrences.find(occ => occ.id === b.id);
    
    const aCreatedAt = aOccurrence?.created_at || '';
    const bCreatedAt = bOccurrence?.created_at || '';
    
    return new Date(bCreatedAt).getTime() - new Date(aCreatedAt).getTime();
  });

  const getDayOfYear = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const getQuoteOfTheDay = () => {
    const dayOfYear = getDayOfYear(currentDate);
    return inspirationalQuotes[dayOfYear % inspirationalQuotes.length];
  };

  const getFormattedDate = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time to compare only dates
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (currentDateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (currentDateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else if (currentDateOnly.getTime() === tomorrowOnly.getTime()) {
      return 'Tomorrow';
    } else {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    const newDateStr = newDate.toISOString().slice(0, 10);
    const isNewDateCurrent = newDateStr === new Date().toISOString().slice(0, 10);
    
    setCurrentDate(newDate);
    
    // Show loading state for non-current dates that don't have cached data
    if (!isNewDateCurrent && !state.todayByDate[newDateStr]) {
      const startTime = Date.now();
      setLoadingStartTime(startTime);
      setShowLoading(true);
    }
    
    // Fetch data for the new date
    getToday({ force: true, date: newDate });
  };

  // No need for filtering since we're showing all action occurrences

  const handleActionPress = (actionId: string) => {
    const actionOccurrence = actionOccurrences.find(a => a.id === actionId);
    if (actionOccurrence && navigation) {
      // Get the original occurrence data from state to access dream/area info
      const originalOccurrence = todayData?.occurrences.find(occ => occ.id === actionId);
      const dreamTitle = (originalOccurrence as any)?.actions?.areas?.dreams?.title;
      const areaName = (originalOccurrence as any)?.actions?.areas?.title;
      const areaEmoji = (originalOccurrence as any)?.actions?.areas?.icon;
      
      navigation.navigate('ActionOccurrence', {
        occurrenceId: actionOccurrence.id,
        actionTitle: actionOccurrence.title,
        dreamTitle: dreamTitle || 'My Dream',
        areaName: areaName || 'Area',
        areaEmoji: areaEmoji,
        actionDescription: 'Complete this action to progress toward your goal.',
        dueDate: actionOccurrence.due_on,
        estimatedTime: actionOccurrence.est_minutes,
        difficulty: actionOccurrence.difficulty,
        dreamImage: actionOccurrence.dream_image,
        isCompleted: actionOccurrence.is_done,
        isOverdue: actionOccurrence.is_overdue,
        completedAt: actionOccurrence.completed_at,
        note: undefined, // This would come from the occurrence data
        aiRating: undefined, // This would come from the occurrence data
        aiFeedback: undefined // This would come from the occurrence data
      });
    }
  };

  // Revalidate data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      onScreenFocus('today');
      // Let the refresh system handle the fetching based on staleness
      getToday({ date: currentDate });
    }, [currentDate]) // Only depend on currentDate - functions are stable from DataContext
  );

  // Clear loading state when data arrives, but ensure it shows for at least 1 second
  useEffect(() => {
    if (todayData && showLoading && loadingStartTime) {
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, 1000 - elapsedTime);
      
      setTimeout(() => {
        setShowLoading(false);
        setLoadingStartTime(null);
      }, remainingTime);
    }
  }, [todayData, showLoading, loadingStartTime]);

  // Fallback: ensure loading state doesn't get stuck (max 3 seconds)
  useEffect(() => {
    if (showLoading && loadingStartTime) {
      const timeout = setTimeout(() => {
        setShowLoading(false);
        setLoadingStartTime(null);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [showLoading, loadingStartTime]);

  // Clear loading state when date changes (cleanup)
  useEffect(() => {
    setShowLoading(false);
    setLoadingStartTime(null);
  }, [currentDateStr]);

  const handleStatusChange = async (actionId: string, newStatus: 'todo' | 'done' | 'overdue') => {
    if (newStatus === 'done') {
      await completeOccurrence(actionId);
    } else if (newStatus === 'overdue') {
      await deferOccurrence(actionId);
    }
    // For 'todo' status, we don't need to do anything as it's the default state
  };


  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.dateRow}>
                <Text style={styles.date}>{getFormattedDate()}</Text>
                <View style={styles.navigationButtons}>
                  <IconButton
                    icon="chevron_left"
                    onPress={() => navigateDate('prev')}
                    variant="secondary"
                    size="md"
                  />
                  <IconButton
                    icon="chevron_right"
                    onPress={() => navigateDate('next')}
                    variant="secondary"
                    size="md"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.quote}>{getQuoteOfTheDay()}</Text>


        <View style={styles.actionsContainer}>
          {isLoading ? (
            <View style={styles.skeletonContainer}>
              <ActionChipSkeleton />
              <ActionChipSkeleton />
              <ActionChipSkeleton />
              <ActionChipSkeleton />
              <ActionChipSkeleton />
            </View>
          ) : (
            <>
              <ActionChipsList
                actions={sortedActionOccurrences as any}
                onEdit={() => {}} // No-op since we hide edit buttons
                onRemove={() => {}} // No-op since we hide remove buttons
                onAdd={() => {}} // No-op since we hide add functionality
                onReorder={() => {}} // No-op since we hide reorder buttons
                onPress={handleActionPress} // Handle action occurrence clicks
              />
              
              {actionOccurrences.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No actions for {getFormattedDate().toLowerCase()}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  date: {
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  quote: {
    fontSize: 16,
    color: theme.colors.grey[600],
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  actionsContainer: {
    flex: 1,
  },
  skeletonContainer: {
    flex: 1,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.grey[200],
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    color: theme.colors.grey[500],
    textAlign: 'center',
  },
});

export default TodayPage;