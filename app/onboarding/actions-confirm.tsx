/**
 * Actions Confirmation Step - Review and provide feedback on generated actions
 * 
 * Shows actions for one area at a time and allows users to provide feedback for regeneration
 * Matches the functionality of the create flow actions.tsx
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button, ActionChipsList, IconButton } from '../../components';
import { OnboardingHeader } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { generateOnboardingActions } from '../../frontend-services/backend-bridge';
import type { Area, Action } from '../../backend/database/types';
import { trackEvent } from '../../lib/mixpanel';

interface ActionCard {
  id: string
  title: string
  est_minutes?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  repeat_every_days?: 1 | 2 | 3
  acceptance_criteria?: { title: string; description: string }[]
  acceptance_intro?: string
  acceptance_outro?: string
  dream_image?: string
  occurrence_no?: number
}

const ActionsConfirmStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, setGeneratedActions } = useOnboardingContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0);
  
  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'actions_confirm'
      });
    }, [])
  );
  
  // Check if areas have changed and regenerate actions if needed
  useFocusEffect(
    React.useCallback(() => {
      // Check if existing actions reference area IDs that no longer exist
      const currentAreaIds = new Set(state.generatedAreas.map(a => a.id))
      const actionsWithInvalidAreas = state.generatedActions.some(action => !currentAreaIds.has(action.area_id))
      
      // If we have actions but they reference invalid areas, navigate back to regenerate
      if (state.generatedActions.length > 0 && actionsWithInvalidAreas) {
        console.log('🎯 [ONBOARDING] Areas changed - navigating to regenerate actions')
        setGeneratedActions([])
        navigation.navigate('ActionsGenerating' as never)
      }
    }, [state.generatedAreas, state.generatedActions, setGeneratedActions, navigation])
  );
  
  // Get current area and its actions
  const currentArea = state.generatedAreas[currentAreaIndex];
  const currentAreaActions = state.generatedActions.filter(action => action.area_id === currentArea?.id);
  
  // Convert current area actions to local UI format, sorted by position
  const actionCards: ActionCard[] = currentAreaActions
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(action => {
      // Normalize acceptance_criteria: convert string arrays to object arrays
      let normalizedCriteria: { title: string; description: string }[] = []
      if (action.acceptance_criteria) {
        if (Array.isArray(action.acceptance_criteria)) {
          normalizedCriteria = action.acceptance_criteria.map((criterion: any) => {
            if (typeof criterion === 'string') {
              // Convert string to object with title and empty description
              return { title: criterion, description: '' }
            } else if (criterion && typeof criterion === 'object' && 'title' in criterion) {
              // Already in object format
              return { title: criterion.title || '', description: criterion.description || '' }
            }
            return { title: '', description: '' }
          })
        }
      }
      
      return {
        id: action.id,
        title: action.title,
        est_minutes: action.est_minutes || 0,
        difficulty: action.difficulty,
        repeat_every_days: action.repeat_every_days ? Math.ceil(7 / action.repeat_every_days) as 1 | 2 | 3 : undefined,
        slice_count_target: action.slice_count_target,
        acceptance_criteria: normalizedCriteria,
        acceptance_intro: (action as any).acceptance_intro,
        acceptance_outro: (action as any).acceptance_outro,
        dream_image: state.dreamImageUrl || undefined, // Use dream image from onboarding context
        // Don't set occurrence_no for original actions - this makes them show as "4 repeats" instead of "1 of 4"
        hideEditButtons: true // Hide edit buttons in onboarding
      };
    });

  // Actions should already be generated when we reach this screen

  // Navigation functions
  const goToNextArea = () => {
    if (currentAreaIndex < state.generatedAreas.length - 1) {
      setCurrentAreaIndex(currentAreaIndex + 1);
    } else {
      // All areas completed, navigate to final
      navigation.navigate('Final' as never);
    }
  };

  const isLastArea = currentAreaIndex === state.generatedAreas.length - 1;
  const isFirstArea = currentAreaIndex === 0;

  const handleBack = () => {
    if (isFirstArea) {
      // If we're on the first area, go back to areas confirm step (skip the loading screen)
      navigation.navigate('AreasConfirm' as never);
    } else {
      // Go to previous area
      setCurrentAreaIndex(currentAreaIndex - 1);
    }
  };

  const handleReorderActions = (reorderedActions: any[]) => {
    // Update positions based on new order (starting from 1)
    const updatedActions = reorderedActions.map((action, index) => {
      const originalAction = currentAreaActions.find(a => a.id === action.id);
      if (originalAction) {
        return { ...originalAction, position: index + 1 }; // Start positions from 1
      }
      return originalAction;
    }).filter(Boolean) as Action[];
    
    // Update all actions, replacing the current area actions with reordered ones
    const otherActions = state.generatedActions.filter(action => action.area_id !== currentArea?.id);
    setGeneratedActions([...otherActions, ...updatedActions]);
  };

  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      return;
    }
    
    setIsLoading(true);
    
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

      // Filter to only include the current area for feedback-based regeneration
      const areasToRegenerate = state.generatedAreas.filter((area, index) => 
        index === currentAreaIndex
      );
      
      // Get actions from all other areas to preserve them
      const areasToPreserve = state.generatedAreas.filter((area, index) => 
        index !== currentAreaIndex
      );
      const preservedAreaIds = areasToPreserve.map(area => area.id);
      
      const preservedActions = state.generatedActions.filter(action => 
        preservedAreaIds.includes(action.area_id)
      );

      const generatedActions = await generateOnboardingActions({
        title: dreamParams.title,
        baseline: dreamParams.baseline,
        obstacles: dreamParams.obstacles,
        enjoyment: dreamParams.enjoyment,
        timeCommitment: dreamParams.timeCommitment,
        areas: state.generatedAreas,
        feedback: feedback.trim(),
        original_actions: state.generatedActions.filter(action => 
          areasToRegenerate.some(area => area.id === action.area_id)
        )
      });
      
      if (generatedActions && generatedActions.length > 0) {
        // Combine preserved actions from other areas with newly generated actions
        const combinedActions = [...preservedActions, ...generatedActions];
        setGeneratedActions(combinedActions);
        setFeedback('');
      }
      
      // Simulate minimum loading time for UX
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to regenerate actions:', error);
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleApproveArea = async () => {
    setIsContinuing(true);
    // Small delay to show loading feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const isLast = currentAreaIndex === state.generatedAreas.length - 1;
    // Navigate to next area or completion
    goToNextArea();
    
    // Reset loading state if we're staying on this screen (not last area)
    if (!isLast) {
      // Use setTimeout to ensure state update happens after navigation state change
      setTimeout(() => setIsContinuing(false), 100);
    }
  };

  if (isLoading) {
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
  }

  // Show completion if no areas
  if (!currentArea) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: '#000', marginBottom: 16 }}>No areas found</Text>
        <Button 
          title="Go Back" 
          variant="secondary"
          onPress={() => navigation.goBack()} 
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <OnboardingHeader onBack={handleBack} />
      
      {/* Area Navigation Header */}
      <View style={{ 
        paddingHorizontal: 16, 
        paddingVertical: 12
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>{currentArea.icon || '🚀'}</Text>
            <View>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000' }}>
                {currentArea.title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.muted }}>
                Area {currentAreaIndex + 1} of {state.generatedAreas.length}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Actions Section */}
        <View style={{ marginBottom: 32 }}>
          
          <Text style={{ 
            fontSize: 12, 
            fontWeight: 'bold',
            color: '#000', 
            marginBottom: 16,
            lineHeight: 16
          }}>
            These are the actions for the {currentArea.title.toLowerCase()} area and the acceptance criteria for each action
          </Text>

          {/* Action Cards */}
          <ActionChipsList
            actions={actionCards as any}
            onEdit={() => {}} // No-op for onboarding
            onRemove={() => {}} // No-op for onboarding
            onAdd={() => {}} // No-op for onboarding
            onReorder={handleReorderActions}
            showAddButton={false}
          />
        </View>
      </ScrollView>
      
      {/* Footer section */}
      <View style={{ 
        paddingHorizontal: 16,
        paddingBottom: 32,
        backgroundColor: theme.colors.pageBackground
      }}>
        {/* Instructional Text */}
        <Text style={{ 
          fontSize: 14, 
          color: '#000', 
          marginBottom: 12,
          lineHeight: 20
        }}>
          If you want to change these, provide feedback to our AI below.
        </Text>

        {/* Feedback Input */}
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Provide detailed feedback here for AI to adjust your actions accordingly.."
          multiline
          style={{ 
            minHeight: 60,
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            fontSize: 16,
            textAlignVertical: 'top'
          }}
        />
        
        {/* Navigation Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* AI Refine Button */}
          <Button 
            title="Refine with AI" 
            variant="secondary"
            onPress={() => {
              Keyboard.dismiss(); // Close keyboard when AI refine is triggered
              handleRegenerate();
            }}
            style={{ flex: 1, borderRadius: theme.radius.xl }}
            disabled={!feedback.trim()}
          />
          
          {/* Approve Area Button */}
          <Button 
            title={isLastArea ? "Complete" : "Next Area"}
            variant="black"
            loading={isContinuing}
            onPress={() => {
              Keyboard.dismiss(); // Close keyboard when continuing
              handleApproveArea();
            }}
            style={{ flex: 1, borderRadius: theme.radius.xl }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ActionsConfirmStep;
