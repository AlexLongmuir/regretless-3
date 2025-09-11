
import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { runFeasibility, upsertDream, TitleSuggestion, DateAnalysis } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'

interface GoalSuggestion extends TitleSuggestion {
  id: string
  selected?: boolean
}

interface DateSuggestion {
  id: string
  date: string
  label: string
  selected?: boolean
}

export default function FeasibilityStep() {
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
    feasibility,
    feasibilityAnalyzed,
    originalTitleForFeasibility,
    originalEndDateForFeasibility,
    setField,
    setFeasibilityAnalyzed
  } = useCreateDream()
  
  const [isLoading, setIsLoading] = useState(!feasibilityAnalyzed)
  const [goalSuggestions, setGoalSuggestions] = useState<GoalSuggestion[]>([])
  const [dateSuggestions, setDateSuggestions] = useState<DateSuggestion[]>([])
  const [dateAnalysis, setDateAnalysis] = useState<DateAnalysis | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [currentGoal, setCurrentGoal] = useState<string>('')
  const [currentEndDate, setCurrentEndDate] = useState<string>('')
  const [originalGoal, setOriginalGoal] = useState<string>('')
  const [originalEndDate, setOriginalEndDate] = useState<string>('')
  const [dateSuggestionsInitialized, setDateSuggestionsInitialized] = useState<boolean>(false)

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date set'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleEndDateChange = (date: Date) => {
    setField('end_date', date.toISOString().split('T')[0])
  }

  useFocusEffect(
    React.useCallback(() => {
      // Initialize current values with original values
      if (title && !currentGoal) {
        setCurrentGoal(title)
        setOriginalGoal(title)
      }
      if (end_date && !currentEndDate) {
        setCurrentEndDate(end_date)
        setOriginalEndDate(end_date)
      }

      // If we already have feasibility data, use it
      if (feasibility && feasibilityAnalyzed) {
        // Process summary
        setSummary(feasibility.summary)
        
        // Process title suggestions - add original as last option
        const processedSuggestions = feasibility.titleSuggestions.map((suggestion, index) => ({
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
        
        // Process date analysis
        setDateAnalysis(feasibility.dateAnalysis)
        
        // Create date suggestions - add original as last option
        const originalDate = originalEndDateForFeasibility || end_date || 'No end date set'
        const suggestedDate = feasibility.dateAnalysis.suggestedEndDate
        
        const dateOptions: DateSuggestion[] = []
        
        if (suggestedDate !== originalDate) {
          dateOptions.push({
            id: 'suggested',
            date: suggestedDate,
            label: `Suggested: ${formatDate(suggestedDate)}`,
            selected: false
          })
        }
        
        // Add original date as last option
        dateOptions.push({
          id: 'original',
          date: originalDate,
          label: `Original: ${formatDate(originalDate)}`,
          selected: false
        })
        
        setDateSuggestions(dateOptions)
        setDateSuggestionsInitialized(true)
        setIsLoading(false)
        return
      }

      // Only run analysis if we haven't analyzed yet and have a title
      if (feasibilityAnalyzed || !title) {
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

          const result = await runFeasibility({ 
            title,
            start_date: start_date || undefined,
            end_date: end_date || undefined,
            baseline: baseline || undefined,
            obstacles: obstacles || undefined,
            enjoyment: enjoyment || undefined
          }, session.access_token)
          
          // Store in context
          setField('feasibility', result)
          setField('originalTitleForFeasibility', title)
          setField('originalEndDateForFeasibility', end_date || 'No end date set')
          setFeasibilityAnalyzed(true)
          
          // Process summary
          setSummary(result.summary)
          
          // Process title suggestions - add original as last option
          const processedSuggestions = result.titleSuggestions.map((suggestion, index) => ({
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
          
          // Process date analysis
          setDateAnalysis(result.dateAnalysis)
          
          // Create date suggestions - add original as last option
          const originalDate = end_date || 'No end date set'
          const suggestedDate = result.dateAnalysis.suggestedEndDate
          
          const dateOptions: DateSuggestion[] = []
          
          if (suggestedDate !== originalDate) {
            dateOptions.push({
              id: 'suggested',
              date: suggestedDate,
              label: `Suggested: ${formatDate(suggestedDate)}`,
              selected: false
            })
          }
          
          // Add original date as last option
          dateOptions.push({
            id: 'original',
            date: originalDate,
            label: `Original: ${formatDate(originalDate)}`,
            selected: false
          })
          
          setDateSuggestions(dateOptions)
          setDateSuggestionsInitialized(true)
          
          // Simulate minimum loading time for UX
          setTimeout(() => {
            setIsLoading(false)
          }, 2000)
        } catch (error) {
          console.error('Feasibility analysis failed:', error)
          // Mark as analyzed even if failed to prevent retries
          setFeasibilityAnalyzed(true)
          
          // Fallback to default suggestions if AI fails
          setGoalSuggestions([
            { id: 'original', title: title || 'Your Dream', emoji: '🎯', reasoning: 'Original title', selected: false }
          ])
          setDateSuggestions([
            { id: 'original', date: end_date || 'No date set', label: 'Original date', selected: false }
          ])
          setDateSuggestionsInitialized(true)
          setTimeout(() => {
            setIsLoading(false)
          }, 1000)
        }
      }

      runAnalysis()
    }, [title, feasibility, feasibilityAnalyzed, setField, setFeasibilityAnalyzed, start_date, end_date, baseline, obstacles, enjoyment, currentGoal, currentEndDate, dateSuggestionsInitialized])
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

  const handleDateSelect = (dateId: string) => {
    const selectedDate = dateSuggestions.find(d => d.id === dateId)
    if (selectedDate) {
      setCurrentEndDate(selectedDate.date)
      setField('end_date', selectedDate.date)
    }
    
    // Don't update the suggestions array - keep them stable
    // The suggestions should remain visible even after selection
  }

  const handleContinue = async () => {
    // Use current values (which may have been updated by user selections)
    const updatedTitle = currentGoal
    const updatedEndDate = currentEndDate

    // Navigate immediately for smooth UX
    navigation.navigate('DreamConfirm')

    // Handle backend operations in background
    if (dreamId) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          // Save current title/date changes
          await upsertDream({
            id: dreamId,
            title: updatedTitle,
            start_date,
            end_date: updatedEndDate,
            image_url,
            baseline,
            obstacles,
            enjoyment
          }, session.access_token)
        }
      } catch (error) {
        console.error('Failed to save/activate dream:', error)
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
            Analysing Your Dream
          </Text>
          
          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            textAlign: 'center',
            paddingHorizontal: 32,
            lineHeight: 22
          }}>
            This helps us ensure we're getting your dream right & increases your chance of success from the get go
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
    <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}>
      <CreateScreenHeader step="feasibility" />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Page Title */}
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 24,
          lineHeight: 24
        }}>
          Let's Perfect Your Dream
        </Text>

        {/* Choose Your Goal Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            marginBottom: 16,
            fontWeight: '600'
          }}>
            Choose Your Goal
          </Text>
          
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
            color: '#666', 
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
                color: '#666', 
                marginBottom: 12
              }}>
                Suggested goals (click to replace current)
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

        {/* Choose Your Timeline Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            marginBottom: 16,
            fontWeight: '600'
          }}>
            Choose Your Timeline
          </Text>
          
          {/* AI Summary for Timeline */}
          {dateAnalysis && (
            <Text style={{ 
              fontSize: 16, 
              color: '#000', 
              marginBottom: 16,
              lineHeight: 22,
              fontStyle: 'italic'
            }}>
              {dateAnalysis.assessment}
            </Text>
          )}
          
          <Text style={{ 
            fontSize: 14, 
            color: '#666', 
            marginBottom: 12
          }}>
            Current end date
          </Text>
          <Input
            type="date"
            value={formatDate(currentEndDate)}
            onChangeText={() => {}} // Required prop but not used for date input
            onDateChange={(date) => {
              const dateString = date.toISOString().split('T')[0]
              setCurrentEndDate(dateString)
              setField('end_date', dateString)
            }}
            onToggleDatePicker={() => setShowEndDatePicker(!showEndDatePicker)}
            showDatePicker={showEndDatePicker}
            placeholder="Select end date"
            variant="borderless"
            minimumDate={new Date()}
            style={{ marginBottom: 16 }}
          />

          {/* Date Suggestions - directly under current end date */}
          {dateSuggestions.length > 0 && (
            <View style={{ gap: 8, marginBottom: 16 }}>
              <Text style={{ 
                fontSize: 14, 
                color: '#666', 
                marginBottom: 12
              }}>
                Suggested dates (click to replace current)
              </Text>
              {dateSuggestions.map((date) => (
                <TouchableOpacity
                  key={date.id}
                  onPress={() => handleDateSelect(date.id)}
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
                  <Text style={{ fontSize: 16 }}>📅</Text>
                  <Text style={{ fontSize: 14, color: '#000' }}>{date.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Sticky bottom button */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: 32,
        backgroundColor: theme.colors.pageBackground
      }}>
        <Button 
          title="Create Goal"
          variant="black"
          onPress={handleContinue}
        />
      </View>
    </View>
  )
}
