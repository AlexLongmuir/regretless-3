import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { ActionChipsList } from '../components/ActionChipsList';
import { ActionChipSkeleton } from '../components/SkeletonLoader';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { supabaseClient } from '../lib/supabaseClient';
import { upsertActions } from '../frontend-services/backend-bridge';
import type { TodayAction, ActionOccurrenceStatus } from '../backend/database/types';
import { trackEvent } from '../lib/mixpanel';

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

const TodayPage = ({ navigation, scrollRef }: { navigation?: any; scrollRef?: React.RefObject<ScrollView | null> }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme, isDark]);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [fetchingDates, setFetchingDates] = useState<Set<string>>(new Set());
  const { state, getToday, completeOccurrence, deferOccurrence, onScreenFocus } = useData();
  const { getSessionData, setSessionData } = useSession();
  
  // Initialize currentDate from session data or default to today
  const [currentDate, setCurrentDate] = useState(() => {
    const savedDate = getSessionData<string>('selectedDate');
    return savedDate ? new Date(savedDate) : new Date();
  });
  
  // Convert ActionOccurrenceStatus to ActionOccurrenceItem format for the UI
  // Filter occurrences by the current selected date
  const currentDateStr = currentDate.toISOString().slice(0, 10);
  const isCurrentDate = currentDateStr === new Date().toISOString().slice(0, 10);
  
  // Get the correct data source based on whether it's the current date or not
  const todayData = isCurrentDate ? state.today : state.todayByDate[currentDateStr];
  const isDataLoading = !isCurrentDate && state.loadingTodayByDate[currentDateStr];
  const hasCachedData = todayData && todayData.occurrences;
  const isFetchingDate = fetchingDates.has(currentDateStr);
  // Show loading if: not current date AND (no cached data OR actively fetching) AND (loading in state OR local loading OR actively fetching)
  const isLoading = !isCurrentDate && (!hasCachedData || isFetchingDate) && (isDataLoading || showLoading || isFetchingDate);
  const actionOccurrences: ActionOccurrenceItem[] = (todayData?.occurrences || [])
    .map(occurrence => {
      const action = (occurrence as any).actions;
      
      // Normalize acceptance_criteria: convert string arrays to object arrays
      let normalizedCriteria: { title: string; description: string }[] = []
      if (action?.acceptance_criteria) {
        if (Array.isArray(action.acceptance_criteria)) {
          normalizedCriteria = action.acceptance_criteria.map((criterion: any) => {
            if (typeof criterion === 'string') {
              // Convert string to object with title and empty description
              return { title: criterion, description: '' }
            } else if (criterion && typeof criterion === 'object' && 'title' in criterion) {
              // Already in object format
              return { title: criterion.title || '', description: criterion.description || '' }
            }
            return { title: '', description: '' }
          })
        }
      }
      
      return {
        id: occurrence.id,
        title: action?.title || 'Untitled Action',
        est_minutes: action?.est_minutes || 30,
        difficulty: action?.difficulty,
        repeat_every_days: action?.repeat_every_days,
        slice_count_target: action?.slice_count_target,
        acceptance_criteria: normalizedCriteria,
        due_on: occurrence.due_on,
        completed_at: occurrence.completed_at,
        is_done: occurrence.is_done,
        is_overdue: occurrence.is_overdue,
        occurrence_no: occurrence.occurrence_no,
        area_image: action?.areas?.image_url,
        dream_image: action?.areas?.dreams?.image_url || '🎯', // Use dream image if available
        hideEditButtons: true
      };
    });

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

  // Prefetch adjacent dates for smoother navigation
  const prefetchAdjacentDates = useCallback(async (centerDate: Date) => {
    const yesterday = new Date(centerDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(centerDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // Only prefetch if not already cached and not the current date (which is always loaded)
    const datesToPrefetch = [];
    if (yesterdayStr !== todayStr && !state.todayByDate[yesterdayStr]) {
      datesToPrefetch.push({ date: yesterday, dateStr: yesterdayStr });
    }
    if (tomorrowStr !== todayStr && !state.todayByDate[tomorrowStr]) {
      datesToPrefetch.push({ date: tomorrow, dateStr: tomorrowStr });
    }
    
    // Prefetch in parallel without showing loading states
    if (datesToPrefetch.length > 0) {
      await Promise.all(
        datesToPrefetch.map(({ date }) => getToday({ date, force: false }))
      );
    }
  }, [state.todayByDate, getToday]);

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

  const navigateDate = async (direction: 'prev' | 'next') => {
    trackEvent('today_date_changed', { direction });
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    const newDateStr = newDate.toISOString().slice(0, 10);
    const isNewDateCurrent = newDateStr === new Date().toISOString().slice(0, 10);
    
    setCurrentDate(newDate);
    
    // Save the new date to session data
    setSessionData('selectedDate', newDateStr);
    
    // Mark this date as being fetched IMMEDIATELY to show loading state without delay
    if (!isNewDateCurrent && !state.todayByDate[newDateStr]) {
      setFetchingDates(prev => new Set(prev).add(newDateStr));
      const startTime = Date.now();
      setLoadingStartTime(startTime);
      setShowLoading(true);
    }
    
    // Fetch data for the new date
    await getToday({ force: true, date: newDate });
    
    // Remove from fetching set once complete
    setFetchingDates(prev => {
      const next = new Set(prev);
      next.delete(newDateStr);
      return next;
    });
    
    // Prefetch adjacent dates for smoother future navigation
    prefetchAdjacentDates(newDate);
  };

  // No need for filtering since we're showing all action occurrences

  const handleActionPress = (actionId: string) => {
    trackEvent('today_action_pressed', { action_id: actionId });
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
      
      trackEvent('today_viewed', { 
        action_count: actionOccurrences.length,
        completed_count: actionOccurrences.filter(a => a.is_done).length
      });

      // Let the refresh system handle the fetching based on staleness
      getToday({ date: currentDate });
      // Prefetch adjacent dates for smoother navigation
      prefetchAdjacentDates(currentDate);
    }, [currentDate, prefetchAdjacentDates]) // Only depend on currentDate - functions are stable from DataContext
  );

  // Clear loading state when data arrives, but ensure it shows for at least 400ms to avoid flash
  useEffect(() => {
    if (todayData && showLoading && loadingStartTime) {
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, 400 - elapsedTime);
      
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

  // Ensure an Inbox dream+area exist and return their IDs
  const ensureInbox = async (): Promise<{ dreamId: string; areaId: string }> => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const userId = session.user.id;

    // Ensure Inbox dream
    const { data: foundDream } = await supabaseClient
      .from('dreams')
      .select('id')
      .eq('user_id', userId)
      .eq('title', 'Inbox')
      .is('archived_at', null)
      .maybeSingle();
    let dreamId = foundDream?.id as string | undefined;
    if (!dreamId) {
      const { data: newDream, error: dreamErr } = await supabaseClient
        .from('dreams')
        .insert({ user_id: userId, title: 'Inbox', start_date: new Date().toISOString().slice(0,10) })
        .select('id')
        .single();
      if (dreamErr) throw dreamErr;
      dreamId = newDream.id;
    }

    // Ensure Inbox area
    const { data: foundArea } = await supabaseClient
      .from('areas')
      .select('id')
      .eq('user_id', userId)
      .eq('dream_id', dreamId)
      .eq('title', 'Inbox')
      .is('deleted_at', null)
      .maybeSingle();
    let areaId = foundArea?.id as string | undefined;
    if (!areaId) {
      const { data: existingAreas } = await supabaseClient
        .from('areas')
        .select('position')
        .eq('dream_id', dreamId)
        .is('deleted_at', null);
      const nextPos = (existingAreas?.length ? Math.max(...existingAreas.map(a => a.position)) : 0) + 1;
      const { data: newArea, error: areaErr } = await supabaseClient
        .from('areas')
        .insert({ user_id: userId, dream_id: dreamId, title: 'Inbox', position: nextPos })
        .select('id')
        .single();
      if (areaErr) throw areaErr;
      areaId = newArea.id;
    }
    return { dreamId: dreamId!, areaId: areaId! };
  };

  // Handle quick add from ActionChipsList modal
  const handleQuickAdd = async (newAction: any) => {
    trackEvent('today_quick_add_action');
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token || !session.user) return;
      const userId = session.user.id;

      // Determine target based on optional linking hints
      let dreamId: string | undefined = newAction.__linkMode === 'choose' ? newAction.__dreamId : undefined;
      let areaId: string | undefined = newAction.__linkMode === 'choose' ? newAction.__areaId : undefined;
      if (!dreamId || !areaId) {
        const ensured = await ensureInbox();
        dreamId = ensured.dreamId; areaId = ensured.areaId;
      }

      // Existing actions in the area
      const { data: areaActions } = await supabaseClient
        .from('actions')
        .select('id, user_id, dream_id, area_id, title, est_minutes, difficulty, repeat_every_days, slice_count_target, acceptance_criteria, position, is_active')
        .eq('area_id', areaId)
        .is('deleted_at', null)
        .order('position');
      const existingIds = new Set((areaActions || []).map(a => a.id));
      const nextPosition = (areaActions?.length || 0);

      const toInsert = {
        user_id: userId,
        dream_id: dreamId,
        area_id: areaId,
        title: newAction.title,
        est_minutes: newAction.est_minutes,
        difficulty: newAction.difficulty || 'medium',
        repeat_every_days: newAction.repeat_every_days ?? null,
        slice_count_target: newAction.slice_count_target ?? null,
        acceptance_criteria: newAction.acceptance_criteria || [],
        position: nextPosition,
        is_active: true
      };

      const allActions = [ ...(areaActions || []), toInsert ];
      const payload = { dream_id: dreamId, actions: allActions } as any;
      const result = await upsertActions(payload, session.access_token);
      const created = result.actions.find((a: any) => !existingIds.has(a.id));
      if (!created) throw new Error('Failed to locate newly created action');

      const dueDate = newAction.due_on; // YYYY-MM-DD
      if (created.slice_count_target && created.slice_count_target > 0) {
        // Finite: insert N occurrences
        const occurrences = Array.from({ length: created.slice_count_target }, (_, i) => ({
          action_id: created.id,
          dream_id: dreamId,
          area_id: areaId,
          user_id: userId,
          occurrence_no: i + 1,
          planned_due_on: dueDate,
          due_on: dueDate,
          defer_count: 0
        }));
        const { error: occErr } = await supabaseClient.from('action_occurrences').insert(occurrences);
        if (occErr) throw occErr;
      } else {
        // One-off or repeating: ensure first occurrence exists
        const { data: existingOcc } = await supabaseClient
          .from('action_occurrences')
          .select('id')
          .eq('action_id', created.id)
          .eq('occurrence_no', 1)
          .maybeSingle();
        if (!existingOcc) {
          const { error: insErr } = await supabaseClient.from('action_occurrences').insert({
            action_id: created.id,
            dream_id: dreamId,
            area_id: areaId,
            user_id: userId,
            occurrence_no: 1,
            planned_due_on: dueDate,
            due_on: dueDate,
            defer_count: 0
          });
          if (insErr) throw insErr;
        }
      }

      // Refresh today's list
      await getToday({ date: currentDate, force: true });
    } catch (e) {
      console.error('Quick add failed:', e);
    }
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
                onAdd={handleQuickAdd}
                onReorder={() => {}} // No-op since we hide reorder buttons
                onPress={handleActionPress} // Handle action occurrence clicks
                showLinkToControls={true}
              />
              
              {actionOccurrences.length === 0 && !isLoading && (
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
    color: theme.colors.text.primary,
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  quote: {
    fontSize: 16,
    color: theme.colors.text.secondary,
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
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border.default,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
});

export default TodayPage;