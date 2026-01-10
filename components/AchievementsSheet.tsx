import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { SheetHeader } from './SheetHeader';
import { Icon } from './Icon';
import type { Achievement, UserAchievement } from '../backend/database/types';
import { BOTTOM_NAV_PADDING } from '../utils/bottomNavigation';

interface AchievementsSheetProps {
  visible: boolean;
  onClose: () => void;
  achievements: (Achievement & { user_progress?: UserAchievement | null })[];
  onAchievementPress?: (achievement: Achievement & { user_progress?: UserAchievement | null }) => void;
}

export const AchievementsSheet: React.FC<AchievementsSheetProps> = ({ 
  visible, 
  onClose, 
  achievements,
  onAchievementPress 
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const backgroundOpacity = 1.0; // 100% opacity
  const [selectedAchievement, setSelectedAchievement] = useState<(Achievement & { user_progress?: UserAchievement | null }) | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  
  const unlockedCount = achievements.filter(a => a.user_progress).length;
  const totalCount = achievements.length;

  const handleAchievementPress = (achievement: Achievement & { user_progress?: UserAchievement | null }) => {
    setSelectedAchievement(achievement);
    // Animate slide to detail view
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    if (onAchievementPress) {
      onAchievementPress(achievement);
    }
  };

  const handleBack = () => {
    // Animate slide back to grid view
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start(() => {
      setSelectedAchievement(null);
    });
  };

  const handleClose = () => {
    // Reset animation and close
    slideAnim.setValue(0);
    setSelectedAchievement(null);
    onClose();
  };

  // Reset animation when modal closes
  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(0);
      setSelectedAchievement(null);
    }
  }, [visible]);

  const screenHeight = Dimensions.get('window').height;
  const imageHeight = screenHeight * 0.45;
  const imageWidth = screenWidth + (theme.spacing.md * 2);
  
  const isUnlocked = selectedAchievement ? !!selectedAchievement.user_progress : false;
  
  const formatUnlockDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day} ${year}`; // Just return the date part, "on" is added in the status text
  };

  // Get background image URL from Supabase storage
  const getBackgroundImageUrl = () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    return `${supabaseUrl}/storage/v1/object/public/achievement-images/AchievementsBackground.png`;
  };

  const backgroundImageUrl = getBackgroundImageUrl();

  // Prefetch background image
  useEffect(() => {
    if (backgroundImageUrl) {
      Image.prefetch(backgroundImageUrl);
    }
  }, [backgroundImageUrl]);

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <StatusBar style={selectedAchievement ? "light" : (isDark ? "light" : "dark")} />
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
          {/* Grid View */}
          <Animated.View
            style={[
              styles.viewContainer,
              {
                transform: [{
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -screenWidth]
                  })
                }]
              }
            ]}
            pointerEvents={selectedAchievement ? 'none' : 'auto'}
          >
            <SafeAreaView style={styles.gridSafeArea} edges={['top']}>
              <View style={styles.headerContainer}>
                <SheetHeader 
                  onClose={handleClose} 
                />
              </View>
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Header Content - now in scrollview, not sticky */}
                <View style={styles.header}>
                  <Text style={styles.title}>Achievements</Text>
                  <Text style={styles.statsText}>
                    You have unlocked <Text style={styles.statsHighlight}>{unlockedCount}/{totalCount}</Text> achievements.
                  </Text>
                </View>
                <View style={styles.grid}>
                  {achievements.map((achievement) => {
                    const achievementIsUnlocked = !!achievement.user_progress;
                    
                    return (
                      <TouchableOpacity
                        key={achievement.id}
                        style={styles.gridItem}
                        onPress={() => handleAchievementPress(achievement)}
                        activeOpacity={0.8}
                      >
                        <View style={[
                          styles.card,
                          !achievementIsUnlocked && styles.cardLocked
                        ]}>
                          {achievementIsUnlocked && achievement.image_url ? (
                            <Image 
                              source={{ uri: achievement.image_url }} 
                              style={styles.image}
                              resizeMode="cover"
                            />
                          ) : achievement.locked_image_url ? (
                            <Image 
                              source={{ uri: achievement.locked_image_url }} 
                              style={[styles.image, styles.lockedImage]}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.lockedContent}>
                               <Text style={styles.questionMark}>?</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>

          {/* Detail View */}
          <Animated.View
            style={[
              styles.viewContainer,
              styles.detailViewContainer,
              {
                transform: [{
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [screenWidth, 0]
                  })
                }]
              }
            ]}
            pointerEvents={selectedAchievement ? 'auto' : 'none'}
          >
            {/* Detail Header Overlay - Inside the animated view */}
            <View style={styles.detailHeaderOverlay} pointerEvents="box-none">
              <SafeAreaView edges={['top']} style={styles.detailHeaderSafeArea}>
                <View style={styles.detailHeader}>
                  {/* Back button - same dimensions as X button in SheetHeader */}
                  {isDark ? (
                    <TouchableOpacity onPress={handleBack} style={styles.glassButtonWrapper}>
                      <View style={[styles.glassButton, { backgroundColor: theme.colors.background.card }]}>
                        <View style={{ marginLeft: -1 }}>
                          <Icon name="chevron_left_rounded" size={42} color={theme.colors.text.primary} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleBack} style={styles.glassButtonWrapper}>
                      <BlurView intensity={100} tint="light" style={styles.glassButton}>
                        <View style={{ marginLeft: -1 }}>
                          <Icon name="chevron_left_rounded" size={42} color={theme.colors.text.primary} />
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  )}
                  <View style={{ width: 44 }} />
                </View>
              </SafeAreaView>
            </View>

            <View style={styles.detailContentContainer}>
              {selectedAchievement && (
                <ScrollView 
                  style={styles.scrollView}
                  contentContainerStyle={styles.detailScrollContent}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={true}
                >
                {/* Background Image - extends full width to top */}
                <View style={[styles.detailImageBackground, { height: imageHeight, width: imageWidth }]}>
                    {isUnlocked && selectedAchievement.image_url ? (
                      <Image 
                        source={{ uri: selectedAchievement.image_url }} 
                        style={styles.detailBackgroundImage}
                        resizeMode="cover"
                      />
                    ) : selectedAchievement.locked_image_url ? (
                      <Image 
                        source={{ uri: selectedAchievement.locked_image_url }} 
                        style={[styles.detailBackgroundImage, styles.lockedImage]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.detailPlaceholderBackground}>
                        <Text style={styles.detailPlaceholderQuestionMark}>?</Text>
                      </View>
                    )}
                  </View>

                {/* Title - has matching top padding to horizontal padding */}
                <Text style={styles.detailTitle}>
                  {selectedAchievement.title}
                </Text>

                {/* Status Info - Combined with unlock date */}
                <View style={styles.detailStatusRow}>
                  <Text style={styles.detailStatus}>
                    {isUnlocked && selectedAchievement.user_progress 
                      ? `✓ Unlocked on ${formatUnlockDate(selectedAchievement.user_progress.unlocked_at)}`
                      : '🔒 Locked'
                    }
                  </Text>
                </View>
                
                {/* Description */}
                <Text style={styles.detailDescription}>
                  {isUnlocked 
                    ? selectedAchievement.description 
                    : selectedAchievement.hidden 
                      ? 'Keep playing to unlock this achievement.'
                      : selectedAchievement.description
                  }
                  </Text>
                </ScrollView>
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const windowWidth = Dimensions.get('window').width;
const GRID_SPACING = 12;
const COLUMNS = 2; // Changed to 2 columns for better visibility
// Calculate item width based on available space: (Screen Width - (Padding * 2) - (Spacing * (Columns - 1))) / Columns
const ITEM_WIDTH = (windowWidth - 32 - (GRID_SPACING * (COLUMNS - 1))) / COLUMNS;

const createStyles = (theme: Theme, isDark?: boolean) => {
  const screenWidth = Dimensions.get('window').width;
  return StyleSheet.create({
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
  gridHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1, // Above background image
  },
  viewContainer: {
    width: screenWidth,
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent', // Transparent to show background image
  },
  detailViewContainer: {
    left: 0,
    backgroundColor: 'transparent', // Transparent to show background image
    zIndex: 1,
  },
  detailContentWrapper: {
    flex: 1,
  },
  detailContentContainer: {
    flex: 1,
  },
  gridSafeArea: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent to show background image
  },
  headerContainer: {
    backgroundColor: 'transparent', // Transparent to show background image
    zIndex: 10, // Above background, below content
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
    marginBottom: 8,
  },
  statsText: {
    fontSize: 16,
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
  },
  statsHighlight: {
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
  },
  gridItem: {
    width: ITEM_WIDTH,
    aspectRatio: 1,
  },
  card: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.card,
  },
  cardLocked: {
    backgroundColor: theme.colors.background.imagePlaceholder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  lockedImage: {
    opacity: 0.8, // Reduced opacity for locked achievements
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
  // Detail view styles
  detailHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent', // Transparent so background image shows through
  },
  detailHeaderSafeArea: {
    width: '100%',
    backgroundColor: 'transparent', // Transparent to show background image
  },
  detailHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md, // Match horizontal padding
    paddingBottom: theme.spacing.md, // Match horizontal padding
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent', // Transparent to show background image
  },
  glassButtonWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background.card + 'F0', // ~95% opacity (only used in light mode)
    borderWidth: 0.5,
    borderColor: theme.colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailScrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 60, // Account for header height - image extends to top via negative margin
    paddingBottom: BOTTOM_NAV_PADDING,
  },
  detailImageBackground: {
    overflow: 'hidden',
    marginLeft: -theme.spacing.md,
    marginRight: -theme.spacing.md,
    marginTop: -60, // Negative margin to extend image to top (compensates for paddingTop)
    marginBottom: 0, // Title has marginTop to match horizontal padding
  },
  detailBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  detailPlaceholderBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.imagePlaceholder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailPlaceholderQuestionMark: {
    fontSize: 120,
    fontWeight: 'bold',
    color: theme.colors.text.tertiary,
    opacity: 0.5,
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
    textAlign: 'left',
    marginTop: theme.spacing.md, // Match horizontal padding for top spacing
    marginBottom: theme.spacing.sm,
  },
  detailStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  detailStatus: {
    fontSize: 14,
    fontWeight: '600',
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
  },
  detailDescription: {
    fontSize: 16,
    // Use dark mode colors for better contrast with background image
    color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  });
};
