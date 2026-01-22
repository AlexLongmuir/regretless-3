import React, { useState, useEffect, useRef, useMemo } from 'react'
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TextInput, Platform, TouchableOpacity } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { runTimelineFeasibility, upsertDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'

export default function TimelineFeasibilityStep() {
  const { theme, isDark } = useTheme()
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
  const [selectedDays, setSelectedDays] = useState<number>(90)
  const [daysInputText, setDaysInputText] = useState<string>('90')
  const [isUpdatingFromDays, setIsUpdatingFromDays] = useState(false)
  const daysInputRef = useRef<TextInput>(null)

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

  // Helper to calculate days between two dates (inclusive - both start and end dates count)
  const calculateDaysBetween = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Add 1 to make it inclusive
    return Math.max(1, diffDays) // Ensure at least 1 day
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

        let initEndDate = end_date
        if (initEndDate) {
          setCurrentEndDate(initEndDate)
        } else if (timelineFeasibility.suggestedEndDate) {
          initEndDate = timelineFeasibility.suggestedEndDate
          setCurrentEndDate(initEndDate)
        }

        // Initialize days count
        if (start_date && initEndDate) {
          const days = calculateDaysBetween(start_date, initEndDate)
          setSelectedDays(days)
          setDaysInputText(days.toString())
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
          
          // Update days count based on AI's suggested end date
          if (startDate && result.suggestedEndDate) {
            const days = calculateDaysBetween(startDate, result.suggestedEndDate)
            setSelectedDays(days)
            setDaysInputText(days.toString())
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
          
          // Update days count for default end date
          if (startDate && defaultEndDate) {
            const days = calculateDaysBetween(startDate, defaultEndDate)
            setSelectedDays(days)
            setDaysInputText(days.toString())
          }
          
          setTimeout(() => {
            setIsLoading(false)
          }, 1000)
        }
      }

      runAnalysis()
    }, [title, timeCommitment, start_date, baseline, obstacles, enjoyment, timelineFeasibility, timelineFeasibilityAnalyzed, originalTimeCommitmentForFeasibility, setField, setTimelineFeasibilityAnalyzed])
  )

  const getStartDateValue = (): Date => {
    if (currentStartDate) {
      const date = new Date(currentStartDate)
      date.setHours(0, 0, 0, 0)
      return date
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  const getEndDateValue = (): Date => {
    if (currentEndDate) {
      const date = new Date(currentEndDate)
      date.setHours(0, 0, 0, 0)
      return date
    }
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 90)
    defaultDate.setHours(0, 0, 0, 0)
    return defaultDate
  }

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false)
    }

    if (event.type === 'set' && selectedDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      selectedDate.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        return
      }
      
      const dateString = selectedDate.toISOString().split('T')[0]
      setCurrentStartDate(dateString)
      setField('start_date', dateString)
      
      if (currentEndDate && selectedDate >= new Date(currentEndDate)) {
        const newEndDate = new Date(selectedDate)
        newEndDate.setDate(newEndDate.getDate() + 1)
        const newEndDateString = newEndDate.toISOString().split('T')[0]
        setCurrentEndDate(newEndDateString)
        setField('end_date', newEndDateString)
        if (!isUpdatingFromDays) {
          const newDays = calculateDaysBetween(dateString, newEndDateString)
          setSelectedDays(newDays)
          setDaysInputText(newDays.toString())
        }
      } else if (currentEndDate && !isUpdatingFromDays) {
        const newDays = calculateDaysBetween(dateString, currentEndDate)
        setSelectedDays(newDays)
        setDaysInputText(newDays.toString())
      }
    }
  }

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false)
    }

    if (event.type === 'set' && selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0]
      
      if (currentStartDate && selectedDate <= new Date(currentStartDate)) {
        return
      }
      
      setCurrentEndDate(dateString)
      setField('end_date', dateString)
      
      if (!isUpdatingFromDays && currentStartDate) {
        const newDays = calculateDaysBetween(currentStartDate, dateString)
        setSelectedDays(newDays)
        setDaysInputText(newDays.toString())
      }
    }
  }

  // Handle days input change - update end date accordingly
  const handleDaysInputChange = (text: string) => {
    setDaysInputText(text)
    
    // Only update if it's a valid number
    const numValue = parseInt(text, 10)
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 730) {
      handleDaysChange(numValue)
    }
  }

  // Handle days change - update end date accordingly
  const handleDaysChange = (days: number) => {
    if (!currentStartDate || days < 1) return
    
    setIsUpdatingFromDays(true)
    setSelectedDays(days)
    setDaysInputText(days.toString())
    
    // Calculate new end date = start date + (days - 1) to make it inclusive
    const startDate = new Date(currentStartDate)
    const newEndDate = new Date(startDate)
    newEndDate.setDate(newEndDate.getDate() + days - 1)
    const newEndDateString = newEndDate.toISOString().split('T')[0]
    
    setCurrentEndDate(newEndDateString)
    setField('end_date', newEndDateString)
    
    setTimeout(() => {
      setIsUpdatingFromDays(false)
    }, 100)
  }

  // Handle days input blur - validate and fix if needed
  const handleDaysInputBlur = () => {
    const numValue = parseInt(daysInputText, 10)
    if (isNaN(numValue) || numValue < 1) {
      setDaysInputText(selectedDays.toString())
    } else if (numValue > 730) {
      handleDaysChange(730)
    } else if (numValue !== selectedDays) {
      handleDaysChange(numValue)
    }
  }

  // Update selectedDays when dates are initialized or changed externally
  useEffect(() => {
    if (currentStartDate && currentEndDate && !isUpdatingFromDays) {
      const calculatedDays = calculateDaysBetween(currentStartDate, currentEndDate)
      if (calculatedDays !== selectedDays && calculatedDays >= 1 && calculatedDays <= 730) {
        setSelectedDays(calculatedDays)
        setDaysInputText(calculatedDays.toString())
      }
    }
  }, [currentStartDate, currentEndDate, isUpdatingFromDays])

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
      <View style={{ flex: 1, backgroundColor: theme.colors.background.page, justifyContent: 'center', alignItems: 'center' }}>
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background.page }}>
      <CreateScreenHeader step="feasibility" />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: theme.spacing['4xl'] }}>
        {/* Page Title */}
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: theme.colors.text.primary, 
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

        {/* Complete In Section - Separate Card */}
        {currentStartDate && currentEndDate && (
          <View style={{ marginBottom: 16 }}>
            <View style={styles.cardContainer}>
              <View style={[styles.rowContainer, styles.rowFirst, styles.rowLast]}>
                <Text style={styles.rowLabel}>Complete in</Text>
                <View style={styles.rowInputContainer}>
                  <TouchableOpacity 
                    style={styles.daysInputWrapper}
                    onPress={() => daysInputRef.current?.focus()}
                    activeOpacity={1}
                  >
                    <TextInput
                      ref={daysInputRef}
                      value={daysInputText}
                      onChangeText={handleDaysInputChange}
                      onBlur={handleDaysInputBlur}
                      keyboardType="numeric"
                      style={styles.daysInput}
                      maxLength={3}
                      editable={true}
                    />
                    <Text style={styles.daysSuffix}>{selectedDays === 1 ? 'day' : 'days'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Date Selection Section */}
        <View style={{ marginBottom: 32 }}>
          <View style={styles.cardContainer}>
            {/* Start Date Row */}
            <View style={[styles.rowContainer, styles.rowFirst]}>
              <Text style={styles.rowLabel}>Start date</Text>
              <View style={styles.rowInputContainer}>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={getStartDateValue()}
                    mode="date"
                    display="compact"
                    onChange={handleStartDateChange}
                    minimumDate={new Date()}
                    style={styles.datePickerCompact}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.dateInputContainer}
                    onPress={() => setShowStartDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateInputText}>
                      {formatDate(currentStartDate)}
                    </Text>
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={getStartDateValue()}
                        mode="date"
                        display="default"
                        onChange={handleStartDateChange}
                        minimumDate={new Date()}
                        themeVariant={isDark ? 'dark' : 'light'}
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* End Date Row */}
            <View style={[styles.rowContainer, styles.rowLast]}>
              <Text style={styles.rowLabel}>End date</Text>
              <View style={styles.rowInputContainer}>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={getEndDateValue()}
                    mode="date"
                    display="compact"
                    onChange={handleEndDateChange}
                    minimumDate={currentStartDate ? new Date(currentStartDate) : new Date()}
                    style={styles.datePickerCompact}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.dateInputContainer}
                    onPress={() => setShowEndDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateInputText}>
                      {formatDate(currentEndDate)}
                    </Text>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={getEndDateValue()}
                        mode="date"
                        display="default"
                        onChange={handleEndDateChange}
                        minimumDate={currentStartDate ? new Date(currentStartDate) : new Date()}
                        themeVariant={isDark ? 'dark' : 'light'}
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
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
  cardContainer: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 20,
    overflow: 'hidden',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowFirst: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  rowLast: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  divider: {
    height: 0.5,
    backgroundColor: theme.colors.border.default,
    marginLeft: 16,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    flex: 0,
    minWidth: 100,
  },
  rowInputContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  datePickerCompact: {
    width: 120,
  },
  dateInputContainer: {
    backgroundColor: theme.colors.background.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  daysInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.input,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
  },
  daysInput: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    minWidth: 40,
    textAlign: 'right',
    padding: 0,
  },
  daysSuffix: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
})