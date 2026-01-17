/**
 * Plan Preview Step - Review your generated plan
 * 
 * Shows generated areas and top actions before final confirmation
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { AreaGrid } from '../../components/AreaChips';
import { ActionChipsList } from '../../components/ActionChipsList';
import { OnboardingHeader } from '../../components/onboarding';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { trackEvent } from '../../lib/mixpanel';

const PlanPreviewStep: React.FC = () => {
  const navigation = useNavigation();
  const { state } = useOnboardingContext();

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'plan_preview'
      });
    }, [])
  );

  const handleContinue = () => {
    navigation.navigate('Final' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Convert areas from context to local UI format, sorted by position
  const areaSuggestions = state.generatedAreas
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(area => ({
      id: area.id,
      title: area.title,
      emoji: area.icon || '🚀',
      imageUrl: area.image_url
    }));

  // Get top 3 actions to showcase
  const topActions = state.generatedActions
    .slice(0, 3)
    .map(action => {
        // Normalize acceptance_criteria: convert string arrays to object arrays
        let normalizedCriteria: { title: string; description: string }[] = []
        if (action.acceptance_criteria) {
          if (Array.isArray(action.acceptance_criteria)) {
            normalizedCriteria = action.acceptance_criteria.map((criterion: any) => {
              if (typeof criterion === 'string') {
                return { title: criterion, description: '' }
              } else if (criterion && typeof criterion === 'object' && 'title' in criterion) {
                return { title: criterion.title || '', description: criterion.description || '' }
              }
              return { title: '', description: '' }
            })
          }
        }

        return {
            id: action.id,
            title: action.title,
            est_minutes: action.est_minutes || 30,
            difficulty: action.difficulty,
            repeat_every_days: action.repeat_every_days ? Math.ceil(7 / action.repeat_every_days) as 1 | 2 | 3 : undefined,
            slice_count_target: action.slice_count_target,
            acceptance_criteria: normalizedCriteria,
            acceptance_intro: (action as any).acceptance_intro,
            acceptance_outro: (action as any).acceptance_outro,
            dream_image: state.dreamImageUrl || undefined,
            hideEditButtons: true
        };
    });

  return (
    <View style={styles.container}>
      <OnboardingHeader onBack={handleBack} />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Dream created! Here's your plan
        </Text>

        <Text style={styles.subtitle}>
          We've organized your goal into {state.generatedAreas.length} focus areas and generated {state.generatedActions.length} initial actions.
        </Text>

        {/* Areas Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Areas</Text>
          <AreaGrid
            areas={areaSuggestions}
            onEdit={() => {}} 
            onRemove={() => {}}
            onAdd={() => {}}
            showAddButton={false}
            showEditButtons={false}
            showRemoveButtons={false}
            title=""
          />
        </View>

        {/* Top Actions Section */}
        {topActions.length > 0 && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Actions</Text>
                <ActionChipsList
                    actions={topActions as any}
                    onEdit={() => {}}
                    onRemove={() => {}}
                    onAdd={() => {}}
                    showAddButton={false}
                />
            </View>
        )}

      </ScrollView>
      
      <View style={styles.footer}>
        <Button 
          title="Continue"
          variant="black"
          onPress={handleContinue}
          style={styles.button}
        />
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
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.grey[600],
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: 12,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: theme.colors.pageBackground,
  },
  button: {
    borderRadius: theme.radius.xl,
  },
});

export default PlanPreviewStep;
