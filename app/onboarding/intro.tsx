/**
 * Intro Step - First screen showing the main app interface
 * 
 * Shows image carousel with 4 images that auto-advance
 * Implemented with React Native Reanimated for buttery smooth transitions
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  Easing, 
  runOnJS, 
  cancelAnimation 
} from 'react-native-reanimated';
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
    source: require('../../assets/images/onboarding/Figurines.png'),
    benefitText: 'Realise whatever dream you choose',
  },
  {
    id: '2',
    source: require('../../assets/images/onboarding/BeforeAfter.png'),
    benefitText: 'Track your progress in real time',
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

// Auto-advance duration in milliseconds (15 seconds per image)
const AUTO_ADVANCE_DURATION = 15000;

const IntroStep: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  // Reanimated shared value for progress (0 to 1)
  const progress = useSharedValue(0);

  // Preload all onboarding images when this screen mounts
  useEffect(() => {
    preloadOnboardingImages();
  }, []);

  // Track step view when screen is focused and reset to start
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'intro'
      });
      
      // Reset to first image and top position when screen is focused
      setCurrentIndex(0);
      progress.value = 0;
      cancelAnimation(progress);
      
      // Reset scroll position
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: 0,
          animated: false,
        });
      }, 100);
    }, [progress])
  );

  // Function to update index (called from UI thread)
  const advanceToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % imageData.length);
  }, []);

  // Function to start animation
  const startAnimation = useCallback(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: AUTO_ADVANCE_DURATION,
      easing: Easing.linear,
    }, (finished) => {
      if (finished) {
        runOnJS(advanceToNext)();
      }
    });
  }, [advanceToNext, progress]);

  // Effect to handle index changes (scroll and restart animation)
  useEffect(() => {
    // Scroll to the new index immediately
    flatListRef.current?.scrollToIndex({
      index: currentIndex,
      animated: true,
    });

    // Start the progress animation
    startAnimation();

    return () => {
      cancelAnimation(progress);
    };
  }, [currentIndex, startAnimation, progress]);

  // Pause animation when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        cancelAnimation(progress);
      };
    }, [progress])
  );

  // Handle tap to skip to next image
  const handleImageTap = useCallback(() => {
    cancelAnimation(progress);
    advanceToNext();
  }, [advanceToNext, progress]);

  const handleContinue = () => {
    cancelAnimation(progress);
    trackEvent('onboarding_started');
    navigation.navigate('Welcome' as never);
  };

  const renderImage = useCallback(({ item, index }: { item: ImageData; index: number }) => {
    const isFirstImage = index === 0;
    const isSecondImage = index === 1;
    
    return (
      <View style={styles.imageContainer}>
        {isFirstImage ? (
          <ScrollingImage 
            key={currentIndex === 0 ? 'reset' : 'scroll'} 
            source={item.source}
            shouldReset={currentIndex === 0}
          />
        ) : isSecondImage ? (
          <HorizontalScrollingImage 
            key={currentIndex === 1 ? 'reset' : 'scroll'} 
            source={item.source}
            shouldReset={currentIndex === 1}
          />
        ) : (
          <Image
            source={item.source}
            style={styles.image}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        )}
        {/* Benefit Text Overlay - Left aligned, white, on top of image */}
        <View style={styles.benefitOverlay}>
          <Text style={styles.benefitText}>
            {item.benefitText}
          </Text>
        </View>
        {/* Tap area */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleImageTap}
          style={styles.tapArea}
        />
      </View>
    );
  }, [handleImageTap, styles, currentIndex]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  // Calculate progress bar width (full width minus side padding)
  const progressBarWidth = useMemo(() => {
    return SCREEN_WIDTH - (theme.spacing.lg * 2);
  }, [theme.spacing.lg]);

  const progressBarSegmentWidth = useMemo(() => {
    return (progressBarWidth - (8 * (imageData.length - 1))) / imageData.length;
  }, [progressBarWidth]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Progress Indicators - Full width with side padding */}
        <View style={styles.progressContainer}>
          {imageData.map((_, index) => (
            <ProgressBar
              key={index}
              index={index}
              currentIndex={currentIndex}
              progress={progress}
              width={progressBarSegmentWidth}
      />
          ))}
        </View>
      </SafeAreaView>

      {/* Image Carousel - Full Screen */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={imageData}
          renderItem={renderImage}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          scrollEnabled={false} // Disable manual scrolling, only programmatic
          removeClippedSubviews={false} // Keep all views rendered for smoother transitions
          initialNumToRender={4} // Render all images at once
          windowSize={5} // Keep all items in memory
        />
      </View>

      {/* Button Container - Overlay on top of image */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleContinue}
          style={styles.buttonOverlay}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
        
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

// ScrollingImage component for first image - creates video-like vertical scroll effect
const ScrollingImage: React.FC<{
  source: any;
  shouldReset?: boolean;
}> = ({ source, shouldReset = false }) => {
  const scrollY = useSharedValue(0);
  const visibleHeight = SCREEN_HEIGHT; // Full screen height
  const visibleWidth = SCREEN_WIDTH;
  
  // Make image container tall enough to show full image when scrolling
  // Use a large multiplier to ensure we can scroll the full image
  // The image will maintain its aspect ratio with contentFit="contain" and fill the width
  const imageHeight = visibleHeight * 4; // Make it 4x screen height to show full image
  const scrollDistance = imageHeight - visibleHeight; // How far to scroll from top to bottom

  // Reset scroll position when shouldReset changes to true
  useEffect(() => {
    if (shouldReset) {
      cancelAnimation(scrollY);
      scrollY.value = 0;
      // Force immediate reset by setting value directly
      requestAnimationFrame(() => {
        scrollY.value = 0;
      });
    }
  }, [shouldReset, scrollY]);

  useEffect(() => {
    // Function to start scroll animation
    const startScroll = () => {
      // Ensure we start at the very top
      scrollY.value = 0;
      scrollY.value = withTiming(
        -scrollDistance, // Scroll to bottom (showing bottom of image)
        {
          duration: 40000, // 40 seconds to scroll from top to bottom (slower)
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) {
            // When finished, reset to top and start again
            runOnJS(startScroll)();
          }
        }
      );
    };

    // If resetting, cancel any ongoing animation and reset immediately
    if (shouldReset) {
      cancelAnimation(scrollY);
      scrollY.value = 0;
      // Wait a bit longer to ensure reset is applied before starting
      const resetTimer = setTimeout(() => {
        startScroll();
      }, 150);
      return () => {
        cancelAnimation(scrollY);
        clearTimeout(resetTimer);
      };
    }

    // Normal start - ensure initial position is at top, then start animation
    scrollY.value = 0;
    const timer = setTimeout(() => {
      startScroll();
    }, 100);

    return () => {
      cancelAnimation(scrollY);
      clearTimeout(timer);
    };
  }, [scrollY, scrollDistance, shouldReset]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scrollY.value }],
    };
  });

  return (
    <View style={styles.scrollingImageContainer}>
      <Animated.View style={[styles.scrollingImageWrapper, animatedStyle, { height: imageHeight }]}>
        <Image
          source={source}
          style={[styles.scrollingImage, { width: visibleWidth, height: imageHeight }]}
          contentFit="contain"
          contentPosition="top"
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </View>
  );
};

