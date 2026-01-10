import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDailyWelcome } from '../../hooks/useDailyWelcome';
import { BreathStep } from './steps/BreathStep';
import { RecommendationStep } from './steps/RecommendationStep';
import { TasksPreviewStep } from './steps/TasksPreviewStep';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';

type Step = 'breath' | 'recommendation' | 'tasks';

export const DailyWelcomeContainer: React.FC = () => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { shouldShow, markAsSeen, isLoading } = useDailyWelcome();
  const [currentStep, setCurrentStep] = useState<Step>('breath');
  const [isVisible, setIsVisible] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const slideAnim = React.useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (shouldShow && !isLoading) {
      setIsVisible(true);
      // Slide up
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    }
  }, [shouldShow, isLoading]);

  const handleComplete = () => {
    // Slide down
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      markAsSeen();
      // Reset step for next time (though unmount happens)
      setCurrentStep('breath');
    });
  };

  const nextStep = () => {
    if (currentStep === 'breath') setCurrentStep('recommendation');
    else if (currentStep === 'recommendation') setCurrentStep('tasks');
    else handleComplete();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={styles.overlayBackground} 
        activeOpacity={1}
        onPress={handleComplete}
      />
      <Animated.View 
        style={[
          styles.floatingContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.blurContainer}>
          <Image 
            source={require('../../assets/starrybackground.png')}
            style={styles.backgroundImage}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.contentOverlay}>
            <SafeAreaView style={styles.contentContainer} edges={['bottom']}>
              {currentStep === 'breath' && <BreathStep onComplete={nextStep} />}
              {currentStep === 'recommendation' && <RecommendationStep onComplete={nextStep} />}
              {currentStep === 'tasks' && <TasksPreviewStep onComplete={nextStep} />}
            </SafeAreaView>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background.overlay,
  },
  floatingContainer: {
    width: '100%',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
  },
  blurContainer: {
    width: '100%',
    maxWidth: 500, // Constrain width for larger screens
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    minHeight: 400,
    maxHeight: '75%',
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
  },
  contentOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
});
