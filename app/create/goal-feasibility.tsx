import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { runGoalFeasibility, upsertDream, TitleSuggestion } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'

interface GoalSuggestion extends TitleSuggestion {
  id: string
  selected?: boolean
}

export default function GoalFeasibilityStep() {
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
  
  const [isLoading, setIsLoading] = useState(!goalFeasibilityAnalyzed)
  const [goalSuggestions, setGoalSuggestions] = useState<GoalSuggestion[]>([])
  const [summary, setSummary] = useState<string>('')
  const [currentGoal, setCurrentGoal] = useState<string>('')
  const [originalGoal, setOriginalGoal] = useState<string>('')

  useFocusEffect(
    React.useCallback(() => {
      // Initialize current values with context values when navigating back
      if (title) {
        setCurrentGoal(title)
        if (!originalGoal) {
          setOriginalGoal(title)
        }
      }

      // If we already have goal feasibility data, use it
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
          title: originalTitleForFeasibility || title,
          emoji: '🎯',
          reasoning: 'Your original goal',
          selected: false
        })
        
        setGoalSuggestions(processedSuggestions)
        setIsLoading(false)
        return
      }

      // Only run analysis if we haven't analyzed yet and have a title
      if (goalFeasibilityAnalyzed || !title) {
        if (!title) {
          setTimeout(() => {
            setIsLoading(false)
          }, 1000)
        }
        return
      }

      const runAnalysis = async () => {
        try {
          // Get auth token
          const { data: { session } } = await supabaseClient.auth.getSession()
          if (!session?.access_token) {
            throw new Error('No authentication token available')
          }

          const result = await runGoalFeasibility({ 
            title,
            baseline: baseline || undefined,
            obstacles: obstacles || undefined,
            enjoyment: enjoyment || undefined
          }, session.access_token)
          
          // Store in context
          setField('goalFeasibility', result)
          setField('originalTitleForFeasibility', title)
          setGoalFeasibilityAnalyzed(true)
          
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
            title: title,
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
          
          // Fallback to default suggestions if AI fails
          setGoalSuggestions([
            { id: 'original', title: title || 'Your Dream', emoji: '🎯', reasoning: 'Original title', selected: false }
          ])
          setTimeout(() => {
            setIsLoading(false)
          }, 1000)
        }
      }

      runAnalysis()
    }, [title, goalFeasibility, goalFeasibilityAnalyzed, setField, setGoalFeasibilityAnalyzed, baseline, obstacles, enjoyment])
  )

  const handleGoalSelect = (goalId: string) => {
    const selectedGoal = goalSuggestions.find(g => g.id === goalId)
    if (selectedGoal) {
      setCurrentGoal(selectedGoal.title)
      setField('title', selectedGoal.title)
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
            Getting Feedback on Your Dream
          </Text>
          
          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            textAlign: 'center',
            paddingHorizontal: 32,
            lineHeight: 22
          }}>
            We're analyzing your goal to provide feedback that will help increase your chance of success
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

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <CreateScreenHeader step="feasibility" />
      
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
          Get Feedback on Your Goal
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
            Current goal
          </Text>
          <Input
            value={currentGoal}
            onChangeText={(text) => {
              setCurrentGoal(text)
              setField('title', text)
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
                Alternative goal suggestions (click to replace current)
              </Text>
              {goalSuggestions.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() => handleGoalSelect(goal.id)}
                  style={{
                    backgroundColor: 'white',
                    height: 44,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{goal.emoji}</Text>
                  <Text style={{ fontSize: 14, color: '#000', flex: 1 }}>{goal.title}</Text>
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

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.pageBackground,
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
})
