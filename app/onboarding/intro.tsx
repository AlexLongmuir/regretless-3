/**
 * Intro Step - First screen showing the main app interface
 * 
 * Shows image carousel with 4 images that auto-advance
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { preloadOnboardingImages, onboardingImages } from '../../utils/preloadOnboardingImages';
import { trackEvent } from '../../lib/mixpanel';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Image data structure
interface ImageData {
  id: string;
  source: any; // require() result for local image
  benefitText: string;
}

// Placeholder image data - using existing onboarding images as placeholders
const imageData: ImageData[] = [
  {
    id: '1',
    source: require('../../assets/images/onboarding/20250916_0844_Individuality Amidst Motion_simple_compose_01k58qptvqfr5awmazzyd181js.png'),
    benefitText: 'Benefit 1',
  },
  {
    id: '2',
    source: require('../../assets/images/onboarding/20250916_0840_Golden City Sunrise_simple_compose_01k58qf6d3ekhv8gkph5ac0ygy.png'),
    benefitText: 'Benefit 2',
  },
  {
    id: '3',
    source: require('../../assets/images/onboarding/20250916_0842_Swirling Abstract Energy_simple_compose_01k58qjb1ae89sraq48r9636ze.png'),
    benefitText: 'Benefit 3',
  },
  {
    id: '4',
    source: require('../../assets/images/onboarding/20250916_0855_Silhouette Moving Forward_simple_compose_01k58r9xcefs5rm7mgk7c0b9r5.png'),
    benefitText: 'Benefit 4',
  },
];

// Auto-advance duration in milliseconds (3 seconds per image)
const AUTO_ADVANCE_DURATION = 3000;

const IntroStep: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preload all onboarding images when this screen mounts
  useEffect(() => {
    preloadOnboardingImages();
  }, []);

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'intro'
      });
    }, [])
  );

  // Handle scroll to update current index
  const handleScroll = useCallback((event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    if (index >= 0 && index < imageData.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  }, [currentIndex]);

  // Auto-advance to next image
  const advanceToNext = useCallback(() => {
    if (currentIndex < imageData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }
  }, [currentIndex]);

  // Set up auto-advance timer when index changes
  useEffect(() => {
    // Clear any existing timer
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    // Set new timer to advance to next image
    if (currentIndex < imageData.length - 1) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceToNext();
      }, AUTO_ADVANCE_DURATION);
    }

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, [currentIndex, advanceToNext]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Pause auto-advance when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Cleanup: clear timer when screen loses focus
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
        }
      };
    }, [])
  );

  // Handle tap to skip to next image
  const handleImageTap = useCallback(() => {
    // Clear current timer
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    
    if (currentIndex < imageData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }
  }, [currentIndex]);

  const handleContinue = () => {
    // Clear timer before navigating
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    trackEvent('onboarding_started');
    navigation.navigate('Welcome' as never);
  };

  const renderImage = useCallback(({ item, index }: { item: ImageData; index: number }) => {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleImageTap}
        style={styles.imageContainer}
      >
        <Image
          source={item.source}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </TouchableOpacity>
    );
  }, [handleImageTap, styles]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {imageData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressLine,
                index === currentIndex && styles.progressLineActive,
              ]}
            />
          ))}
        </View>
      </SafeAreaView>

      {/* Image Carousel */}
      <FlatList
        ref={flatListRef}
        data={imageData}
        renderItem={renderImage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        scrollEnabled={false} // Disable manual scrolling, only programmatic
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to offset if scrollToIndex fails
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          });
        }}
      />

      {/* Benefit Text */}
      <View style={styles.benefitContainer}>
        <Text style={styles.benefitText}>
          {imageData[currentIndex]?.benefitText}
        </Text>
      </View>

      {/* Button Container - Unchanged */}
      <View style={styles.buttonContainer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="black"
          style={styles.button}
        />
        
        <Text style={styles.signInText}>
          Already purchased? <Text style={styles.signInLink} onPress={() => navigation.navigate('PostPurchaseSignIn' as never)}>Sign in</Text>
        </Text>
      </View>

      {/* Force load critical onboarding images by rendering them invisibly to ensure instant navigation */}
      <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }} pointerEvents="none">
        <Image source={onboardingImages.individualityImage} transition={0} />
        <Image source={onboardingImages.cityImage} transition={0} />
        <Image source={onboardingImages.silhouetteImage} transition={0} />
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
  },
  progressLine: {
    height: 3,
    width: 30,
    backgroundColor: theme.colors.grey[400],
    borderRadius: 1.5,
  },
  progressLineActive: {
    backgroundColor: theme.colors.text.primary,
    width: 40,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.page,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  benefitContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
  },
  benefitText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.xl,
  },
  signInText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  signInLink: {
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.text.primary,
  },
});

export default IntroStep;
