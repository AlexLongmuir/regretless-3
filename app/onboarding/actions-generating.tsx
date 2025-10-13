/**
 * Actions Generating Step - Generate actions for confirmed areas
 * 
 * Shows loading screen while generating actions for all confirmed areas
 * Similar to the create flow's actions generation
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { generateOnboardingActions } from '../../frontend-services/backend-bridge';

const ActionsGeneratingStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setGeneratedActions } = useOnboardingContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we already have generated actions to prevent regeneration
    if (state.generatedActions.length > 0) {
      setIsLoading(false);
      navigation.navigate('ActionsConfirm' as never);
      return;
    }

    const generateActions = async () => {
      try {
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

        console.log('🎯 [ONBOARDING] Starting actions generation with params:', dreamParams);
        
        // Generate actions using the confirmed areas
        const actions = await generateOnboardingActions({
          title: dreamParams.title,
          baseline: dreamParams.baseline,
          obstacles: dreamParams.obstacles,
          enjoyment: dreamParams.enjoyment,
          timeCommitment: dreamParams.timeCommitment,
          areas: state.generatedAreas
        });
        
        if (actions && actions.length > 0) {
          console.log('✅ [ONBOARDING] Generated actions:', actions.length);
          setGeneratedActions(actions);
        }
        
        // Simulate minimum loading time for UX
        setTimeout(() => {
          setIsLoading(false);
          // Navigate to actions confirmation
          navigation.navigate('ActionsConfirm' as never);
        }, 3000);
      } catch (error) {
        console.error('❌ [ONBOARDING] Failed to generate actions:', error);
        // Still navigate after delay even if generation fails
        setTimeout(() => {
          setIsLoading(false);
          navigation.navigate('ActionsConfirm' as never);
        }, 3000);
      }
    };

    // Start generation immediately
    generateActions();
  }, []); // Empty dependency array - only run once on mount


  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ alignItems: 'center' }}>
        {/* Rocket Icon */}
        <Text style={{ fontSize: 80, marginBottom: 24 }}>🚀</Text>
        
        {/* Title */}
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 16,
          lineHeight: 24
        }}>
          Creating Actions
        </Text>
        
        {/* Description */}
        <Text style={{ 
          fontSize: 16, 
          color: '#000', 
          textAlign: 'center',
          paddingHorizontal: 32,
          lineHeight: 22
        }}>
          These are the things you tick off to complete each area and then your overall dream
        </Text>
        
        {/* Loading indicator */}
        <ActivityIndicator 
          size="large" 
          color="#000" 
          style={{ marginTop: 32 }} 
        />
      </View>
    </View>
  );
};

export default ActionsGeneratingStep;
