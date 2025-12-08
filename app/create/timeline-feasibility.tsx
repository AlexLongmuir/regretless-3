import React, { useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { runTimelineFeasibility, upsertDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'

export default function TimelineFeasibilityStep() {
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
    timeCommitment,
    timelineFeasibility,
    timelineFeasibilityAnalyzed,
    originalEndDateForFeasibility,
    originalTimeCommitmentForFeasibility,
    setField,
    setTimelineFeasibilityAnalyzed
  } = useCreateDream()
  
  const [isLoading, setIsLoading] = useState(true)
  const [assessment, setAssessment] = useState<string>('')
  const [suggestedEndDate, setSuggestedEndDate] = useState<string>('')
  const [reasoning, setReasoning] = useState<string>('')
  
  // Helper to format time commitment for display
  const formatTimeCommitment = (timeCommitment: { hours: number; minutes: number } | undefined) => {
    if (!timeCommitment) return ''
    const totalMinutes = (timeCommitment.hours || 0) * 60 + (timeCommitment.minutes || 0)
    if (totalMinutes === 0) return ''
    return `${totalMinutes} ${totalMinutes === 1 ? 'min' : 'mins'}`
  }
  
  // Helper to create concise assessment message
  const createConciseAssessment = (
    timeCommitment: { hours: number; minutes: number } | undefined,
    formattedDate: string,
    reasoning: string
  ) => {
    const timeText = formatTimeCommitment(timeCommitment)
    if (!timeText) return ''
    
    // Extract first sentence from reasoning, or use a default
    const firstSentence = reasoning.split('.')[0].trim()
    const explanation = firstSentence || 'Your consistent daily effort will build momentum towards your goal.'
    
    return `Based on your daily time commitment of ${timeText}, we forecast you can achieve this by ${formattedDate}. ${explanation}`
  }
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [currentStartDate, setCurrentStartDate] = useState<string>('')
  const [currentEndDate, setCurrentEndDate] = useState<string>('')
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false)

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date set'
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    
    if (date.getTime() === today.getTime()) {
      return 'Today'
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Helper function to compare time commitments
  const timeCommitmentChanged = (current: { hours: number; minutes: number } | undefined, original: { hours: number; minutes: number } | undefined) => {
    if (!current || !original) return true
    return current.hours !== original.hours || current.minutes !== original.minutes
  }

  useFocusEffect(
    React.useCallback(() => {
      // Check if time commitment has changed - if so, we need to re-run analysis
      const timeCommitmentHasChanged = timeCommitmentChanged(timeCommitment, originalTimeCommitmentForFeasibility)
      
      // If we already have analyzed data AND time commitment hasn't changed, use it instead of re-running
      if (timelineFeasibility && timelineFeasibilityAnalyzed && !timeCommitmentHasChanged) {
        // Initialize current values from context
        if (start_date) {
          setCurrentStartDate(start_date)
        } else {
          const today = new Date().toISOString().split('T')[0]
          setCurrentStartDate(today)
        }

        if (end_date) {
          setCurrentEndDate(end_date)
        } else if (timelineFeasibility.suggestedEndDate) {
          setCurrentEndDate(timelineFeasibility.suggestedEndDate)
        }

        // Format the suggested end date to match what we display
        const formattedSuggestedDate = formatDate(timelineFeasibility.suggestedEndDate)
        
        // Create concise assessment message
        const conciseAssessment = createConciseAssessment(
          timeCommitment,
          formattedSuggestedDate,
          timelineFeasibility.reasoning || ''
        )
        
        setAssessment(conciseAssessment)
        setSuggestedEndDate(timelineFeasibility.suggestedEndDate)
        setReasoning(timelineFeasibility.reasoning)
        setIsLoading(false)
        return
      }

      // Initialize current values from context when navigating back
      let startDate = start_date
      let endDate = end_date
      
      if (startDate) {
        setCurrentStartDate(startDate)
      } else {
        // Default to today if no start date
        const today = new Date().toISOString().split('T')[0]
        startDate = today
        setCurrentStartDate(today)
        setField('start_date', today)
      }

      if (endDate) {
        setCurrentEndDate(endDate)
      }

      // If time commitment changed and we've already analyzed, reset to force re-run
      if (timeCommitmentHasChanged && timelineFeasibilityAnalyzed) {
        setTimelineFeasibilityAnalyzed(false)
        // Clear the cached feasibility data so we re-run
        setField('timelineFeasibility', undefined)
      }

      // Only skip analysis if we've analyzed AND time commitment hasn't changed
      if (timelineFeasibilityAnalyzed && !timeCommitmentHasChanged) {
        setIsLoading(false)
        return
      }

      // Reset analysis flag and show loading
      setHasRunAnalysis(false)
      setIsLoading(true)

      if (!title || !timeCommitment) {
        setTimeout(() => {
          setIsLoading(false)
        }, 1000)
        return
      }

      const runAnalysis = async () => {
        // Prevent multiple simultaneous analyses
        if (hasRunAnalysis) {
          return
        }
        setHasRunAnalysis(true)
        
        try {
          // Get auth token
          const { data: { session } } = await supabaseClient.auth.getSession()
          if (!session?.access_token) {
            throw new Error('No authentication token available')
          }

          // Use the initialized dates
          const finalStartDate = startDate || undefined
          const finalEndDate = endDate || undefined

          const result = await runTimelineFeasibility({ 
            title,
            start_date: finalStartDate,
            end_date: finalEndDate,
            baseline: baseline || undefined,
            obstacles: obstacles || undefined,
            enjoyment: enjoyment || undefined,
            timeCommitment: timeCommitment
          }, session.access_token)
          
          // Store in context
          setField('timelineFeasibility', result)
          setField('originalEndDateForFeasibility', finalEndDate || 'No end date set')
          setField('originalTimeCommitmentForFeasibility', timeCommitment)
          setTimelineFeasibilityAnalyzed(true)
          
          // Process results
          // Format the suggested end date to match what we display
          const formattedSuggestedDate = formatDate(result.suggestedEndDate)
          
          // Create concise assessment message
          const conciseAssessment = createConciseAssessment(
            timeCommitment,
            formattedSuggestedDate,
            result.reasoning || ''
          )
          
          setAssessment(conciseAssessment)
          setSuggestedEndDate(result.suggestedEndDate)
          setReasoning(result.reasoning)
          
          // Always use the AI's suggested end date (only update if different to prevent loop)
          setCurrentEndDate(result.suggestedEndDate)
          if (end_date !== result.suggestedEndDate) {
            setField('end_date', result.suggestedEndDate)
          }
          
          // Simulate minimum loading time for UX
          setTimeout(() => {
            setIsLoading(false)
          }, 2000)
        } catch (error) {
          console.error('Timeline feasibility analysis failed:', error)
          // Mark as analyzed even if failed to prevent retries
          setTimelineFeasibilityAnalyzed(true)
          
          // Fallback to default values if AI fails
          const defaultEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days from now
          const formattedDefaultDate = formatDate(defaultEndDate)
          const fallbackAssessment = createConciseAssessment(
            timeCommitment,
            formattedDefaultDate,
            'Your consistent daily effort will build momentum towards your goal.'
          )
          setAssessment(fallbackAssessment || 'Unable to analyze timeline automatically. Please set your preferred end date.')
          setSuggestedEndDate(defaultEndDate)
          setReasoning('Default 90-day timeline suggested.')
          
          // Always use the default end date
          setCurrentEndDate(defaultEndDate)
          setField('end_date', defaultEndDate)
          
          setTimeout(() => {
            setIsLoading(false)
          }, 1000)
        }
      }

      runAnalysis()
    }, [title, timeCommitment, start_date, baseline, obstacles, enjoyment, timelineFeasibility, timelineFeasibilityAnalyzed, originalTimeCommitmentForFeasibility, setField, setTimelineFeasibilityAnalyzed])
  )


  const handleStartDateChange = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison
    
    // Don't allow dates in the past
    if (date < today) {
      return
    }
    
    const dateString = date.toISOString().split('T')[0]
    setCurrentStartDate(dateString)
    setField('start_date', dateString)
    
    // If the new start date is after the current end date, update end date
    if (currentEndDate && date >= new Date(currentEndDate)) {
      const newEndDate = new Date(date)
      newEndDate.setDate(newEndDate.getDate() + 1) // Set end date to day after start date
      const newEndDateString = newEndDate.toISOString().split('T')[0]
      setCurrentEndDate(newEndDateString)
      setField('end_date', newEndDateString)
    }
  }

  const handleEndDateChange = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    
    // Don't allow end date to be before or equal to start date
    if (currentStartDate && date <= new Date(currentStartDate)) {
      return
    }
    
    setCurrentEndDate(dateString)
    setField('end_date', dateString)
  }

  const handleContinue = async () => {
    // Use current date values
    const updatedStartDate = currentStartDate
    const updatedEndDate = currentEndDate

    // Navigate immediately for smooth UX
    navigation.navigate('DreamConfirm')

    // Handle backend operations in background
    if (dreamId) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          // Save current date changes
          await upsertDream({
            id: dreamId,
            title,
            start_date: updatedStartDate,
            end_date: updatedEndDate,
            image_url,
            baseline,
            obstacles,
            enjoyment
          }, session.access_token)
        }
      } catch (error) {
        console.error('Failed to save dream dates:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          {/* Clock Icon */}
          <Text style={{ fontSize: 80, marginBottom: 24 }}>⏰</Text>
          
          {/* Title */}
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            color: theme.colors.text.primary, 
            marginBottom: 16,
            lineHeight: 24
          }}>
            Analyzing Your Timeline
          </Text>
          
          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: theme.colors.text.primary, 
            textAlign: 'center',
            paddingHorizontal: 32,
            lineHeight: 22
          }}>
            We're calculating a realistic timeline based on your goal and daily time commitment
          </Text>
          
          {/* Loading indicator */}
          <ActivityIndicator 
            size="large" 
            color={theme.colors.text.primary} 
            style={{ marginTop: 32 }} 
          />
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}>
      <CreateScreenHeader step="feasibility" />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: theme.spacing['4xl'] }}>
        {/* Page Title */}
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 24,
          lineHeight: 24
        }}>
          Perfect Your Timeline
        </Text>

        {/* Timeline Assessment Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ 
            fontSize: 16, 
            color: theme.colors.text.primary, 
            marginBottom: 16,
            fontWeight: '600'
          }}>
            Timeline Analysis
          </Text>
          
          {/* AI Analysis */}
          {assessment && (
            <Text style={{ 
              fontSize: 16, 
              color: theme.colors.text.primary, 
              marginBottom: 16,
              lineHeight: 22
            }}>
              {assessment}
            </Text>
          )}
        </View>

        {/* Date Selection Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ 
            fontSize: 16, 
            color: theme.colors.text.primary, 
            marginBottom: 16,
            fontWeight: '600'
          }}>
            Set Your Dates
          </Text>
          
          {/* Start Date */}
          <Text style={{ 
            fontSize: 14, 
            color: theme.colors.text.muted, 
            marginBottom: 12
          }}>
            Start Date
          </Text>
          <Input
            type="date"
            value={formatDate(currentStartDate)}
            onChangeText={() => {}} // Required prop but not used for date input
            onDateChange={handleStartDateChange}
            onToggleDatePicker={() => setShowStartDatePicker(!showStartDatePicker)}
            showDatePicker={showStartDatePicker}
            placeholder="Select start date"
            variant="borderless"
            minimumDate={new Date()}
            style={{ marginBottom: 24 }}
          />

          {/* End Date */}
          <Text style={{ 
            fontSize: 14, 
            color: theme.colors.text.muted, 
            marginBottom: 12
          }}>
            End Date
          </Text>
          <Input
            type="date"
            value={formatDate(currentEndDate)}
            onChangeText={() => {}} // Required prop but not used for date input
            onDateChange={handleEndDateChange}
            onToggleDatePicker={() => setShowEndDatePicker(!showEndDatePicker)}
            showDatePicker={showEndDatePicker}
            placeholder="Select end date"
            variant="borderless"
            minimumDate={currentStartDate ? new Date(currentStartDate) : new Date()}
            style={{ marginBottom: 16 }}
          />

        </View>
      </ScrollView>
      
      {/* Footer with button */}
      <View style={styles.footer}>
        <Button 
          title="Create Goal"
          variant="black"
          onPress={handleContinue}
          style={styles.button}
        />
      </View>
    </View>
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