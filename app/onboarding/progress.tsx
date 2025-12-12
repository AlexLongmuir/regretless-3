/**
 * Progress Step - We're setting everything up for you
 * 
 * Shows progress with variable messages and 10s delay before auto-navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { OnboardingHeader } from '../../components/onboarding';
import { Icon } from '../../components/Icon';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { generateOnboardingAreas } from '../../frontend-services/backend-bridge';
import { trackEvent } from '../../lib/mixpanel';

const progressMessages = [
  "Analyzing your responses...",
  "Generating personalized recommendations...",
  "Creating your custom plan...",
  "Optimizing for your goals...",
  "Finalizing your results...",
];

const ProgressStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setGeneratedAreas } = useOnboardingContext();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'progress'
      });
    }, [])
  );

  // Helper function to map onboarding answers to dream parameters for areas only
  const mapOnboardingAnswersToDreamParams = () => {
    const answers = state.answers;
    
    // Map question IDs to dream parameters based on onboarding flow
    const title = answers[2] || 'Your Dream'; // Main dream from main-dream.tsx
    const baseline = answers[4] || undefined; // Current progress from current-progress.tsx
    const obstacles = answers[10] || undefined; // Obstacles from obstacles.tsx
    const enjoyment = answers[11] || undefined; // Motivation from motivation.tsx
    
    return {
      title,
      baseline,
      obstacles,
      enjoyment
    };
  };

  // Generate real content using AI once when component mounts
  useEffect(() => {
    // Check if we already have generated content to prevent regeneration
    if (state.generatedAreas.length > 0) {
      setIsGenerationComplete(true);
      return;
    }

    const generateContent = async () => {
      try {
        const dreamParams = mapOnboardingAnswersToDreamParams();
        
        console.log('🎯 [ONBOARDING] Starting areas generation with params:', dreamParams);
        console.log('🌐 [ONBOARDING] API URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
        
        // Generate areas using real AI
        const areas = await generateOnboardingAreas({
          title: dreamParams.title,
          baseline: dreamParams.baseline,
          obstacles: dreamParams.obstacles,
          enjoyment: dreamParams.enjoyment
        });
        
        if (areas && areas.length > 0) {
          console.log('✅ [ONBOARDING] Generated areas:', areas.length);
          setGeneratedAreas(areas);
          
          // Mark generation as complete
          setIsGenerationComplete(true);
          console.log('🎉 [ONBOARDING] Areas generation complete - ready to navigate');
        } else {
          // No areas returned, mark as complete anyway to allow navigation
          console.warn('⚠️ [ONBOARDING] No areas returned from generation');
          setIsGenerationComplete(true);
        }
      } catch (error) {
        console.error('❌ [ONBOARDING] Failed to generate areas:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ [ONBOARDING] Error details:', errorMessage);
        
        // Continue with progress even if generation fails - user can retry later
        // This prevents the UI from getting stuck
        setIsGenerationComplete(true);
      }
    };

    // Start generation immediately
    generateContent();
  }, []); // Empty dependency array - only run once on mount

  // Progress animation effect (separate from generation)
  useEffect(() => {
    // Progress animation over 10 seconds
    const progressAnimation = Animated.timing(animatedValue, {
      toValue: 1,
      duration: 10000,
      useNativeDriver: false,
    });

    // Message rotation every 2 seconds (5 messages over 10 seconds)
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex < progressMessages.length ? nextIndex : prev;
      });
    }, 2000);

    let progressIntervalCleared = false;

    // Progress update with inverse exponential curve
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Inverse exponential: fast at start, slow at end
        // Using formula: increment = 3 / (1 + prev/20)^1.5 for ~10 second completion
        const increment = 3 / Math.pow(1 + prev / 20, 1.5);
        const newProgress = Math.min(prev + increment, 100);
        
        if (newProgress >= 100 && isGenerationComplete && !progressIntervalCleared) {
          progressIntervalCleared = true;
          clearInterval(progressInterval);
          // Auto-navigate to areas confirmation only after generation is complete
          setTimeout(() => {
            navigation.navigate('AreasConfirm' as never);
          }, 500);
        }
        return newProgress;
      });
    }, 50);

    progressAnimation.start();

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
      progressAnimation.stop();
    };
  }, [navigation, animatedValue, isGenerationComplete]);

  // Separate effect to handle navigation when generation completes after progress reaches 100%
  useEffect(() => {
    if (isGenerationComplete && progress >= 100) {
      // Generation completed and progress is already at 100%, navigate immediately
      const timeout = setTimeout(() => {
        navigation.navigate('AreasConfirm' as never);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isGenerationComplete, progress, navigation]);

  const handleBack = () => {
    navigation.goBack();
  };

  const progressWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
          <Text style={styles.progressTitle}>We're setting everything up for you</Text>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.currentMessage}>
            {progressMessages[currentMessageIndex]}
          </Text>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Finalising Results</Text>
          
          <View style={styles.checklistContainer}>
            <View style={styles.checklistItem}>
              <View style={[styles.checkbox, progress > 2 && styles.checkboxChecked]}>
                {progress > 2 && <Icon name="check" size={10} color="white" />}
              </View>
              <Text style={styles.checklistText}>Creating your personalized dream plan</Text>
            </View>
            <View style={styles.checklistSubItems}>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 5 && styles.checkboxChecked]}>
                  {progress > 5 && <Icon name="check" size={10} color="white" />}
                </View>
                <Text style={styles.checklistText}>Goal areas and timeline</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 8 && styles.checkboxChecked]}>
                  {progress > 8 && <Icon name="check" size={10} color="white" />}
                </View>
                <Text style={styles.checklistText}>Daily action recommendations</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 12 && styles.checkboxChecked]}>
                  {progress > 12 && <Icon name="check" size={10} color="white" />}
                </View>
                <Text style={styles.checklistText}>Progress tracking system</Text>
              </View>
            </View>
            
            <View style={styles.checklistItem}>
              <View style={[styles.checkbox, progress > 18 && styles.checkboxChecked]}>
                {progress > 18 && <Icon name="check" size={10} color="white" />}
              </View>
              <Text style={styles.checklistText}>Setting up your daily workflow</Text>
            </View>
            <View style={styles.checklistSubItems}>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 25 && styles.checkboxChecked]}>
                  {progress > 25 && <Icon name="check" size={10} color="white" />}
                </View>
                <Text style={styles.checklistText}>Today's action cards</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 35 && styles.checkboxChecked]}>
                  {progress > 35 && <Icon name="check" size={10} color="white" />}
                </View>
                <Text style={styles.checklistText}>Progress photo gallery</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 50 && styles.checkboxChecked]}>
                  {progress > 50 && <Icon name="check" size={10} color="white" />}
                </View>
                <Text style={styles.checklistText}>Streak tracking</Text>
              </View>
            </View>
            
            <View style={styles.checklistItem}>
              <View style={[styles.checkbox, progress > 70 && styles.checkboxChecked]}>
                {progress > 70 && <Icon name="check" size={10} color="white" />}
              </View>
              <Text style={styles.checklistText}>Preparing your progress dashboard</Text>
            </View>
            <View style={styles.checklistSubItems}>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 85 && styles.checkboxChecked]}>
                  {progress > 85 && <Icon name="check" size={10} color="white" />}
                </View>
                <Text style={styles.checklistText}>Weekly/monthly analytics</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 93 && styles.checkboxChecked]}>
                  {progress > 93 && <Icon name="check" size={10} color="white" />}
                </View>
                <Text style={styles.checklistText}>Achievement milestones</Text>
              </View>
              <View style={styles.checklistItem}>
                <View style={[styles.checkbox, progress > 97 && styles.checkboxChecked]}>
                  {progress > 97 && <Icon name="check" size={10} color="white" />}
                </View>
                <Text style={styles.checklistText}>AI-powered insights</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing['3xl'],
  },
  progressPercentage: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 48,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
  },
  progressTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[700],
    textAlign: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
    minHeight: 40,
  },
  currentMessage: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
  },
  checklistContainer: {
    gap: theme.spacing.sm,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.grey[300],
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  checklistText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.footnote,
    color: theme.colors.grey[700],
  },
  checklistSubItems: {
    marginLeft: 24,
  },
});

export default ProgressStep;
