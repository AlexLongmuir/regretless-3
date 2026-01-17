/**
 * Generating Step - Time to generate your custom plan!
 * 
 * Shows generating animation with placeholder graphics and handles
 * the full generation pipeline (areas + actions)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { generateOnboardingAreas, generateOnboardingActions } from '../../frontend-services/backend-bridge';
import { trackEvent } from '../../lib/mixpanel';

const GeneratingStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setGeneratedAreas, setGeneratedActions } = useOnboardingContext();
  const [status, setStatus] = useState<'idle' | 'generating_areas' | 'generating_actions' | 'complete' | 'error'>('idle');
  const [statusText, setStatusText] = useState('Ready to create your plan');

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'generating'
      });
    }, [])
  );

  const generatePlan = async () => {
    try {
        setStatus('generating_areas');
        setStatusText('Analyzing your dream and creating focus areas...');

        // 1. Prepare params
        const dreamParams = {
            title: state.answers[2] || 'Your Dream',
            baseline: state.answers[4] || undefined,
            obstacles: state.answers[10] || undefined,
            enjoyment: state.answers[11] || undefined,
            timeCommitment: { hours: 0, minutes: 30 }
        };

        // Parse time commitment from question 3 (format: "Xh Ym")
        const timeAnswer = state.answers[3];
        if (timeAnswer) {
            const match = timeAnswer.match(/(\d+)h\s*(\d+)m/);
            if (match) {
                dreamParams.timeCommitment = {
                    hours: parseInt(match[1]),
                    minutes: parseInt(match[2])
                };
            }
        }

        console.log('🎯 [ONBOARDING] Starting generation with params:', dreamParams);

        // 2. Generate Areas
        const areas = await generateOnboardingAreas({
            title: dreamParams.title,
            baseline: dreamParams.baseline,
            obstacles: dreamParams.obstacles,
            enjoyment: dreamParams.enjoyment,
            figurine_url: state.figurineUrl || undefined
        });

        if (!areas || areas.length === 0) {
            throw new Error('No areas generated');
        }

        setGeneratedAreas(areas);
        console.log('✅ [ONBOARDING] Generated areas:', areas.length);

        setStatus('generating_actions');
        setStatusText('Creating actionable steps tailored to your schedule...');

        // 3. Generate Actions
        const actions = await generateOnboardingActions({
            title: dreamParams.title,
            baseline: dreamParams.baseline,
            obstacles: dreamParams.obstacles,
            enjoyment: dreamParams.enjoyment,
            timeCommitment: dreamParams.timeCommitment,
            areas: areas
        });

        if (!actions || actions.length === 0) {
             // It's possible to have 0 actions if something went wrong but we have areas
             console.warn('⚠️ [ONBOARDING] No actions generated');
        } else {
            console.log('✅ [ONBOARDING] Generated actions:', actions.length);
        }

        setGeneratedActions(actions);
        
        setStatus('complete');
        setStatusText('Plan created successfully!');
        
        // Short delay before navigation
        setTimeout(() => {
            navigation.navigate('PlanPreview' as never);
        }, 1000);

    } catch (error) {
        console.error('❌ [ONBOARDING] Generation failed:', error);
        setStatus('error');
        setStatusText('Something went wrong. Please try again.');
        Alert.alert('Generation Error', 'Failed to generate your plan. Please check your connection and try again.');
    }
  };

  // Auto-start generation on mount if not already done
  useEffect(() => {
      if (status === 'idle') {
          // If we already have data, skip generation? 
          // The user might want to regenerate if they came back.
          // But usually this screen is hit once. 
          // Let's check if we have BOTH areas and actions to potentially skip
          if (state.generatedAreas.length > 0 && state.generatedActions.length > 0) {
              console.log('⚡ [ONBOARDING] Data already exists, skipping generation');
              navigation.navigate('PlanPreview' as never);
          } else {
              generatePlan();
          }
      }
  }, []);

  const handleRetry = () => {
      generatePlan();
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <View style={styles.content}>
        <Image 
          source={require('../../assets/images/onboarding/20250916_0842_Swirling Abstract Energy_simple_compose_01k58qjb1ae89sraq48r9636ze.png')}
          style={styles.onboardingImage}
          contentFit="contain"
        />
        
        <Text style={styles.title}>Time to generate your custom plan!</Text>
        
        <View style={styles.statusContainer}>
            {(status === 'generating_areas' || status === 'generating_actions') && (
                <ActivityIndicator size="large" color={theme.colors.text.primary} style={{ marginBottom: 16 }} />
            )}
            <Text style={styles.statusText}>{statusText}</Text>
        </View>
        
      </View>

      <View style={styles.buttonContainer}>
        {status === 'error' && (
            <Button
                title="Retry"
                onPress={handleRetry}
                variant="black"
                style={styles.button}
            />
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingImage: {
    width: 260,
    height: 260,
    marginBottom: theme.spacing.lg,
    borderRadius: 10,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  statusContainer: {
      alignItems: 'center',
      marginTop: 20,
      height: 100, 
  },
  statusText: {
      fontSize: 16,
      color: theme.colors.grey[600],
      textAlign: 'center',
      paddingHorizontal: 20,
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});

export default GeneratingStep;
