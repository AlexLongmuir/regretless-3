import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'
import { generateAreas, generateActions, generateDreamImage } from '../../frontend-services/backend-bridge'
import { Image as ExpoImage } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { supabaseClient } from '../../lib/supabaseClient'
import { trackEvent } from '../../lib/mixpanel'

export default function ConfirmStep() {
  const { theme: themeFromContext, isDark } = useTheme()
  const styles = useMemo(() => createStyles(themeFromContext, isDark), [themeFromContext, isDark])
  const navigation = useNavigation<any>()
  const { reset, dreamId, title, start_date, end_date, baseline, obstacles, enjoyment, timeCommitment, figurineUrl, image_url, setField, setAreas, setActions, areas, actions, areasAnalyzed, setAreasAnalyzed } = useCreateDream()
  
  const [status, setStatus] = useState<'idle' | 'generating_dream_image' | 'generating_areas' | 'generating_actions' | 'complete' | 'error'>('idle')
  const [statusText, setStatusText] = useState('Ready to create your plan')

  useEffect(() => {
    trackEvent('create_dream_flow_completed')
  }, [])

  const generatePlan = async () => {
    if (!dreamId || !title) {
      Alert.alert('Error', 'Missing dream information')
      return
    }

    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      // Load figurine URL from profile if not in context
      let effectiveFigurineUrl = figurineUrl;
      if (!effectiveFigurineUrl) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('figurine_url')
            .eq('user_id', user.id)
            .single();
          if (profile?.figurine_url) {
            effectiveFigurineUrl = profile.figurine_url;
            console.log('📸 [DREAM-CONFIRM] Loaded figurine URL from profile');
          }
        }
      }

      // Generate dream image first if we have a figurine and don't already have an image
      if (effectiveFigurineUrl && !image_url) {
        setStatus('generating_dream_image')
        setStatusText('Generating your personalized dream image...')
        
        try {
          const dreamContext = [
            baseline ? `Current baseline: ${baseline}` : '',
            obstacles ? `Obstacles: ${obstacles}` : '',
            enjoyment ? `Enjoyment: ${enjoyment}` : ''
          ].filter(Boolean).join('. ');
          
          const dreamImageResponse = await generateDreamImage(
            effectiveFigurineUrl,
            title || 'My Dream',
            dreamContext,
            dreamId,
            session.access_token
          );
          
          if (dreamImageResponse.success && dreamImageResponse.data?.signed_url) {
            setField('image_url', dreamImageResponse.data.signed_url);
            console.log('✅ [DREAM-CONFIRM] Dream image generated successfully');
          }
        } catch (error) {
          console.error('❌ [DREAM-CONFIRM] Failed to generate dream image:', error);
          // Don't fail the whole process if image generation fails
        }
      }

      setStatus('generating_areas')
      setStatusText('Analyzing your dream and creating focus areas...')

      // Generate Areas (this will also generate images if figurine URL is available)
      setStatusText('Creating your focus areas and generating images...')
      const generatedAreas = await generateAreas({
        dream_id: dreamId,
        title,
        start_date: start_date || undefined,
        end_date: end_date || undefined,
        baseline: baseline || undefined,
        obstacles: obstacles || undefined,
        enjoyment: enjoyment || undefined,
        figurine_url: effectiveFigurineUrl || undefined
      }, session.access_token)

      if (!generatedAreas || generatedAreas.length === 0) {
        throw new Error('No areas generated')
      }

      // Log image generation status
      const areasWithImages = generatedAreas.filter(a => a.image_url).length
      if (effectiveFigurineUrl) {
        console.log(`✅ Generated ${generatedAreas.length} areas (${areasWithImages} with images)`)
        if (areasWithImages < generatedAreas.length) {
          console.warn(`⚠️ Some areas are missing images: ${generatedAreas.length - areasWithImages} areas without images`)
        }
      }

      setAreas(generatedAreas)
      setAreasAnalyzed(true)
      trackEvent('create_dream_areas_generated', { count: generatedAreas.length })

      setStatus('generating_actions')
      setStatusText('Creating actionable steps tailored to your schedule...')

      // Generate Actions sequentially per area to prevent truncation
      const allActions: any[] = []
      const seenActionIds = new Set<string>() // Track seen action IDs to prevent duplicates
      let totalActionsGenerated = 0
      
      for (let i = 0; i < generatedAreas.length; i++) {
        const area = generatedAreas[i]
        try {
          setStatusText(`Creating actions for ${area.title}...`)
          
          const areaActions = await generateActions({
            dream_id: dreamId,
            title,
            start_date: start_date || undefined,
            end_date: end_date || undefined,
            baseline: baseline || undefined,
            obstacles: obstacles || undefined,
            enjoyment: enjoyment || undefined,
            timeCommitment: timeCommitment || undefined,
            areas: [area] // Single area for sequential generation
          }, session.access_token)

          if (areaActions && areaActions.length > 0) {
            // Filter out duplicate actions (backend may return all actions for the dream)
            const newActions = areaActions.filter((action: any) => {
              if (seenActionIds.has(action.id)) {
                console.warn(`⚠️ Duplicate action detected: ${action.id} (${action.title}), skipping`);
                return false;
              }
              seenActionIds.add(action.id);
              return true;
            });
            
            allActions.push(...newActions)
            totalActionsGenerated += newActions.length
            console.log(`✅ Generated ${newActions.length} new actions for area ${area.title} (${areaActions.length - newActions.length} duplicates filtered)`)
            
            // Update actions incrementally so UI can show progress
            setActions([...allActions])
          } else {
            console.warn(`No actions generated for area: ${area.title}`)
          }
        } catch (error) {
          console.error(`Failed to generate actions for area ${area.title}:`, error)
          // Continue to next area even if one fails
        }
      }

      if (allActions.length === 0) {
        console.warn('No actions generated for any area')
      } else {
        trackEvent('create_dream_actions_generated', { 
          count: allActions.length,
          area_count: generatedAreas.length
        })
      }

      setActions(allActions)
      
      setStatus('complete')
      setStatusText('Plan created successfully!')
      
      // Navigate to plan preview
      setTimeout(() => {
        navigation.navigate('PlanPreview')
      }, 1000)

    } catch (error) {
      console.error('Generation failed:', error)
      setStatus('error')
      setStatusText('Something went wrong. Please try again.')
      Alert.alert('Generation Error', 'Failed to generate your plan. Please check your connection and try again.')
    }
  }

  // Auto-start generation on mount if not already done
  useFocusEffect(
    React.useCallback(() => {
      if (status === 'idle' && dreamId && title) {
        // Check if we already have both areas and actions
        if (areas.length > 0 && actions.length > 0) {
          console.log('Data already exists, navigating to preview')
          navigation.navigate('PlanPreview')
        } else {
          generatePlan()
        }
      }
    }, [dreamId, title, status, areas.length, actions.length])
  )

  const handleRetry = () => {
    setStatus('idle')
    generatePlan()
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CreateScreenHeader step="confirm" onReset={reset} />
        
        <View style={styles.content}>
          {/* Show dream image if available */}
          {image_url && (
            <ExpoImage 
              source={{ uri: image_url }}
              style={styles.dreamImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          )}
          
          <Text style={styles.title}>Time to generate your custom plan!</Text>
          
          <View style={styles.statusContainer}>
              {(status === 'generating_dream_image' || status === 'generating_areas' || status === 'generating_actions') && (
                  <ActivityIndicator size="large" color={isDark ? themeFromContext.colors.text.primary : themeFromContext.colors.text.inverse} style={{ marginBottom: 16 }} />
              )}
              <Text style={styles.statusText}>{statusText}</Text>
          </View>
          
        </View>

        <View style={styles.buttonContainer}>
          {status === 'error' && (
              <Button
                  title="Retry"
                  onPress={handleRetry}
                  variant="inverse"
                  style={styles.button}
              />
          )}
        </View>
      </SafeAreaView>
    </View>
  )
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dreamImage: {
    width: 260,
    height: 260,
    marginBottom: theme.spacing.lg,
    borderRadius: 12,
    backgroundColor: theme.colors.background.card,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? theme.colors.text.primary : theme.colors.text.inverse,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusContainer: {
      alignItems: 'center',
      marginTop: 20,
      height: 100, 
  },
  statusText: {
      fontSize: 16,
      color: isDark ? theme.colors.text.secondary : theme.colors.text.inverse,
      opacity: isDark ? 1 : 0.85,
      textAlign: 'center',
      paddingHorizontal: 20,
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
})
