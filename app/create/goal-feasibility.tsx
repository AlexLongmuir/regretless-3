import React, { useState, useEffect, useRef, useMemo } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { runGoalFeasibility, upsertDream, TitleSuggestion } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'

interface GoalSuggestion extends TitleSuggestion {
  id: string
  selected?: boolean
}

interface LastAnalysisInputs {
  title: string
  baseline?: string
  obstacles?: string
  enjoyment?: string
}

export default function GoalFeasibilityStep() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const navigation = useNavigation<any>()
  const { 
    title, 
    dreamId, 
    start_date, 
    end_date, 
    image_url, 
    baseline, 
    obstacles, 
    enjoyment, 
    goalFeasibility,
    goalFeasibilityAnalyzed,
    originalTitleForFeasibility,
    setField,
    setGoalFeasibilityAnalyzed
  } = useCreateDream()
  
  // Track the inputs that were used for the last analysis
  const lastAnalysisInputsRef = useRef<LastAnalysisInputs | null>(null)
  
  // Use refs to track current input values to avoid stale closures in useFocusEffect
  const currentInputsRef = useRef<LastAnalysisInputs>({
    title: title || '',
    baseline: baseline || undefined,
    obstacles: obstacles || undefined,
    enjoyment: enjoyment || undefined
  })
  
  // Keep refs in sync with current values
  React.useEffect(() => {
    currentInputsRef.current = {
      title: title || '',
      baseline: baseline || undefined,
      obstacles: obstacles || undefined,
      enjoyment: enjoyment || undefined
    }
  }, [title, baseline, obstacles, enjoyment])
  
  const [isLoading, setIsLoading] = useState(!goalFeasibilityAnalyzed)
  const [goalSuggestions, setGoalSuggestions] = useState<GoalSuggestion[]>([])
  const [summary, setSummary] = useState<string>('')
  const [currentGoal, setCurrentGoal] = useState<string>('')
  const [originalGoal, setOriginalGoal] = useState<string>('')

  useFocusEffect(
    React.useCallback(() => {
      // Use current values from refs to get latest values without adding them as dependencies
      const currentInputs = currentInputsRef.current
      
      // Initialize current values with context values when navigating back
      if (currentInputs.title) {
        setCurrentGoal(currentInputs.title)
        if (!originalGoal) {
          setOriginalGoal(currentInputs.title)
        }
      }

      // If we already have goal feasibility data, use cached data (don't re-analyze on input changes)
      // The analysis is a one-time operation when the screen first loads with inputs
      if (goalFeasibility && goalFeasibilityAnalyzed) {
        // Process summary
        setSummary(goalFeasibility.summary)
        
        // Process title suggestions - filter out any with placeholders and add original as last option
        const processedSuggestions = goalFeasibility.titleSuggestions
          .filter(suggestion => {
            // Filter out suggestions with placeholders like [Niche], [X], etc.
            const hasPlaceholder = /\[.*?\]/.test(suggestion.title)
            return !hasPlaceholder
          })
          .map((suggestion, index) => ({
            ...suggestion,
            id: `suggestion-${index}`,
            selected: false
          }))
        
        // Add original goal as last option
        processedSuggestions.push({
          id: 'original',
          title: originalTitleForFeasibility || currentInputs.title,
          emoji: '🎯',
          reasoning: 'Your original goal',
          selected: false
        })
        
        setGoalSuggestions(processedSuggestions)
        setIsLoading(false)
        return
      }

      // Only run analysis if we haven't analyzed yet and have a title
      // Don't re-run analysis if inputs changed - we only analyze once on initial load
      if (goalFeasibilityAnalyzed || !currentInputs.title) {
        if (!currentInputs.title) {
          setTimeout(() => {
            setIsLoading(false)
          }, 1000)
        }
        return
      }

      // Ensure loading screen is shown before starting analysis
      setIsLoading(true)

      const runAnalysis = async () => {
        // Get latest values from ref in case they changed
        const latestInputs = currentInputsRef.current
        
        try {
          // Get auth token
          const { data: { session } } = await supabaseClient.auth.getSession()
          if (!session?.access_token) {
            throw new Error('No authentication token available')
          }

          const result = await runGoalFeasibility({ 
            title: latestInputs.title,
            baseline: latestInputs.baseline,
            obstacles: latestInputs.obstacles,
            enjoyment: latestInputs.enjoyment
          }, session.access_token)
          
          // Store in context
          setField('goalFeasibility', result)
          setField('originalTitleForFeasibility', latestInputs.title)
          setGoalFeasibilityAnalyzed(true)
          
          // Store the inputs that were used for this analysis
          lastAnalysisInputsRef.current = {
            title: latestInputs.title || '',
            baseline: latestInputs.baseline,
            obstacles: latestInputs.obstacles,
            enjoyment: latestInputs.enjoyment
          }
          
          // Process summary
          setSummary(result.summary)
          
          // Process title suggestions - filter out any with placeholders and add original as last option
          const processedSuggestions = result.titleSuggestions
            .filter(suggestion => {
              // Filter out suggestions with placeholders like [Niche], [X], etc.
              const hasPlaceholder = /\[.*?\]/.test(suggestion.title)
              return !hasPlaceholder
            })
            .map((suggestion, index) => ({
              ...suggestion,
              id: `suggestion-${index}`,
              selected: false
            }))
          
          // Add original goal as last option
          processedSuggestions.push({
            id: 'original',
            title: latestInputs.title,
            emoji: '🎯',
            reasoning: 'Your original goal',
            selected: false
          })
          
          setGoalSuggestions(processedSuggestions)
          
          // Simulate minimum loading time for UX
          setTimeout(() => {
            setIsLoading(false)
          }, 2000)
        } catch (error) {
          console.error('Goal feasibility analysis failed:', error)
          // Mark as analyzed even if failed to prevent retries
          setGoalFeasibilityAnalyzed(true)
          
          // Store the inputs that were attempted (even on failure)
          const latestInputs = currentInputsRef.current
          lastAnalysisInputsRef.current = {
            title: latestInputs.title || '',
            baseline: latestInputs.baseline,
            obstacles: latestInputs.obstacles,
            enjoyment: latestInputs.enjoyment
          }
          
          // Fallback to default suggestions if AI fails
          setGoalSuggestions([
            { id: 'original', title: latestInputs.title || 'Your Dream', emoji: '🎯', reasoning: 'Original title', selected: false }
          ])
          setTimeout(() => {
            setIsLoading(false)
          }, 1000)
        }
      }

      runAnalysis()
      // Only depend on stable values - not on mutable inputs (title, baseline, obstacles, enjoyment)
      // This prevents the callback from being recreated on every keystroke
    }, [goalFeasibility, goalFeasibilityAnalyzed, setField, setGoalFeasibilityAnalyzed, originalTitleForFeasibility])
  )

  const handleGoalSelect = (goalId: string) => {
    const selectedGoal = goalSuggestions.find(g => g.id === goalId)
    if (selectedGoal) {
      setCurrentGoal(selectedGoal.title)
      setField('title', selectedGoal.title)
      
      // Update the tracked inputs so selecting a suggestion doesn't trigger a rerun
      if (lastAnalysisInputsRef.current) {
        lastAnalysisInputsRef.current = {
          ...lastAnalysisInputsRef.current,
          title: selectedGoal.title
        }
      }
    }
    
    setGoalSuggestions(prev => 
      prev.map(goal => ({
        ...goal,
        selected: goal.id === goalId
      }))
    )
  }

  const handleContinue = async () => {
    // Use current goal value
    const updatedTitle = currentGoal

    // Navigate immediately for smooth UX
    navigation.navigate('TimeCommitment')

    // Handle backend operations in background
    if (dreamId) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          // Save current title changes
          await upsertDream({
            id: dreamId,
            title: updatedTitle,
            start_date,
            end_date,
            image_url,
            baseline,
            obstacles,
            enjoyment
          }, session.access_token)
        }
      } catch (error) {
        console.error('Failed to save dream title:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background.page, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          {/* Rocket Icon */}
          <Text style={{ fontSize: 80, marginBottom: 24 }}>🚀</Text>
          
          {/* Title */}
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            color: theme.colors.text.primary, 
            marginBottom: 16,
            lineHeight: 24
          }}>
            Making Your Dream Even Better
          </Text>
          
          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: theme.colors.text.primary, 
            textAlign: 'center',
            paddingHorizontal: 32,
            lineHeight: 22
          }}>
            We're finding ways to make your goal more achievable and exciting
          </Text>
          
          {/* Loading indicator */}
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary[600]} 
            style={{ marginTop: 32 }} 
          />
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background.page }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: theme.spacing['4xl'] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 24,
          lineHeight: 24
        }}>
          Let's Make Your Dream Even Better
        </Text>

        {/* Choose Your Goal Section */}
        <View style={{ marginBottom: 32 }}>
          
          {/* AI Summary for Goals */}
          {summary && (
            <Text style={{ 
              fontSize: 16, 
              color: '#000', 
              marginBottom: 16,
              lineHeight: 22,
              fontStyle: 'italic'
            }}>
              {summary}
            </Text>
          )}
          
          <Text style={{ 
            fontSize: 14, 
            color: theme.colors.text.muted, 
            marginBottom: 12
          }}>
            Your dream
          </Text>
          <Input
            value={currentGoal}
            onChangeText={(text) => {
              setCurrentGoal(text)
              setField('title', text)
              // currentInputsRef will be updated automatically by the useEffect hook
            }}
            placeholder="Your dream title..."
            variant="borderless"
            multiline={true}
            style={{ 
              minHeight: 44,
              marginBottom: 16
            }}
          />

          {/* Goal Suggestions - directly under current goal */}
          {goalSuggestions.length > 0 && (
            <View style={{ gap: 8, marginBottom: 16 }}>
              <Text style={{ 
                fontSize: 14, 
                color: theme.colors.text.muted, 
                marginBottom: 12
              }}>
                Suggestions to make it even better (tap to try)
              </Text>
              {goalSuggestions.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() => handleGoalSelect(goal.id)}
                  style={{
                    backgroundColor: theme.colors.background.card,
                    height: 44,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{goal.emoji}</Text>
                  <Text style={{ fontSize: 14, color: theme.colors.text.primary, flex: 1 }}>{goal.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Footer with button */}
      <View style={styles.footer}>
        <Button 
          title="Continue to Time Commitment"
          variant="black"
          onPress={handleContinue}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.background.page,
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
})
