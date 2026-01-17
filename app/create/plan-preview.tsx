/**
 * Plan Preview Step - Review your generated plan
 * 
 * Shows generated areas and top actions before final confirmation
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { AreaGrid } from '../../components/AreaChips';
import { ActionChipsList } from '../../components/ActionChipsList';
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader';
import { useCreateDream } from '../../contexts/CreateDreamContext';
import { upsertAreas, upsertActions } from '../../frontend-services/backend-bridge';
import { supabaseClient } from '../../lib/supabaseClient';
import { trackEvent } from '../../lib/mixpanel';

export default function PlanPreviewStep() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<any>();
  const { reset, areas, actions, image_url, dreamId } = useCreateDream();
  const [isSaving, setIsSaving] = useState(false);

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('create_dream_plan_preview_viewed');
    }, [])
  );

  const handleContinue = async () => {
    if (!dreamId) {
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Save areas and actions to database before scheduling
      const areasToSend = areas.map((area, index) => {
        const { id, ...areaWithoutId } = area;
        const areaToSend = area.id?.startsWith('temp_') ? areaWithoutId : area;
        return {
          ...areaToSend,
          position: areaToSend.position ?? index
        };
      });

      await upsertAreas({
        dream_id: dreamId,
        areas: areasToSend
      }, session.access_token);

      const actionsToSend = actions.map((action, index) => {
        const { id, ...actionWithoutId } = action;
        const actionToSend = action.id?.startsWith('temp_') ? actionWithoutId : action;
        return {
          ...actionToSend,
          position: actionToSend.position ?? (index + 1)
        };
      });

      await upsertActions({
        dream_id: dreamId,
        actions: actionsToSend
      }, session.access_token);

      trackEvent('create_dream_plan_saved', {
        areas_count: areas.length,
        actions_count: actions.length
      });

      navigation.navigate('ActionsConfirm');
    } catch (error) {
      console.error('Failed to save plan:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Convert areas from context to local UI format, sorted by position
  const areaSuggestions = areas
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(area => ({
      id: area.id,
      title: area.title,
      emoji: area.icon || '🚀',
      imageUrl: area.image_url
    }));

  // Get top 3 actions to showcase
  const topActions = actions
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
            dream_image: image_url || undefined,
            hideEditButtons: true
        };
    });

  return (
    <View style={styles.container}>
      <CreateScreenHeader step="plan-preview" onReset={reset} />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Dream created! Here's your plan
        </Text>

        <Text style={styles.subtitle}>
          We've organized your goal into {areas.length} focus areas and generated {actions.length} initial actions.
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
          loading={isSaving}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
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
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: theme.colors.background.page,
  },
  button: {
    borderRadius: theme.radius.xl,
  },
});
