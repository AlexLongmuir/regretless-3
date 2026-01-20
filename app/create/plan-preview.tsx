/**
 * Plan Preview Step - Review your generated plan
 * 
 * Shows generated areas and top actions before final confirmation
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { AreaGrid } from '../../components/AreaChips';
import { ActionChipsList } from '../../components/ActionChipsList';
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader';
import { useCreateDream } from '../../contexts/CreateDreamContext';
import { upsertAreas, upsertActions, generateAreaImage } from '../../frontend-services/backend-bridge';
import { supabaseClient } from '../../lib/supabaseClient';
import { trackEvent } from '../../lib/mixpanel';
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation';

export default function PlanPreviewStep() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const navigation = useNavigation<any>();
  const { reset, areas, actions, image_url, dreamId, title, setAreas, updateArea } = useCreateDream();
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

      const areasResponse = await upsertAreas({
        dream_id: dreamId,
        areas: areasToSend
      }, session.access_token);

      // Update context with saved areas (with real IDs from database)
      setAreas(areasResponse.areas);

      // Generate area images in background (fire-and-forget) if dream image is available
      // Update context when each image is generated
      console.log('🎨 [PLAN-PREVIEW] Checking area image generation:', { 
        hasDreamImageUrl: !!image_url, 
        areasCount: areasResponse.areas.length
      });
      
      if (image_url && areasResponse.areas.length > 0) {
        console.log('🎨 [PLAN-PREVIEW] Starting area image generation for', areasResponse.areas.length, 'areas');
        areasResponse.areas.forEach((area) => {
          if (!area.image_url) {
            console.log(`🎨 [PLAN-PREVIEW] Generating image for area: ${area.title} (${area.id})`);
            generateAreaImage(
              image_url,
              area.title,
              area.id,
              session.access_token
            ).then((response) => {
              console.log(`✅ [PLAN-PREVIEW] Image generated for area ${area.title}:`, response);
              // Update context with generated image URL
              if (response.success && response.data?.signed_url) {
                updateArea(area.id, { image_url: response.data.signed_url });
                console.log(`✅ [PLAN-PREVIEW] Updated area ${area.title} with image URL`);
              }
            }).catch((error) => {
              console.error(`❌ [PLAN-PREVIEW] Failed to generate image for area ${area.title}:`, error);
              // Silently fail - don't block user flow
            });
          } else {
            console.log(`⏭️ [PLAN-PREVIEW] Area ${area.title} already has image, skipping`);
          }
        });
      } else {
        console.log('⚠️ [PLAN-PREVIEW] Skipping area image generation:', { 
          hasDreamImageUrl: !!image_url, 
          areasCount: areasResponse.areas.length 
        });
      }

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
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CreateScreenHeader step="plan-preview" onReset={reset} />
        
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Dream Image */}
          {image_url && (
            <View style={styles.dreamImageContainer}>
              <Image
                source={{ uri: image_url }}
                style={styles.dreamImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </View>
          )}

          <Text style={styles.title}>
            Dream created! Here's your plan
          </Text>

          <Text style={styles.subtitle}>
            {areas.length > 0 
              ? `We've organized your goal into ${areas.length} focus area${areas.length > 1 ? 's' : ''}${actions.length > 0 ? ` and generated ${actions.length} initial action${actions.length > 1 ? 's' : ''}` : ''}.`
              : 'Generating your plan...'
            }
          </Text>

          {/* Areas Section */}
          {areas.length > 0 ? (
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
          ) : (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="large" color={isDark ? theme.colors.text.primary : theme.colors.text.inverse} />
              <Text style={styles.loadingText}>Generating focus areas...</Text>
            </View>
          )}

          {/* Top Actions Section */}
          {topActions.length > 0 ? (
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
          ) : areas.length > 0 && (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="large" color={isDark ? theme.colors.text.primary : theme.colors.text.inverse} />
              <Text style={styles.loadingText}>Generating actions...</Text>
            </View>
          )}

        </ScrollView>
        
        <View style={styles.footer}>
          <Button 
            title="Continue"
            variant="inverse"
            onPress={handleContinue}
            loading={isSaving}
            disabled={areas.length === 0}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: 100,
  },
  dreamImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.card,
    marginBottom: theme.spacing.lg,
  },
  dreamImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? theme.colors.text.primary : theme.colors.text.inverse,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: isDark ? theme.colors.text.secondary : theme.colors.text.inverse,
    opacity: isDark ? 1 : 0.85,
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? theme.colors.text.primary : theme.colors.text.inverse,
    marginBottom: 12,
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: isDark ? theme.colors.text.secondary : theme.colors.text.inverse,
    opacity: isDark ? 1 : 0.85,
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  button: {
    borderRadius: theme.radius.xl,
    width: '100%',
  },
});
