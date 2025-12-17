/**
 * Progress Step - We're setting everything up for you
 * 
 * Shows progress with sequential category loading and checkmarks
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { OnboardingHeader } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { generateOnboardingAreas } from '../../frontend-services/backend-bridge';
import { trackEvent } from '../../lib/mixpanel';
import Icon from 'react-native-vector-icons/MaterialIcons';

type CategoryStatus = 'pending' | 'loading' | 'completed';

interface Category {
  id: number;
  text: string;
  status: CategoryStatus;
}

const CATEGORIES: Omit<Category, 'status'>[] = [
  { id: 1, text: "Analyzing your dream and creating a personalized plan" },
  { id: 2, text: "Breaking your goal into manageable areas and phases" },
  { id: 3, text: "Generating actionable steps tailored to your schedule" },
  { id: 4, text: "Setting up progress tracking and guidance" },
  { id: 5, text: "Finalizing your custom dream achievement system" },
];

const ProgressStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setGeneratedAreas } = useOnboardingContext();
  const [categories, setCategories] = useState<Category[]>(
    CATEGORIES.map(cat => ({ ...cat, status: 'pending' as CategoryStatus }))
  );
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const startAnimationSequence = () => {
    const startNextCategory = (index: number) => {
      if (index >= CATEGORIES.length) {
        // All categories completed, wait for generation to complete before navigating
        return;
      }

      // Set current category to loading
      setCategories(prev => 
        prev.map((cat, i) => 
          i === index ? { ...cat, status: 'loading' } : cat
        )
      );

      // After 4.5 seconds, mark as completed and move to next (30 seconds total for 5 categories)
      const loadingTimer = setTimeout(() => {
        setCategories(prev => 
          prev.map((cat, i) => 
            i === index ? { ...cat, status: 'completed' } : cat
          )
        );

        // Start next category after a delay
        const nextTimer = setTimeout(() => {
          startNextCategory(index + 1);
        }, 2000);
        timersRef.current.push(nextTimer);
      }, 4500);
      
      timersRef.current.push(loadingTimer);
    };

    // Start with first category after initial delay
    const initialTimer = setTimeout(() => {
      startNextCategory(0);
    }, 500);
    timersRef.current.push(initialTimer);
  };

  const resetAndStartAnimation = () => {
    // Clear any existing timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
    
    // Reset state
    setCategories(CATEGORIES.map(cat => ({ ...cat, status: 'pending' as CategoryStatus })));
    
    // Start animation sequence
    startAnimationSequence();
  };

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'progress'
      });
      
      // Reset and start animation when screen is focused
      resetAndStartAnimation();
      
      return () => {
        // Cleanup timers when screen loses focus
        timersRef.current.forEach(timer => clearTimeout(timer));
        timersRef.current = [];
      };
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
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('🌐 [ONBOARDING] API URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
        }
        
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

  // Auto-navigate when all categories are completed and generation is done
  useEffect(() => {
    const allCompleted = categories.every(cat => cat.status === 'completed');
    if (allCompleted && isGenerationComplete) {
      const timer = setTimeout(() => {
        navigation.navigate('AreasConfirm' as never);
      }, 1000);
      timersRef.current.push(timer);
      return () => clearTimeout(timer);
    }
  }, [categories, isGenerationComplete, navigation]);

  const handleBack = () => {
    // Clear timers when navigating back
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
    navigation.goBack();
  };

  const renderStatusIndicator = (status: CategoryStatus) => {
    switch (status) {
      case 'completed':
        return (
          <View style={styles.checkmarkContainer}>
            <Icon name="check" size={16} color="#FFFFFF" />
          </View>
        );
      case 'loading':
        return (
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="small" color={theme.colors.grey[600]} />
          </View>
        );
      case 'pending':
      default:
        return <View style={styles.pendingContainer} />;
    }
  };

  const getCategoryTextColor = (status: CategoryStatus) => {
    // All text is black regardless of status
    return theme.colors.grey[900]; // Black
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>
          We're setting everything up for you
        </Text>
        
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <View 
              key={category.id} 
              style={[
                styles.categoryCard,
                { opacity: category.status === 'pending' ? 0.5 : 1 }
              ]}
            >
              <Text 
                style={[
                  styles.categoryText,
                  { color: getCategoryTextColor(category.status) }
                ]}
              >
                {category.text}
              </Text>
              {renderStatusIndicator(category.status)}
            </View>
          ))}
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing['2xl'],
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title1,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title1,
    color: theme.colors.grey[900], // Black
    marginBottom: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.sm,
  },
  categoriesContainer: {
    gap: theme.spacing.md,
    paddingHorizontal: 0,
  },
  categoryCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    lineHeight: theme.typography.lineHeight.subheadline,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.grey[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.grey[200],
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
  },
});

export default ProgressStep;