// HorizontalScrollingImage component for second image - creates video-like horizontal scroll effect
const HorizontalScrollingImage: React.FC<{
  source: any;
  shouldReset?: boolean;
}> = ({ source, shouldReset = false }) => {
  const scrollX = useSharedValue(0);
  const visibleHeight = SCREEN_HEIGHT; // Full screen height
  const visibleWidth = SCREEN_WIDTH;
  
  // Make image container wide enough to show full image when scrolling
  // Use a large multiplier to ensure we can scroll the full image
  // The image will fill the height with contentFit="cover" and scroll horizontally
  const imageWidth = visibleWidth * 4; // Make it 4x screen width to show full image
  const scrollDistance = imageWidth - visibleWidth; // How far to scroll from left to right

  // Reset scroll position when shouldReset changes to true
  useEffect(() => {
    if (shouldReset) {
      cancelAnimation(scrollX);
      scrollX.value = 0;
      // Force immediate reset by setting value directly
      requestAnimationFrame(() => {
        scrollX.value = 0;
      });
    }
  }, [shouldReset, scrollX]);

  useEffect(() => {
    // Function to start scroll animation
    const startScroll = () => {
      // Ensure we start at the very left
      scrollX.value = 0;
      scrollX.value = withTiming(
        -scrollDistance, // Scroll to right (showing right side of image)
        {
          duration: 15000, // 20 seconds to scroll from left to right (2x faster)
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) {
            // When finished, reset to left and start again
            runOnJS(startScroll)();
          }
        }
      );
    };

    // If resetting, cancel any ongoing animation and reset immediately
    if (shouldReset) {
      cancelAnimation(scrollX);
      scrollX.value = 0;
      // Wait a bit longer to ensure reset is applied before starting
      const resetTimer = setTimeout(() => {
        startScroll();
      }, 150);
      return () => {
        cancelAnimation(scrollX);
        clearTimeout(resetTimer);
      };
    }

    // Normal start - ensure initial position is at left, then start animation
    scrollX.value = 0;
    const timer = setTimeout(() => {
      startScroll();
    }, 100);

    return () => {
      cancelAnimation(scrollX);
      clearTimeout(timer);
    };
  }, [scrollX, scrollDistance, shouldReset]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: scrollX.value }],
    };
  });

  return (
    <View style={styles.horizontalScrollingImageContainer}>
      <Animated.View style={[styles.horizontalScrollingImageWrapper, animatedStyle, { width: imageWidth }]}>
        <Image
          source={source}
          style={[styles.horizontalScrollingImage, { width: imageWidth, height: visibleHeight }]}
          contentFit="cover"
          contentPosition="left"
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </View>
  );
};

