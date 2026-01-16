import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Image, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { DreamCard, DreamChipList, AchievementsButton, AchievementsSheet, StreakButton } from '../components';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { DreamChipSkeleton } from '../components/SkeletonLoader';
import { useData } from '../contexts/DataContext';
import { useAuthContext } from '../contexts/AuthContext';
import type { Dream, DreamWithStats, Achievement, UserAchievement } from '../backend/database/types';
import { trackEvent } from '../lib/mixpanel';
import { getAchievements } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import { StreakSheet } from '../components/StreakSheet';
import { SkillsButton } from '../components/SkillsButton';
import { SkillsSheet } from '../components/SkillsSheet';


const DreamsPage = ({ navigation, scrollRef }: { navigation?: any; scrollRef?: React.RefObject<ScrollView | null> }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme, isDark]);
  const { state, getDreamsSummary, getDreamsWithStats, onScreenFocus, refresh } = useData();
  const { user, isAuthenticated, loading: authLoading, isCreatingOnboardingDream, hasPendingOnboardingDream } = useAuthContext();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const skeletonOpacity = useRef(new Animated.Value(1)).current;
  const [skeletonOverlayVisible, setSkeletonOverlayVisible] = useState(false);
  const prevCreatingDreamRef = useRef(false);
  const [achievements, setAchievements] = useState<(Achievement & { user_progress?: UserAchievement | null })[]>([]);
  const [showAchievementsSheet, setShowAchievementsSheet] = useState(false);
  const [showStreakSheet, setShowStreakSheet] = useState(false);
  const [showSkillsSheet, setShowSkillsSheet] = useState(false);
  const [overallLevel, setOverallLevel] = useState(1);
  
  const dreams = state.dreamsSummary?.dreams || [];
  const dreamsWithStats = state.dreamsWithStats?.dreams || [];
  
  // Track if we have any cached data with actual dreams
  const hasCachedData = Boolean(
    (state.dreamsSummary && state.dreamsSummary.dreams && state.dreamsSummary.dreams.length > 0) ||
    (state.dreamsWithStats && state.dreamsWithStats.dreams && state.dreamsWithStats.dreams.length > 0)
  );
  
  // Show loading skeleton if: 
  // - initial load AND no cached data OR
  // - actively refreshing without cache OR
  // - onboarding dream is being created (to prevent showing empty state prematurely)
  // BUT if we have dreams data, don't show skeleton (even during initial load)
  const shouldShowSkeleton = (isInitialLoad && !hasCachedData && dreams.length === 0) || 
                             (isRefreshing && !hasCachedData && dreams.length === 0) ||
                             (isCreatingOnboardingDream || (hasPendingOnboardingDream && dreams.length === 0));

  // Calculate overall streak (max streak of any dream or sum? Plan says Action Streak)
  // Since we updated current_streak logic, we should probably aggregate or take the max?
  // Let's assume for now we take the max streak across active dreams as the "User Streak" or use the backend value if available
  const overallStreak = Math.max(...dreamsWithStats.map(d => d.current_streak || 0), 0);
  const [longestStreak, setLongestStreak] = useState<number>(0);

  // Smooth crossfade: show overlay when we need skeleton; fade out when content is ready
  useEffect(() => {
    if (shouldShowSkeleton) {
      setSkeletonOverlayVisible(true);
      skeletonOpacity.setValue(1);
    }
  }, [shouldShowSkeleton, skeletonOpacity]);

  useEffect(() => {
    const hasContent = dreamsWithStats.length > 0;
    if (hasContent && skeletonOverlayVisible) {
      Animated.timing(skeletonOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setSkeletonOverlayVisible(false));
    }
  }, [dreamsWithStats.length, skeletonOverlayVisible, skeletonOpacity]);

  // Load achievements
  useEffect(() => {
    const loadAchievements = async () => {
      if (!isAuthenticated || authLoading) return;
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
  }, [isAuthenticated, authLoading]);

  // Load historical longest streak (fallback to longest_streak if historical doesn't exist)
  useEffect(() => {
    const loadLongestStreak = async () => {
      if (!isAuthenticated || authLoading || !user?.id) return;
      try {
        // Try historical_longest_streak first, fallback to longest_streak
        let { data, error } = await supabaseClient.rpc('historical_longest_streak', {
          p_user_id: user.id
        });
        
        // If historical function doesn't exist, use the existing longest_streak function
        if (error && error.code === 'PGRST202') {
          const { data: fallbackData, error: fallbackError } = await supabaseClient.rpc('longest_streak', {
            p_user_id: user.id
          });
          if (fallbackError) {
            console.error('Error loading longest streak:', fallbackError);
          } else {
            setLongestStreak(fallbackData || 0);
          }
        } else if (error) {
          console.error('Error loading longest streak:', error);
        } else {
          setLongestStreak(data || 0);
        }
      } catch (error) {
        console.error('Error loading longest streak:', error);
      }
    };
    loadLongestStreak();
  }, [isAuthenticated, authLoading, user?.id]);

  // Load overall level
  useEffect(() => {
    const loadOverallLevel = async () => {
      if (!isAuthenticated || authLoading || !user?.id) return;
      try {
        const { data, error } = await supabaseClient
          .from('v_user_overall_level')
          .select('overall_level, total_xp')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // If view doesn't exist or no data, default to level 1
          setOverallLevel(1);
        } else {
          setOverallLevel(data?.overall_level || 1);
        }
      } catch (error) {
        console.error('Error loading overall level:', error);
        setOverallLevel(1);
      }
    };
    loadOverallLevel();
  }, [isAuthenticated, authLoading, user?.id]);

  // Initial data load on mount
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('DreamsPage: Initial data load');
      // On first load, use cached data if available (don't force)
      const loadInitialData = async () => {
        if (!hasCachedData) {
          setIsRefreshing(true);
        }
        await Promise.all([
          getDreamsSummary({ force: false }),
          getDreamsWithStats({ force: false })
        ]);
        setIsRefreshing(false);
        setIsInitialLoad(false);
        setHasLoadedOnce(true);
      };
      
      loadInitialData();
    }
  }, [isAuthenticated, authLoading]);

  // Re-fetch data when user navigates back to this screen (e.g., after creating a dream)
  useFocusEffect(
    React.useCallback(() => {
      console.log('DreamsPage: useFocusEffect triggered');
      onScreenFocus('dreams');
      
      trackEvent('dreams_list_viewed', { 
        dream_count: dreams.length, 
        active_dreams_count: dreams.filter(d => !d.archived_at).length 
      });

      // Only force refresh if we're not in the initial load
      if (!isInitialLoad && isAuthenticated && !authLoading) {
        const refreshData = async () => {
          // Force refresh to get latest data (in case a dream was just created)
          await Promise.all([
            getDreamsSummary({ force: true }),
            getDreamsWithStats({ force: true })
          ]);
        };
        
        refreshData();
      }
    }, [isInitialLoad, isAuthenticated, authLoading]) // Add dependencies to prevent unnecessary calls
  );

  const handleDreamPress = (dreamId: string) => {
    const dream = dreams.find(d => d.id === dreamId);
    if (dream && navigation?.navigate) {
      trackEvent('dream_card_pressed', { 
        dream_id: dream.id, 
        title: dream.title 
      });
      navigation.navigate('Dream', {
        dreamId: dream.id,
        title: dream.title,
        startDate: dream.start_date,
        endDate: dream.end_date,
        description: dream.description,
      });
    }
  };

  const handleAddDream = (source: string) => {
    trackEvent('add_dream_pressed', { source });
    if (navigation?.navigate) {
      navigation.navigate('CreateFlow');
    }
  };

  // Show login prompt if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Please Sign In</Text>
        <Text style={styles.emptySubtitle}>
          You need to be signed in to view your dreams.
        </Text>
        <Button
          title="Go to Login"
          onPress={() => navigation?.navigate?.('Login')}
          style={styles.addButton}
        />
      </View>
    );
  }

  // Show empty state only if we've finished loading AND confirmed no dreams exist
  // Don't show if still loading, initializing, refreshing, or creating onboarding dream
  // Also ensure we're not in initial load phase
  // AND we've confirmed there are truly no dreams (not just empty array from initial state)
  const shouldShowEmptyState = !authLoading && 
                                hasLoadedOnce && 
                                !isRefreshing && 
                                !isInitialLoad &&
                                !isCreatingOnboardingDream &&
                                !hasPendingOnboardingDream &&
                                dreams.length === 0;
  
  // Watch for dream creation completion and trigger refresh
  useEffect(() => {
    // If dream creation was in progress and now completed, refresh data
    if (prevCreatingDreamRef.current && !isCreatingOnboardingDream && !hasPendingOnboardingDream) {
      console.log('🎉 [ONBOARDING] Dream creation completed, refreshing DreamsPage...');
      setIsRefreshing(true);
      refresh(true).then(() => {
        setIsRefreshing(false);
      });
    }
    prevCreatingDreamRef.current = isCreatingOnboardingDream || hasPendingOnboardingDream;
  }, [isCreatingOnboardingDream, hasPendingOnboardingDream, refresh]);

  console.log('DreamsPage render state:', {
    authLoading,
    hasLoadedOnce,
    isRefreshing,
    isInitialLoad,
    dreamsLength: dreams.length,
    shouldShowSkeleton,
    shouldShowEmptyState,
    hasCachedData: !!hasCachedData,
    dreamsSummaryExists: !!state.dreamsSummary,
    dreamsWithStatsExists: !!state.dreamsWithStats,
    isCreatingOnboardingDream,
    hasPendingOnboardingDream
  });
  
  if (shouldShowEmptyState) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Start Your Journey</Text>
        <Text style={styles.emptySubtitle}>
          Add your first dream and begin tracking your progress toward achieving it.
        </Text>
        <Button
          title="Add Your First Dream"
          onPress={() => handleAddDream('empty_state')}
          style={styles.addButton}
        />
      </View>
    );
  }

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
            <View style={styles.headerText}>
              <View style={styles.titleContainer}>
                <Image source={require('../assets/star.png')} style={styles.appIcon} />
                <Text style={styles.title}>Dreamer</Text>
              </View>
              <Text style={styles.subtitle}>
                Keep pushing forward. Every step counts.
              </Text>
            </View>
            <View style={styles.headerActions}>
              <SkillsButton
                level={overallLevel}
                onPress={() => setShowSkillsSheet(true)}
                variant="secondary"
                size="md"
              />
              <StreakButton
                streak={overallStreak}
                onPress={() => setShowStreakSheet(true)}
                variant="secondary"
                size="md"
              />
              <AchievementsButton
                onPress={() => setShowAchievementsSheet(true)}
                count={achievements.filter(a => a.user_progress).length}
                total={achievements.length}
              />
              <IconButton
                icon="add"
                onPress={() => handleAddDream('header')}
                variant="secondary"
                size="md"
              />
            </View>
          </View>
        </View>

        {/* Content always rendered; skeleton overlays and fades out when ready */}
        <View style={styles.contentStack}>
          <DreamChipList
            dreams={dreamsWithStats}
            onDreamPress={handleDreamPress}
            showEmpty={shouldShowEmptyState}
            emptyTitle="No dreams yet"
            emptySubtitle="Create your first dream to get started"
          />
          {skeletonOverlayVisible && (
            <Animated.View 
              style={[styles.skeletonOverlay, { opacity: skeletonOpacity }]}
              pointerEvents="none"
            > 
              <DreamChipSkeleton />
              <DreamChipSkeleton />
              <DreamChipSkeleton />
            </Animated.View>
          )}
        </View>

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

      <SkillsSheet
        visible={showSkillsSheet}
        onClose={() => setShowSkillsSheet(false)}
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
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  appIcon: {
    width: 32,
    height: 32,
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  footer: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  skeletonContainer: {
    flex: 1,
  },
  contentStack: {
    position: 'relative',
    minHeight: 1,
  },
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Let content define its own height; overlay will sit on top
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  addButton: {
    minWidth: 200,
  },
  streakButton: {
    backgroundColor: theme.colors.warning[100],
    borderWidth: 0,
  },
});

export default DreamsPage;
