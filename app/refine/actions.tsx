import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard, StyleSheet } from 'react-native'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { Button, ActionChipsList, IconButton } from '../../components'
import { generateActions, upsertActions } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'
import { useData } from '../../contexts/DataContext'
import { trackEvent } from '../../lib/mixpanel'
import type { Action, Area } from '../../backend/database/types'

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
  hideEditButtons?: boolean
}

export default function RefineActionsStep() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { dreamId } = (route.params as { dreamId?: string }) || {}
  const { state, getDreamDetail } = useData()
  
  if (!dreamId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: theme.colors.text.primary, marginBottom: 16 }}>No dream ID provided</Text>
        <Button 
          title="Go Back" 
          variant="secondary"
          onPress={() => navigation.goBack()} 
        />
      </View>
    )
  }
  
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0)
  const [localActions, setLocalActions] = useState<Action[]>([])

  // Get dream data
  const dreamDetail = dreamId ? state.dreamDetail[dreamId] : undefined
  const dream = dreamDetail?.dream
  const areas = dreamDetail?.areas || []
  const existingActions = dreamDetail?.actions || []

  // Load dream detail on mount
  useEffect(() => {
    if (dreamId) {
      getDreamDetail(dreamId, { force: true })
    }
  }, [dreamId, getDreamDetail])

  // Sync local actions with existing actions
  useEffect(() => {
    if (existingActions.length > 0 && localActions.length === 0) {
      setLocalActions(existingActions)
    }
  }, [existingActions])

  // Get current area and its actions
  const currentArea = areas[currentAreaIndex]
  const currentAreaActions = localActions.filter(action => action.area_id === currentArea?.id)

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
        est_minutes: action.est_minutes || 0,
        difficulty: action.difficulty,
        repeat_every_days: action.repeat_every_days ? Math.ceil(7 / action.repeat_every_days) as 1 | 2 | 3 : undefined,
        slice_count_target: action.slice_count_target,
        acceptance_criteria: normalizedCriteria,
        acceptance_intro: (action as any).acceptance_intro,
        acceptance_outro: (action as any).acceptance_outro,
        dream_image: dream?.image_url || undefined,
        hideEditButtons: true
      }
    })

  // Navigation functions
  const goToNextArea = () => {
    if (currentAreaIndex < areas.length - 1) {
      setCurrentAreaIndex(currentAreaIndex + 1)
      setFeedback('') // Clear feedback when moving to next area
    } else {
      // All areas completed, navigate to confirmation
      navigation.navigate('ActionsConfirm', { dreamId })
    }
  }

  const isLastArea = currentAreaIndex === areas.length - 1
  const isFirstArea = currentAreaIndex === 0

  const handleBack = () => {
    if (isFirstArea) {
      navigation.goBack()
    } else {
      setCurrentAreaIndex(currentAreaIndex - 1)
      setFeedback('') // Clear feedback when going back
    }
  }

  const handleActionPress = (actionId: string) => {
    const action = currentAreaActions.find(a => a.id === actionId)
    if (action && currentArea && dream) {
      navigation.navigate('ActionOccurrence', {
        actionTitle: action.title,
        dreamTitle: dream.title,
        areaName: currentArea.title,
        areaEmoji: currentArea.icon,
        estimatedTime: action.est_minutes,
        difficulty: action.difficulty,
        dreamImage: dream.image_url || undefined,
        acceptanceCriteria: action.acceptance_criteria || [],
        sliceCountTarget: action.slice_count_target,
        acceptanceIntro: (action as any).acceptance_intro,
        acceptanceOutro: (action as any).acceptance_outro,
      })
    }
  }

  const handleApproveArea = async () => {
    if (!dreamId || !currentArea) return

    trackEvent('refine_dream_area_approved', { 
      area_index: currentAreaIndex, 
      action_count: currentAreaActions.length 
    })

    // Save current area actions to backend
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      // Get all actions for all areas (preserve other areas' actions)
      const allActions = localActions.map((action, index) => ({
        ...action,
        position: action.position ?? (index + 1)
      }))
      
      await upsertActions({
        dream_id: dreamId,
        actions: allActions
      }, session.access_token)

      // Refresh dream detail
      await getDreamDetail(dreamId, { force: true })

      // Navigate to next area or completion
      goToNextArea()
    } catch (error) {
      console.error('Failed to save actions:', error)
    }
  }

  const handleRefine = async () => {
    if (!dreamId || !dream || !currentArea || !feedback.trim()) return
    
    trackEvent('refine_dream_actions_refine', { 
      area_index: currentAreaIndex,
      feedback_length: feedback.length 
    })

    Keyboard.dismiss()
    setIsLoading(true)
    
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      // Filter to only include the current area for feedback-based regeneration
      const areasToRegenerate = [currentArea]
      
      // Get actions from all other areas to preserve them
      const preservedAreaIds = areas
        .filter((area, index) => index !== currentAreaIndex)
        .map(area => area.id)
      
      const preservedActions = localActions.filter(action => 
        preservedAreaIds.includes(action.area_id)
      )
      
      // Call the generateActions API to regenerate actions for current area only
      const generatedActions = await generateActions({ 
        dream_id: dreamId,
        title: dream.title,
        start_date: dream.start_date || undefined,
        end_date: dream.end_date || undefined,
        baseline: dream.baseline || undefined,
        obstacles: dream.obstacles || undefined,
        enjoyment: dream.enjoyment || undefined,
        timeCommitment: typeof dream.time_commitment === 'object' ? dream.time_commitment : undefined,
        areas: areasToRegenerate,
        feedback: feedback.trim() || undefined,
        original_actions: currentAreaActions
      }, session.access_token)
      
      if (generatedActions && generatedActions.length > 0) {
        // Combine preserved actions from other areas with newly generated actions
        const combinedActions = [...preservedActions, ...generatedActions]
        setLocalActions(combinedActions)
        setFeedback('')
      }
      
      setTimeout(() => setIsLoading(false), 2000)
    } catch (error) {
      console.error('Failed to regenerate actions with AI:', error)
      setTimeout(() => setIsLoading(false), 1000)
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background.page, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 80, marginBottom: 24 }}>🚀</Text>
          <Text style={styles.loadingTitle}>
            Refining Actions
          </Text>
          <Text style={styles.loadingDescription}>
            These are the things you tick off to complete each area and then your overall dream
          </Text>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary[600]} 
            style={{ marginTop: 32 }} 
          />
        </View>
      </View>
    )
  }

  // Show completion if no areas
  if (!currentArea) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: theme.colors.text.primary, marginBottom: 16 }}>No areas found</Text>
        <Button 
          title="Go Back" 
          variant="secondary"
          onPress={() => navigation.goBack()} 
        />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.headerContainer}>
        <IconButton 
          icon="chevron_left_rounded" 
          onPress={handleBack}
          variant="ghost"
          size="lg"
          iconSize={42}
          iconWrapperStyle={{ marginLeft: -1 }}
        />
        <View style={{ flex: 1 }} />
        <IconButton 
          icon="close" 
          onPress={() => {
            const parentNavigation = navigation.getParent()
            if (parentNavigation && parentNavigation.canGoBack()) {
              parentNavigation.goBack()
            } else if (navigation.canGoBack()) {
              navigation.goBack()
            }
          }} 
          variant="ghost"
          size="md"
        />
      </View>
      
      {/* Area Navigation Header */}
      <View style={styles.areaHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginRight: 8 }}>{currentArea.icon || '🚀'}</Text>
            <View>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary }}>
                {currentArea.title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>
                Area {currentAreaIndex + 1} of {areas.length}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Actions Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={styles.sectionTitle}>
            These are the actions for the {currentArea.title.toLowerCase()} area and the acceptance criteria for each action
          </Text>

          {/* Action Cards */}
          <ActionChipsList
            actions={actionCards as any}
            onPress={handleActionPress}
            showAddButton={false}
          />
        </View>
      </ScrollView>
      
      {/* Footer section */}
      <View style={styles.footer}>
        {/* Instructional Text */}
        <Text style={styles.footerText}>
          If you want to change these, provide feedback to our AI.
        </Text>

        {/* Feedback Input */}
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Provide detailed feedback here for AI to adjust your actions accordingly.."
          multiline
          style={styles.feedbackInput}
        />
        
        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {/* AI Refine Button */}
          <Button 
            title="Refine with AI" 
            variant="secondary"
            onPress={handleRefine}
            style={styles.flexButton}
            disabled={!feedback.trim()}
          />
          
          {/* Approve Area Button */}
          <Button 
            title={isLastArea ? "Complete" : "Next Area"}
            variant="black"
            onPress={() => {
              Keyboard.dismiss()
              handleApproveArea()
            }}
            style={styles.flexButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  headerContainer: {
    height: 52,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 30,
    marginTop: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  areaHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 400,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
    lineHeight: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
    lineHeight: 24
  },
  loadingDescription: {
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.background.page,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 12,
    lineHeight: 20,
  },
  feedbackInput: {
    minHeight: 60,
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  flexButton: {
    flex: 1,
    borderRadius: theme.radius.xl,
  },
})