// Separated ProgressBar component for optimization
const ProgressBar: React.FC<{
  index: number;
  currentIndex: number;
  progress: Animated.SharedValue<number>;
  width: number;
}> = ({ index, currentIndex, progress, width }) => {
  const animatedStyle = useAnimatedStyle(() => {
    let currentWidth = 0;
    
    if (index < currentIndex) {
      currentWidth = width;
    } else if (index === currentIndex) {
      currentWidth = progress.value * width;
    } else {
      currentWidth = 0;
    }

    return {
      width: currentWidth,
    };
  });

  return (
    <View
      style={[
        styles.progressLineContainer,
        { width },
      ]}
    >
      <View style={[styles.progressLineBackground, { width }]} />
      <Animated.View
        style={[
          styles.progressLineFill,
          animatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB', // Default light theme background
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 24, // theme.spacing.lg
    gap: 8,
  },
  progressLineContainer: {
    height: 4,
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressLineBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'absolute',
  },
  progressLineFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  carouselContainer: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  horizontalScrollingImageContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000000', // Black background to match image
  },
  horizontalScrollingImageWrapper: {
    height: SCREEN_HEIGHT,
  },
  horizontalScrollingImage: {
    height: SCREEN_HEIGHT,
  },
  benefitOverlay: {
    position: 'absolute',
    bottom: 160, // Position above button with equal spacing
    left: 0,
    right: 0,
    paddingHorizontal: 24, // theme.spacing.lg
  },
  benefitText: {
    fontFamily: 'System',
    fontSize: 28, // theme.typography.fontSize.title1
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 32, // theme.spacing.xl
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24, // theme.spacing.lg
    zIndex: 5,
  },
  buttonOverlay: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // theme.radius.xl
    paddingVertical: 16, // theme.spacing.md
    paddingHorizontal: 24, // theme.spacing.lg
    marginBottom: 16, // theme.spacing.md - Equal spacing between button and sign-in text
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'System',
    fontSize: 16, // theme.typography.fontSize.callout
    fontWeight: '600',
    color: '#000000',
  },
  signInText: {
    fontFamily: 'System',
    fontSize: 15, // theme.typography.fontSize.subheadline
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  signInLink: {
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
  },
  progressLineContainer: {
    height: 4,
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressLineBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'absolute',
  },
  progressLineFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  carouselContainer: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scrollingImageContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000000', // Black background to match image
  },
  scrollingImageWrapper: {
    width: SCREEN_WIDTH,
  },
  scrollingImage: {
    width: SCREEN_WIDTH,
  },
  horizontalScrollingImageContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000000', // Black background to match image
  },
  horizontalScrollingImageWrapper: {
    height: SCREEN_HEIGHT,
  },
  horizontalScrollingImage: {
    height: SCREEN_HEIGHT,
  },
  benefitOverlay: {
    position: 'absolute',
    bottom: 160, // Position above button with equal spacing
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
  },
  benefitText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: '#FFFFFF',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: 0,
    right: 0,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    zIndex: 5,
  },
  buttonOverlay: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md, // Equal spacing between button and sign-in text
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: '#000000',
  },
  signInText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  signInLink: {
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default IntroStep;
