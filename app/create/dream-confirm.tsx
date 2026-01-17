import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'
import { generateAreas, generateActions } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { trackEvent } from '../../lib/mixpanel'

export default function ConfirmStep() {
  const { theme: themeFromContext } = useTheme()
  const styles = useMemo(() => createStyles(themeFromContext), [themeFromContext])
  const navigation = useNavigation<any>()
  const { reset, dreamId, title, start_date, end_date, baseline, obstacles, enjoyment, timeCommitment, figurineUrl, setAreas, setActions, areas, actions, areasAnalyzed, setAreasAnalyzed } = useCreateDream()
  
  const [status, setStatus] = useState<'idle' | 'generating_areas' | 'generating_actions' | 'complete' | 'error'>('idle')
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
      setStatus('generating_areas')
      setStatusText('Analyzing your dream and creating focus areas...')

      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      // Generate Areas
      const generatedAreas = await generateAreas({
        dream_id: dreamId,
        title,
        start_date: start_date || undefined,
        end_date: end_date || undefined,
        baseline: baseline || undefined,
        obstacles: obstacles || undefined,
        enjoyment: enjoyment || undefined,
        figurine_url: figurineUrl || undefined
      }, session.access_token)

      if (!generatedAreas || generatedAreas.length === 0) {
        throw new Error('No areas generated')
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
      <CreateScreenHeader step="confirm" onReset={reset} />
      
      <View style={styles.content}>
        <Image 
          source={require('../../assets/images/onboarding/20250916_0842_Swirling Abstract Energy_simple_compose_01k58qjb1ae89sraq48r9636ze.png')}
          style={styles.onboardingImage}
          contentFit="contain"
        />
        
        <Text style={styles.title}>Time to generate your custom plan!</Text>
        
        <View style={styles.statusContainer}>
            {(status === 'generating_areas' || status === 'generating_actions') && (
                <ActivityIndicator size="large" color={themeFromContext.colors.text.primary} style={{ marginBottom: 16 }} />
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
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
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
    color: theme.colors.text.primary,
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
      color: theme.colors.text.secondary,
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
})
