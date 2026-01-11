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
              <View style={styles.streakCountRow}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Icon name="fire" size={70} color={theme.colors.warning[500]} />
                </Animated.View>
                <Text style={styles.streakCount}>{streak}</Text>
              </View>
              <Text style={styles.streakLabel}>Action Streak</Text>
              {longestStreak > streak && (
                <Text style={styles.longestStreakLabel}>
                  Best: {longestStreak} actions
                </Text>
              )}
            </View>

            {/* Challenge Card */}
            <View style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <Text style={styles.challengeProgress}>
                  {streak} / {nextChallengeTarget}
                </Text>
              </View>
              
              <View style={styles.bubblesContainer}>
                {Array.from({ length: 7 }).map((_, index) => {
                  // Calculate progress in the current 7-action cycle
                  // Each cycle represents 7 consecutive actions
                  // Example: If streak = 13, we're in cycle 2 (actions 8-14), progressInCycle = 13 - 7*1 = 6
                  // So bubbles 0-5 are completed, bubble 6 is current (next action to complete)
                  
                  const cycleNumber = Math.floor(streak / 7);
                  const progressInCycle = streak % 7;
                  
                  // Calculate the action number for this bubble (1-7) in the current cycle
                  const cycleStart = cycleNumber * 7;
                  const actionNumber = cycleStart + index + 1;
                  
                  // If progressInCycle === 0 and streak > 0, we just completed a full cycle
                  // In that case, show all 7 filled (we completed actions 1-7, 8-14, etc.)
                  // For the "current" bubble, show the next one in the cycle
                  const isFilled = progressInCycle === 0 && streak > 0 
                    ? true // All filled when we complete a cycle
                    : index < progressInCycle; // Otherwise, show progress up to current
                  
                  const isCurrent = progressInCycle === 0 && streak > 0
                    ? false // No current bubble when cycle is complete
                    : index === progressInCycle; // Current bubble is at the progress point
                  
                  const isEmpty = !isFilled && !isCurrent;
                  
                  return (
                    <View key={index} style={styles.bubbleWrapper}>
                      <View style={[
                        styles.bubble,
                        isFilled && styles.bubbleFilled,
                        isCurrent && styles.bubbleCurrent,
                        isEmpty && styles.bubbleEmpty
                      ]}>
                        {isFilled ? (
                          <Icon 
                            name="fire" 
                            size={20} 
                            color={theme.colors.warning[500]} 
                          />
                        ) : isCurrent ? (
                          <View style={styles.currentBubbleInner}>
                            <Icon 
                              name="fire" 
                              size={24} 
                              color={theme.colors.warning[600]} 
                            />
                          </View>
                        ) : (
                          <View style={styles.emptyBubbleInner} />
                        )}
                      </View>
                      {/* Action number label */}
                      <Text style={[
                        styles.bubbleLabel,
                        isFilled && styles.bubbleLabelFilled,
                        isCurrent && styles.bubbleLabelCurrent
                      ]}>
                        {actionNumber}
                      </Text>
                    </View>
                  );
                })}
              </View>
              
              <Text style={styles.challengeFooter}>
                {nextChallengeTarget} Action Challenge: Complete {nextChallengeTarget} consecutive actions without missing a deadline
              </Text>
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
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  streakCount: {
    fontSize: 64,
    fontWeight: 'bold',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
    lineHeight: 70,
    height: 70, // Same height as icon for alignment
  },
  streakLabel: {
    fontSize: 24,
    fontWeight: '600',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
    marginBottom: theme.spacing.xs,
  },
  longestStreakLabel: {
    fontSize: 14,
    fontWeight: '400',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.secondary : '#9CA3AF', // grey[400] for light mode - subtle iOS-style metadata
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  challengeProgress: {
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.3)', // orange[500] with transparency
    borderColor: theme.colors.warning[500],
    borderWidth: 1,
  },
  bubbleCurrent: {
    borderColor: theme.colors.warning[500],
    borderWidth: 3,
    backgroundColor: isDark ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.6)', // More visible for current
    shadowColor: theme.colors.warning[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 6,
  },
  bubbleEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  bubbleLabel: {
    fontSize: 12,
    fontWeight: '500',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.tertiary : '#9CA3AF', // grey[400] for light mode
  },
  bubbleLabelFilled: {
    color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
  },
  bubbleLabelCurrent: {
    color: theme.colors.warning[500],
    fontWeight: '600',
  },
  currentBubbleInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBubbleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: isDark ? theme.colors.disabled.text : 'rgba(209, 213, 219, 0.3)', // Subtle dot for empty
  },
  challengeFooter: {
    fontSize: 14,
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 20,
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
