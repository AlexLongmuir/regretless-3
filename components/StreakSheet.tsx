import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { SheetHeader } from './SheetHeader';
import { Icon } from './Icon';
import type { Achievement, UserAchievement } from '../backend/database/types';
import { supabaseClient } from '../lib/supabaseClient';
import { getAchievements } from '../frontend-services/backend-bridge';

interface StreakSheetProps {
  visible: boolean;
  onClose: () => void;
  streak: number;
  longestStreak: number;
}

export const StreakSheet: React.FC<StreakSheetProps> = ({ 
  visible, 
  onClose, 
  streak,
  longestStreak
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [streakAchievements, setStreakAchievements] = useState<(Achievement & { user_progress?: UserAchievement | null })[]>([]);
  const backgroundOpacity = 1.0; // 100% opacity
  
  // Animation for the fire icon pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get background image URL from Supabase storage
  const getBackgroundImageUrl = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    return `${supabaseUrl}/storage/v1/object/public/achievement-images/StreakBackground.png`;
  };

  const backgroundImageUrl = getBackgroundImageUrl();

  // Prefetch background image
  useEffect(() => {
    if (backgroundImageUrl) {
      Image.prefetch(backgroundImageUrl);
    }
  }, [backgroundImageUrl]);

  // Load streak achievements
  useEffect(() => {
    const loadAchievements = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) return;
        
        const response = await getAchievements(session.access_token);
        if (response.success) {
          // Filter for streak category and sort by criteria_value
          const filtered = response.data.achievements
            .filter(a => a.category === 'streak')
            .sort((a, b) => a.criteria_value - b.criteria_value);
          setStreakAchievements(filtered);
        }
      } catch (error) {
        console.error('Error loading streak achievements:', error);
      }
    };
    
    if (visible) {
      loadAchievements();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [visible]);

  // Determine next challenge target (7, 14, 30, 60, 90, etc.)
  const challengeTiers = [7, 14, 30, 60, 90, 180, 365];
  const nextChallengeTarget = challengeTiers.find(tier => streak < tier) || challengeTiers[challengeTiers.length - 1];
  const currentChallengeProgress = Math.min(streak, nextChallengeTarget);
  
  // Calculate days for the challenge visualization (7 days)
  const challengeDays = Array.from({ length: 7 }, (_, i) => {
    const dayNumber = i + 1;
    // Calculate if this day is completed in the current 7-day cycle relative to the challenge
    // For a 7-day challenge, it's just 1-7. For larger ones, it's the last 7 days leading up to it?
    // The requirement says "7 action challenge... as the user completes this it should increment in difficulty"
    // Let's visualize the current progress towards the next milestone, but limited to 7 bubbles for UI consistency if it's a "7 Day Challenge" style
    // Actually, the image shows a "7 Day Challenge" card with 7 bubbles.
    // Let's make it a "Next 7 Actions" view, or if the target is small, show that.
    
    // Simplified logic: Show 7 bubbles representing the path to the next milestone or just the next 7 days of the streak
    // If we are at streak 5, and target is 7: 5 filled, 2 empty.
    // If we are at streak 10, and target is 14: 10%7 = 3 filled (in the current 7-day cycle), 4 empty.
    
    // Let's use modulo to show progress in 7-day chunks if the target is large, or absolute if small.
    const isCompleted = (streak % 7) >= dayNumber || (streak % 7 === 0 && streak > 0);
    // Adjust logic: if streak is a multiple of 7, all 7 should be filled for the previous cycle, 
    // but usually we want to show the CURRENT cycle.
    // If streak=7, we completed the 7 day challenge. Next is 14. We should probably reset to 0/7 visually for the next tier?
    // Or show "Day 7 of 7" completed.
    
    // Let's try:
    // If streak < 7: Show 1..7, filled up to streak.
    // If streak >= 7: Show (streak - (streak % 7) + 1) .. (streak - (streak % 7) + 7)
    // Wait, the prompt says "increment in difficulty, maybe to like 30".
    // If target is 30, showing 7 bubbles might be confusing if we label it "30 Day Challenge".
    // BUT the image shows "7 Day Challenge".
    // Let's stick to the visual style: A horizontal row of 7 bubbles.
    // We can label it "Road to [NextTarget] Actions".
    // And the bubbles represent the *last 7 days* or *next 7 days*?
    // Let's make the bubbles represent the most recent/upcoming 7-action block.
    
    const cycleStart = Math.floor(streak / 7) * 7;
    const isFilled = streak > (cycleStart + i);
    const isCurrent = streak === (cycleStart + i); // The next one to do? No, streak is completed count.
    
    return {
      dayLabel: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], // Just placeholders, or maybe generic numbers? Image has M T W...
      // Since streak is action-based not day-based, M-S labels might be misleading.
      // Let's use generic "1", "2"... or icons.
      isFilled,
      isCurrent: !isFilled && (streak === cycleStart + i) // Next one
    };
  });

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.container}>
        {/* Background Image */}
        {backgroundImageUrl && (
          <Image 
            source={{ uri: backgroundImageUrl }} 
            style={[styles.backgroundImage, { opacity: backgroundOpacity }]}
            contentFit="cover"
            cachePolicy="disk"
            transition={0}
            priority="high"
          />
        )}
        <View style={styles.contentContainer}>
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <SheetHeader onClose={onClose} />
            
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={styles.fireIconContainer}>
                  <Icon name="fire" size={80} color={theme.colors.warning[500]} />
                </View>
              </Animated.View>
              <Text style={styles.streakCount}>{streak}</Text>
              <Text style={styles.streakLabel}>Action Streak</Text>
              <Text style={styles.streakDescription}>
                Consecutive completed actions without missing a due date
              </Text>
            </View>

            {/* Challenge Card */}
            <View style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <Text style={styles.challengeTitle}>{nextChallengeTarget} Action Challenge</Text>
                <Text style={styles.challengeProgress}>
                  {streak} / {nextChallengeTarget}
                </Text>
              </View>
              
              <View style={styles.bubblesContainer}>
                {Array.from({ length: 7 }).map((_, index) => {
                  // Determine status for this bubble (representing progress towards next 7-step milestone)
                  // If target is 30, we might wrap this?
                  // For the requested UI, let's simplify: 
                  // If target <= 7, simple 1-7.
                  // If target > 7, maybe just show the last 7 items?
                  // Let's implement the specific "7 Day Challenge" visual from the request
                  // and map it to the "Action Streak" concept.
                  
                  // Logic: Show progress within the current 7-action block
                  const positionInCycle = streak % 7;
                  const isCompleted = index < positionInCycle || (streak > 0 && positionInCycle === 0); 
                  // Fix: if streak=7, positionInCycle=0, but all should be full.
                  // If streak=8, positionInCycle=1, index=0 is full.
                  
                  // Revised Logic:
                  // 0-6 indices.
                  // If streak % 7 == 0 and streak > 0, we just finished a cycle, show full? 
                  // Or show empty for next cycle? Usually empty for next.
                  // Let's show "Current Cycle" progress.
                  
                  const cycleProgress = streak % 7;
                  const isFilled = index < cycleProgress;
                  const isCurrent = index === cycleProgress;
                  
                  return (
                    <View key={index} style={styles.bubbleWrapper}>
                      <View style={[
                        styles.bubble,
                        isFilled && styles.bubbleFilled,
                        isCurrent && styles.bubbleCurrent
                      ]}>
                        <Icon 
                          name="fire" 
                          size={20} 
                          color={isFilled || isCurrent ? theme.colors.warning[500] : theme.colors.disabled.text} 
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
              
              <Text style={styles.challengeFooter}>
                To secure a streak, complete your planned actions before they become overdue.
              </Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Current Streak</Text>
                <Text style={styles.statValue}>{streak}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Longest Streak</Text>
                <Text style={styles.statValue}>{longestStreak}</Text>
              </View>
            </View>

            {/* Achievements Grid */}
            <View style={styles.achievementsSection}>
              <Text style={styles.sectionTitle}>Streak Milestones</Text>
              <View style={styles.achievementsGrid}>
                {streakAchievements.map((achievement) => {
                  const isUnlocked = !!achievement.user_progress;
                  // Determine if this is the "next" achievement to work towards
                  // It's the first locked achievement
                  const isNext = !isUnlocked && streakAchievements.find(a => !a.user_progress)?.id === achievement.id;
                  
                  return (
                    <TouchableOpacity
                      key={achievement.id}
                      style={styles.achievementItem}
                      activeOpacity={0.8}
                      disabled={true} // For now just display
                    >
                      <View style={[
                        styles.achievementCard,
                        !isUnlocked && styles.achievementCardLocked
                      ]}>
                        {isUnlocked && achievement.image_url ? (
                          <Image 
                            source={{ uri: achievement.image_url }} 
                            style={styles.achievementImage}
                            contentFit="cover"
                          />
                        ) : achievement.locked_image_url ? (
                          <Image 
                            source={{ uri: achievement.locked_image_url }} 
                            style={[
                              styles.achievementImage, 
                              { opacity: isNext ? 0.5 : 0.2 } // Reduced opacity for locked
                            ]}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.lockedContent}>
                             <Text style={styles.questionMark}>?</Text>
                          </View>
                        )}
                        
                        {/* Progress Bar for Next Achievement */}
                        {isNext && (
                          <View style={styles.achievementProgressOverlay}>
                            <View style={styles.miniProgressBarBg}>
                              <View 
                                style={[
                                  styles.miniProgressBarFill, 
                                  { width: `${Math.min(100, (streak / achievement.criteria_value) * 100)}%` }
                                ]} 
                              />
                            </View>
                            <Text style={styles.miniProgressText}>
                              {streak}/{achievement.criteria_value}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.achievementTitle} numberOfLines={1}>
                        {achievement.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const windowWidth = Dimensions.get('window').width;
const GRID_SPACING = 12;
const COLUMNS = 2;
const ITEM_WIDTH = (windowWidth - 48 - (GRID_SPACING * (COLUMNS - 1))) / COLUMNS; // 48 = paddingHorizontal (24) * 2

const createStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? theme.colors.background.page : '#1A1A1A', // Dark background to match image, prevent white flash
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1, // Above background image
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent to show background image
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  fireIconContainer: {
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.warning[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  streakCount: {
    fontSize: 64,
    fontWeight: 'bold',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
    lineHeight: 70,
  },
  streakLabel: {
    fontSize: 24,
    fontWeight: '600',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
    marginBottom: theme.spacing.sm,
  },
  streakDescription: {
    fontSize: 16,
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  
  // Challenge Card Styles
  challengeCard: {
    backgroundColor: isDark ? theme.colors.background.card : 'rgba(31, 41, 55, 0.8)', // grey[800] with transparency for light mode
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border.default : 'rgba(209, 213, 219, 0.3)', // grey[300] with transparency for light mode
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '600',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
  },
  challengeProgress: {
    fontSize: 14,
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
  },
  bubblesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  bubbleWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? theme.colors.background.pressed : 'rgba(55, 65, 81, 0.6)', // grey[700] with transparency for light mode
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border.default : 'rgba(209, 213, 219, 0.3)', // grey[300] with transparency for light mode
  },
  bubbleFilled: {
    backgroundColor: isDark ? theme.colors.background.card : 'rgba(249, 115, 22, 0.3)', // orange[500] with transparency for light mode
    borderColor: theme.colors.warning[500],
  },
  bubbleCurrent: {
    borderColor: theme.colors.warning[500],
    borderWidth: 2,
    backgroundColor: isDark ? theme.colors.background.card : 'rgba(249, 115, 22, 0.2)', // orange[500] with less transparency for current
  },
  challengeFooter: {
    fontSize: 14,
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: isDark ? theme.colors.background.card : 'rgba(31, 41, 55, 0.8)', // grey[800] with transparency for light mode
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border.default : 'rgba(209, 213, 219, 0.3)', // grey[300] with transparency for light mode
  },
  statLabel: {
    fontSize: 14,
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
  },

  // Achievements Grid
  achievementsSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
    marginBottom: theme.spacing.md,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
  },
  achievementItem: {
    width: ITEM_WIDTH,
    marginBottom: theme.spacing.sm,
  },
  achievementCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: isDark ? theme.colors.background.card : 'rgba(31, 41, 55, 0.9)', // grey[800] with transparency for light mode
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border.default : 'rgba(209, 213, 219, 0.3)', // grey[300] with transparency for light mode
  },
  achievementCardLocked: {
    backgroundColor: isDark ? theme.colors.background.imagePlaceholder : 'rgba(55, 65, 81, 0.9)', // grey[700] with transparency for light mode
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementImage: {
    width: '100%',
    height: '100%',
  },
  lockedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.imagePlaceholder,
  },
  questionMark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.tertiary,
    opacity: 0.5,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '500',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
    textAlign: 'center',
  },
  
  // Progress Overlay
  achievementProgressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
  },
  miniProgressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 4,
  },
  miniProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.warning[500],
    borderRadius: 2,
  },
  miniProgressText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
