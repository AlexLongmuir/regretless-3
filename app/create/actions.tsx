import React, { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { Button, ActionChipsList, IconButton } from '../../components'
import { generateActions, upsertActions } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { theme } from '../../utils/theme'
import type { Action, Area } from '../../backend/database/types'

interface ActionCard {
  id: string
  title: string
  est_minutes?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  repeat_every_days?: 1 | 2 | 3
  acceptance_criteria?: string[]
  dream_image?: string
  occurrence_no?: number
}

export default function ActionsStep() {
  const navigation = useNavigation<any>()
  const { user } = useAuth()
  const { 
    title, 
    dreamId, 
    image_url,
    areas,
    actions, 
    setActions, 
    addAction, 
    updateAction, 
    removeAction,
    updateArea,
    start_date,
    end_date,
    baseline,
    obstacles,
    enjoyment,
    timeCommitment
  } = useCreateDream()
  
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [currentAreaIndex, setCurrentAreaIndex] = useState(0)
  
  // Get current area and its actions
  const currentArea = areas[currentAreaIndex]
  const currentAreaActions = actions.filter(action => action.area_id === currentArea?.id)
  
  // Convert current area actions to local UI format, sorted by position
  const actionCards: ActionCard[] = currentAreaActions
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(action => ({
      id: action.id,
      title: action.title,
      est_minutes: action.est_minutes || 0,
      difficulty: action.difficulty,
      repeat_every_days: action.repeat_every_days ? Math.ceil(7 / action.repeat_every_days) as 1 | 2 | 3 : undefined,
      slice_count_target: action.slice_count_target,
      acceptance_criteria: action.acceptance_criteria || [],
      dream_image: image_url || undefined, // Use dream image for all actions
      // Don't set occurrence_no for original actions - this makes them show as "4 repeats" instead of "1 of 4"
      hideEditButtons: false // Show edit buttons in create flow
    }))

  useFocusEffect(
    React.useCallback(() => {
      const loadActions = async () => {
        // Only load if we don't have actions yet and we have a dreamId
        if (!dreamId || actions.length > 0) {
          setIsLoading(false)
          return
        }

        // Check if areas have real IDs (not temporary)
        const hasTemporaryAreaIds = areas.some(area => area.id.startsWith('temp_'))
        if (hasTemporaryAreaIds) {
          // Wait a bit and try again
          setTimeout(() => {
            const stillHasTemporaryIds = areas.some(area => area.id.startsWith('temp_'))
            if (stillHasTemporaryIds) {
              console.error('Areas still have temporary IDs after waiting')
              setIsLoading(false)
            } else {
              loadActions() // Retry
            }
          }, 1000)
          return
        }

        try {
          // Get auth token
          const { data: { session } } = await supabaseClient.auth.getSession()
          if (!session?.access_token) {
            throw new Error('No authentication token available')
          }

          const generatedActions = await generateActions({ 
            dream_id: dreamId,
            title: title || '',
            start_date: start_date || undefined,
            end_date: end_date || undefined,
            baseline: baseline || undefined,
            obstacles: obstacles || undefined,
            enjoyment: enjoyment || undefined,
            timeCommitment: timeCommitment || undefined,
            areas: areas
          }, session.access_token)
          
          if (generatedActions && generatedActions.length > 0) {
            // Store the full Action objects in context
            setActions(generatedActions)
          }
          
          // Simulate minimum loading time for UX
          setTimeout(() => {
            setIsLoading(false)
          }, 3000)
        } catch (error) {
          console.error('Failed to generate actions:', error)
          // Still show UI even if API fails
          setTimeout(() => {
            setIsLoading(false)
          }, 3000)
        }
      }

      loadActions()
    }, [dreamId, actions.length, setActions, areas, title, start_date, end_date, baseline, obstacles, enjoyment, timeCommitment])
  )

  // Navigation functions
  const goToNextArea = () => {
    if (currentAreaIndex < areas.length - 1) {
      setCurrentAreaIndex(currentAreaIndex + 1)
    } else {
      // All areas completed, navigate to confirmation
      navigation.navigate('ActionsConfirm')
    }
  }


  const isLastArea = currentAreaIndex === areas.length - 1
  const isFirstArea = currentAreaIndex === 0

  // Custom header component that handles area navigation
  const CustomHeader = () => {
    const navigation = useNavigation()
    const { reset } = useCreateDream()
    
    const handleBack = () => {
      if (isFirstArea) {
        // If we're on the first area, go back to areas step
        navigation.goBack()
      } else {
        // Go to previous area
        setCurrentAreaIndex(currentAreaIndex - 1)
      }
    }

    const handleClose = () => {
      // Reset the CreateDreamContext state
      reset()
      
      // Close the entire create flow and return to main app
      const parentNavigation = navigation.getParent()
      if (parentNavigation) {
        parentNavigation.navigate('Tabs')
      } else {
        navigation.goBack()
      }
    }

    return (
      <View style={{ 
        height: 52, 
        paddingHorizontal: 12, 
        paddingTop: 8,
        marginTop: 44, // Add space for status bar
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        <IconButton 
          icon="chevron_left" 
          onPress={handleBack}
          variant="ghost"
          size="md"
          style={{
            backgroundColor: 'white',
            borderRadius: 12
          }}
        />
        <View style={{ flex: 1 }} />
        <IconButton 
          icon="close" 
          onPress={handleClose}
          variant="ghost"
          size="md"
          style={{
            backgroundColor: 'white',
            borderRadius: 12
          }}
        />
      </View>
    )
  }

  const handleReorderActions = (reorderedActions: any[]) => {
    // Update positions based on new order (starting from 1)
    const updatedActions = reorderedActions.map((action, index) => {
      const originalAction = currentAreaActions.find(a => a.id === action.id)
      if (originalAction) {
        return { ...originalAction, position: index + 1 } // Start positions from 1
      }
      return originalAction
    }).filter(Boolean) as Action[]
    
    // Update all actions, replacing the current area actions with reordered ones
    const otherActions = actions.filter(action => action.area_id !== currentArea?.id)
    setActions([...otherActions, ...updatedActions])
  }

  const handleRefreshActions = async () => {
    if (!dreamId || !title) return
    
    setIsLoading(true)
    
    try {
      // Get auth token
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const generatedActions = await generateActions({ 
        dream_id: dreamId,
        title: title || '',
        start_date: start_date || undefined,
        end_date: end_date || undefined,
        baseline: baseline || undefined,
        obstacles: obstacles || undefined,
        enjoyment: enjoyment || undefined,
        timeCommitment: timeCommitment || undefined,
        areas: areas
      }, session.access_token)
      
      if (generatedActions && generatedActions.length > 0) {
        // Store the new actions in context
        setActions(generatedActions)
      }
      
      // Simulate minimum loading time for UX
      setTimeout(() => {
        setIsLoading(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to refresh actions:', error)
      setTimeout(() => {
        setIsLoading(false)
      }, 1000)
    }
  }

  const handleApproveArea = async () => {
    // Check if current area has a real ID (not temporary)
    if (currentArea && currentArea.id.startsWith('temp_')) {
      console.error('Cannot save actions for area with temporary ID:', currentArea.id)
      return
    }

    // Mark current area as approved
    if (currentArea) {
      updateArea(currentArea.id, { approved_at: new Date().toISOString() })
    }

    // Save current area actions to backend
    if (dreamId && currentArea) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          // Get actions for current area only
          const currentAreaActionsToSend = currentAreaActions.map((action, index) => {
            const { id, ...actionWithoutId } = action
            const actionToSend = action.id?.startsWith('temp_') ? actionWithoutId : action
            return {
              ...actionToSend,
              position: actionToSend.position ?? (index + 1) // Start positions from 1
            }
          })
          
          await upsertActions({
            dream_id: dreamId,
            actions: currentAreaActionsToSend
          }, session.access_token)
        }
      } catch (error) {
        console.error('Failed to save actions:', error)
      }
    }

    // Navigate to next area or completion
    goToNextArea()
  }

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
    )
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
    )
  }

  // Check if current area has temporary ID
  if (currentArea.id.startsWith('temp_')) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, color: '#000', marginBottom: 16, textAlign: 'center' }}>
          Areas are still being saved. Please wait...
        </Text>
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
      style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <CustomHeader />
      
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
              <Text style={{ fontSize: 12, color: '#666' }}>
                Area {currentAreaIndex + 1} of {areas.length}
              </Text>
            </View>
          </View>
          
          {/* Area Navigation Dots */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {areas.map((_, index) => (
              <View
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index <= currentAreaIndex ? '#10B981' : '#E5E7EB',
                  marginLeft: 4
                }}
              />
            ))}
          </View>
        </View>
      </View>
      
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 400 }}
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
            onEdit={(id, updatedAction) => {
              // Convert UI ActionCard back to Action and update context
              const actionUpdate: Partial<Action> = {
                title: updatedAction.title,
                est_minutes: updatedAction.est_minutes,
                difficulty: updatedAction.difficulty,
                repeat_every_days: updatedAction.repeat_every_days ? Math.ceil(7 / updatedAction.repeat_every_days) as 1 | 2 | 3 : undefined,
                acceptance_criteria: updatedAction.acceptance_criteria,
              }
              updateAction(id, actionUpdate)
            }}
            onRemove={(id) => {
              // Remove from context - this will update live
              removeAction(id)
            }}
            onAdd={(newAction) => {
              // Convert UI ActionCard to Action and add to context
              if (!dreamId || !currentArea) return
              
              // Check if current area has a real ID (not temporary)
              if (currentArea.id.startsWith('temp_')) {
                console.error('Cannot add actions to area with temporary ID:', currentArea.id)
                return
              }
              
              const action: Action = {
                id: `temp_${Date.now()}`, // Temporary ID until saved to backend
                user_id: user?.id || '', // Set user ID
                dream_id: dreamId || '', // Set dream ID
                area_id: currentArea.id, // Set to current area's real ID
                title: newAction.title,
                est_minutes: newAction.est_minutes,
                difficulty: newAction.difficulty || 'medium',
                repeat_every_days: newAction.repeat_every_days ? Math.ceil(7 / newAction.repeat_every_days) as 1 | 2 | 3 : undefined,
                acceptance_criteria: newAction.acceptance_criteria || [],
                position: currentAreaActions.length + 1, // Add at the end of current area actions (starting from 1)
                is_active: true,
                deleted_at: undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
              addAction(action)
            }}
            onReorder={handleReorderActions}
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
          If you want to change these, hold down to edit or provide feedback to our AI.
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
          {/* AI Fix Button */}
          <Button 
            title="Fix with AI" 
            variant="secondary"
            onPress={async () => {
              if (!dreamId || !title || !feedback.trim()) return
              
              Keyboard.dismiss() // Close keyboard when AI fix is triggered
              
              // Trigger loading page
              setIsLoading(true)
              
              try {
                // Get auth token
                const { data: { session } } = await supabaseClient.auth.getSession()
                if (!session?.access_token) {
                  throw new Error('No authentication token available')
                }

                // Filter to only include the current area for feedback-based regeneration
                const areasToRegenerate = areas.filter((area, index) => 
                  index === currentAreaIndex
                )
                
                // Get actions from all other areas (before and after current) to preserve them
                const areasToPreserve = areas.filter((area, index) => 
                  index !== currentAreaIndex
                )
                const preservedAreaIds = areasToPreserve.map(area => area.id)
                
                const preservedActions = actions.filter(action => 
                  preservedAreaIds.includes(action.area_id)
                )
                
                // Call the generateActions API to regenerate actions for current area only
                const generatedActions = await generateActions({ 
                  dream_id: dreamId,
                  title: title || '',
                  start_date: start_date || undefined,
                  end_date: end_date || undefined,
                  baseline: baseline || undefined,
                  obstacles: obstacles || undefined,
                  enjoyment: enjoyment || undefined,
                  timeCommitment: timeCommitment || undefined,
                  areas: areasToRegenerate,
                  feedback: feedback.trim() || undefined,
                  original_actions: actions.filter(action => 
                    areasToRegenerate.some(area => area.id === action.area_id)
                  )
                }, session.access_token)
                
                if (generatedActions && generatedActions.length > 0) {
                  // Combine preserved actions from approved areas with newly generated actions
                  const combinedActions = [...preservedActions, ...generatedActions]
                  setActions(combinedActions)
                  // Clear feedback after successful regeneration
                  setFeedback('')
                }
                
                // Simulate minimum loading time for UX
                setTimeout(() => {
                  setIsLoading(false)
                }, 2000)
              } catch (error) {
                console.error('Failed to regenerate actions with AI:', error)
                setTimeout(() => {
                  setIsLoading(false)
                }, 1000)
              }
            }}
            style={{ flex: 1 }}
            disabled={!feedback.trim()}
          />
          
          {/* Approve Area Button */}
          <Button 
            title={isLastArea ? "Complete" : "Next Area"}
            variant="black"
            onPress={() => {
              Keyboard.dismiss() // Close keyboard when continuing
              handleApproveArea()
            }}
            style={{ flex: 1, borderRadius: theme.radius.xl }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
