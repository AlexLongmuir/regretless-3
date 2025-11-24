import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
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
    setField,
    setTimelineFeasibilityAnalyzed
  } = useCreateDream()
  
  const [isLoading, setIsLoading] = useState(true)
  const [assessment, setAssessment] = useState<string>('')
  const [suggestedEndDate, setSuggestedEndDate] = useState<string>('')
  const [reasoning, setReasoning] = useState<string>('')
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

  useFocusEffect(
    React.useCallback(() => {
      // Initialize current values from context when navigating back
      if (start_date) {
        setCurrentStartDate(start_date)
      } else if (!currentStartDate) {
        // Default to today if no start date
        const today = new Date().toISOString().split('T')[0]
        setCurrentStartDate(today)
        setField('start_date', today)
      }

      if (end_date) {
        setCurrentEndDate(end_date)
      }

      // Reset analysis flag and show loading on every page visit
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

          const result = await runTimelineFeasibility({ 
            title,
            start_date: currentStartDate || undefined,
            end_date: currentEndDate || undefined,
            baseline: baseline || undefined,
            obstacles: obstacles || undefined,
            enjoyment: enjoyment || undefined,
            timeCommitment: timeCommitment
          }, session.access_token)
          
          // Store in context
          setField('timelineFeasibility', result)
          setField('originalEndDateForFeasibility', currentEndDate || 'No end date set')
          setTimelineFeasibilityAnalyzed(true)
          
          // Process results
          setAssessment(result.assessment)
          setSuggestedEndDate(result.suggestedEndDate)
          setReasoning(result.reasoning)
          
          // Set suggested end date if we don't have one yet
          if (!currentEndDate) {
            setCurrentEndDate(result.suggestedEndDate)
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
          setAssessment('Unable to analyze timeline automatically. Please set your preferred end date.')
          setSuggestedEndDate(defaultEndDate)
          setReasoning('Default 90-day timeline suggested.')
          
          if (!currentEndDate) {
            setCurrentEndDate(defaultEndDate)
            setField('end_date', defaultEndDate)
          }
          
          setTimeout(() => {
            setIsLoading(false)
          }, 1000)
        }
      }

      runAnalysis()
    }, [title, timeCommitment, currentStartDate, currentEndDate])
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
            color: '#000', 
            marginBottom: 16,
            lineHeight: 24
          }}>
            Analyzing Your Timeline
          </Text>
          
          {/* Description */}
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            textAlign: 'center',
            paddingHorizontal: 32,
            lineHeight: 22
          }}>
            We're calculating a realistic timeline based on your goal and daily time commitment
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
          Perfect Your Timeline
        </Text>

        {/* Timeline Assessment Section */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ 
            fontSize: 16, 
            color: '#000', 
            marginBottom: 16,
            fontWeight: '600'
          }}>
            Timeline Analysis
          </Text>
          
          {/* AI Analysis */}
          {assessment && (
            <Text style={{ 
              fontSize: 16, 
              color: '#000', 
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
            color: '#000', 
            marginBottom: 16,
            fontWeight: '600'
          }}>
            Set Your Dates
          </Text>
          
          {/* Start Date */}
          <Text style={{ 
            fontSize: 14, 
            color: '#666', 
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
            color: '#666', 
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
          style={{ borderRadius: theme.radius.xl }}
        />
      </View>
    </View>
  )
}