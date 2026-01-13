import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { SheetHeader } from './SheetHeader';
import { Button } from './Button';
import type { AchievementUnlockResult } from '../backend/database/types';

// Conditionally import Lottie
let LottieView: any = null;
try {
  LottieView = require('lottie-react-native').default;
} catch (e) {
  console.warn('lottie-react-native not installed. Run: npx expo install lottie-react-native');
}

// Achievement Unlocked Sheet
// 
// Shows a congratulations sheet when achievements are unlocked.
// Displays trophy animation and shows achievement details in a carousel if multiple achievements.
//
// TRIGGER: The sheet is triggered by calling checkNewAchievements() which checks the database
// for newly unlocked achievements.
//
// ARCHITECTURE: This component is a PURE VIEW. It is intended to be used:
// 1. As a Screen in the Navigation Stack (native modal)
// 2. Or wrapped in a Modal if needed
//
// The sheet displays full screen and shows a carousel if multiple achievements are unlocked simultaneously.

interface AchievementUnlockedSheetProps {
  achievements: AchievementUnlockResult[];
  onClose: () => void;
  onViewAchievements: () => void;
}

export const AchievementUnlockedSheet: React.FC<AchievementUnlockedSheetProps> = ({ 
  achievements, 
  onClose,
  onViewAchievements
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const lottieRef = useRef<any>(null);
  const windowWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const imageHeight = screenHeight * 0.45;
  const imageWidth = windowWidth + (theme.spacing.md * 2);
  const backgroundOpacity = 1.0; // 100% opacity

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

  // Play trophy animation when sheet appears
  useEffect(() => {
    if (LottieView && lottieRef.current) {
      lottieRef.current?.play();
    }
  }, []);

  if (achievements.length === 0) return null;

  const currentAchievement = achievements[currentIndex];

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageWidth = windowWidth; // Full screen width for paging
    const index = Math.round(offsetX / pageWidth);
    setCurrentIndex(index);
  };

  const handleViewAchievements = () => {
    onViewAchievements();
  };

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
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
      
      {/* Header Overlay - Positioned above content like DreamPage */}
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerContainer}>
            <SheetHeader onClose={onClose} />
          </View>
        </SafeAreaView>
      </View>
      
      {/* Content Container - No vertical scrolling */}
      <View style={styles.contentContainer}>
        {/* Achievement Carousel */}
        <View style={styles.carouselWrapper}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
            bounces={false}
            scrollEnabled={achievements.length > 1}
          >
            {achievements.map((achievement, index) => (
              <View key={achievement.achievement_id} style={styles.carouselPage}>
                {/* Achievement Image - Full width at top, extends to header like detail view */}
                <View style={[styles.achievementImageBackground, { height: imageHeight, width: imageWidth }]}>
                  {achievement.image_url ? (
                    <Image 
                      source={{ uri: achievement.image_url }} 
                      style={styles.achievementImage}
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                  ) : (
                    <View style={styles.achievementPlaceholderBackground}>
                      <Text style={styles.achievementPlaceholderQuestionMark}>?</Text>
                    </View>
                  )}
                  
                  {/* Trophy Animation & Congratulations Text - Overlaid on image (only on first achievement) */}
                  {index === 0 && (
                    <View style={styles.overlayContent}>
                      <View style={styles.trophyContainer}>
                        {LottieView ? (
                          <LottieView
                            ref={lottieRef}
                            source={require('../assets/Trophy.json')}
                            autoPlay
                            loop={false}
                            speed={0.35}
                            style={styles.trophyAnimation}
                          />
                        ) : (
                          <Text style={styles.trophyEmoji}>🏆</Text>
                        )}
                      </View>
                      <Text style={styles.congratsText}>Achievement Unlocked!</Text>
                    </View>
                  )}
                </View>

                {/* Achievement Title - Below image, matching detail view */}
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                
                {/* Achievement Description - Matching detail view */}
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Dots Indicator for multiple achievements */}
        {achievements.length > 1 && (
          <View style={styles.dotsContainer}>
            {achievements.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.dot,
                  index === currentIndex && styles.activeDot
                ]} 
              />
            ))}
          </View>
        )}
      </View>

      {/* Sticky Button at Bottom */}
      <View style={styles.buttonContainer}>
        <SafeAreaView edges={['bottom']} style={styles.buttonSafeArea}>
          <Button
            title="View Achievements"
            onPress={handleViewAchievements}
            variant="secondary"
            style={styles.viewButton}
          />
        </SafeAreaView>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, isDark?: boolean) => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const imageHeight = screenHeight * 0.45;
  const imageWidth = screenWidth + (theme.spacing.md * 2);
  // Calculate reduced bottom padding (reduced by 1/3rd)
  const reducedBottomPadding = Math.round(theme.spacing.xl * (2/3)); // 32 * 2/3 = ~21
  // Calculate reduced gap (reduced by half)
  // If the original gap was theme.spacing.md (16px), half is 8px (theme.spacing.sm)
  // But if current visible gap is smaller, reduce from that
  // Using theme.spacing.xs / 2 = 2px to ensure gap is reduced by half from a typical spacing
  const reducedGap = theme.spacing.xs / 2; // 4 / 2 = 2px - reduced by half
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? theme.colors.background.page : '#1A1A1A', // Dark background to match image, prevent white flash
      position: 'relative',
      overflow: 'hidden',
      width: '100%', // Ensure container is full width only
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
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      backgroundColor: 'transparent', // Transparent so background image shows through
    },
    headerSafeArea: {
      width: '100%',
      backgroundColor: 'transparent', // Transparent to show background image
    },
    headerContainer: {
      backgroundColor: 'transparent', // Transparent to show background image
    },
    contentContainer: {
      flex: 1,
      paddingTop: 0, // Image extends to top - no padding needed
      paddingBottom: 100, // Space for sticky button at bottom
    },
    carouselWrapper: {
      flex: 1,
      width: '100%',
      overflow: 'hidden', // Prevent horizontal scroll from escaping
    },
    carousel: {
      width: '100%',
      flex: 1,
    },
    carouselContent: {
      paddingHorizontal: 0,
    },
    carouselPage: {
      alignItems: 'flex-start',
      paddingHorizontal: theme.spacing.md, // Match detail view padding
      width: screenWidth, // Full width for proper carousel paging
      justifyContent: 'flex-start',
      paddingTop: 0,
      height: '100%', // Fill parent height
    },
    achievementImageBackground: {
      overflow: 'hidden',
      marginLeft: -theme.spacing.md, // Extend to left edge
      marginRight: -theme.spacing.md, // Extend to right edge
      marginTop: 0, // Image starts at top of scroll content, extends behind header
      marginBottom: 0, // Title has marginTop to match horizontal padding
      borderRadius: 0, // Full width, no border radius
      position: 'relative',
    },
    achievementImage: {
      width: '100%',
      height: '100%',
    },
    achievementPlaceholderBackground: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.background.imagePlaceholder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    achievementPlaceholderQuestionMark: {
      fontSize: 120,
      fontWeight: 'bold',
      color: theme.colors.text.tertiary,
      opacity: 0.5,
    },
    overlayContent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.2)', // Subtle overlay for better text visibility
      paddingTop: 0,
      paddingBottom: 0,
    },
    trophyContainer: {
      width: 180,
      height: 180,
      marginBottom: reducedGap, // Reduced gap by half - explicitly set spacing
      alignItems: 'center',
      justifyContent: 'center',
    },
    trophyAnimation: {
      width: 180,
      height: 180,
    },
    trophyEmoji: {
      fontSize: 120,
    },
    congratsText: {
      fontSize: 28,
      fontWeight: 'bold',
      // Use white text for contrast against image
      color: '#FFFFFF', // Always white for overlay
      textAlign: 'center',
    },
    achievementTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      // Use dark mode colors for better contrast with background image
      color: isDark ? theme.colors.text.primary : '#F9FAFB', // grey[50] for light mode
      textAlign: 'left',
      marginTop: theme.spacing.md, // Match horizontal padding, same as detail view
      marginBottom: theme.spacing.sm,
      width: '100%',
      paddingHorizontal: 0,
    },
    achievementDescription: {
      fontSize: 16,
      // Use dark mode colors for better contrast with background image
      color: isDark ? theme.colors.text.secondary : '#D1D5DB', // grey[300] for light mode
      textAlign: 'left',
      lineHeight: 22,
      width: '100%',
      marginBottom: theme.spacing.md,
      paddingHorizontal: 0,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md, // Match text padding
      paddingBottom: theme.spacing.md,
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.disabled.inactive,
    },
    activeDot: {
      backgroundColor: theme.colors.primary[500],
      width: 24,
    },
    buttonContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'transparent', // Transparent to show background image
      zIndex: 10, // Above content
    },
    buttonSafeArea: {
      paddingHorizontal: theme.spacing.md, // Match text padding
      paddingTop: theme.spacing.md,
      paddingBottom: reducedBottomPadding, // Reduced by 1/3rd
      backgroundColor: 'transparent',
    },
    viewButton: {
      backgroundColor: '#FFFFFF', // White background (overrides secondary variant)
      borderWidth: 0, // Remove border for clean white button
    },
  });
};
