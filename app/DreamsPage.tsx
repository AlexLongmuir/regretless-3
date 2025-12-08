import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Image, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { DreamCard, DreamChipList } from '../components';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { DreamChipSkeleton } from '../components/SkeletonLoader';
import { useData } from '../contexts/DataContext';
import { useAuthContext } from '../contexts/AuthContext';
import type { Dream, DreamWithStats } from '../backend/database/types';


const DreamsPage = ({ navigation, scrollRef }: { navigation?: any; scrollRef?: React.RefObject<ScrollView | null> }) => {
  const { state, getDreamsSummary, getDreamsWithStats, onScreenFocus, refresh } = useData();
  const { user, isAuthenticated, loading: authLoading, isCreatingOnboardingDream, hasPendingOnboardingDream } = useAuthContext();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const skeletonOpacity = useRef(new Animated.Value(1)).current;
  const [skeletonOverlayVisible, setSkeletonOverlayVisible] = useState(false);
  const prevCreatingDreamRef = useRef(false);
  
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
      navigation.navigate('Dream', {
        dreamId: dream.id,
        title: dream.title,
        startDate: dream.start_date,
        endDate: dream.end_date,
        description: dream.description,
      });
    }
  };

  const handleAddFirstDream = () => {
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
          onPress={handleAddFirstDream}
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
            <IconButton
              icon="add"
              onPress={handleAddFirstDream}
              variant="secondary"
              size="md"
            />
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
            <Animated.View style={[styles.skeletonOverlay, { opacity: skeletonOpacity }]}> 
              <DreamChipSkeleton />
              <DreamChipSkeleton />
              <DreamChipSkeleton />
            </Animated.View>
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
    color: theme.colors.grey[900],
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.grey[600],
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
    backgroundColor: theme.colors.pageBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.grey[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  addButton: {
    minWidth: 200,
  },
});

export default DreamsPage;