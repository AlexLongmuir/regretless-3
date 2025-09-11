import React, { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { upsertDream } from '../../frontend-services/backend-bridge'
import { supabaseClient } from '../../lib/supabaseClient'
import { theme } from '../../utils/theme'

export default function DatesStep() {
  const navigation = useNavigation<any>()
  const { dreamId, title, start_date, end_date, image_url, setField } = useCreateDream()
  
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  
  const [startDate, setStartDate] = useState<Date>(
    start_date ? new Date(start_date) : new Date()
  )
  const [endDate, setEndDate] = useState<Date>(
    end_date ? new Date(end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  )

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleStartDateChange = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison
    
    // Don't allow dates in the past
    if (date < today) {
      return
    }
    
    setStartDate(date)
    setField('start_date', date.toISOString().split('T')[0])
    
    // If the new start date is after the current end date, update end date
    if (date >= endDate) {
      const newEndDate = new Date(date)
      newEndDate.setDate(newEndDate.getDate() + 1) // Set end date to day after start date
      setEndDate(newEndDate)
      setField('end_date', newEndDate.toISOString().split('T')[0])
    }
  }

  const handleEndDateChange = (date: Date) => {
    // Don't allow end date to be before or equal to start date
    if (date <= startDate) {
      return
    }
    
    setEndDate(date)
    setField('end_date', date.toISOString().split('T')[0])
  }

  const handleContinue = async () => {
    // Ensure context values are up to date with local state
    const currentStartDate = start_date || startDate.toISOString().split('T')[0]
    const currentEndDate = end_date || endDate.toISOString().split('T')[0]
    
    // Update context with current local state if not already set
    if (!start_date) {
      setField('start_date', currentStartDate)
    }
    if (!end_date) {
      setField('end_date', currentEndDate)
    }

    // Navigate immediately for smooth UX
    navigation.navigate('Questions')

    // Handle backend operations in background
    if (dreamId) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.access_token) {
          await upsertDream({
            id: dreamId,
            title,
            start_date: currentStartDate,
            end_date: currentEndDate,
            image_url
          }, session.access_token)
        }
      } catch (error) {
        console.error('Failed to save dream:', error)
      }
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}>
      <CreateScreenHeader step="dates" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#000', 
          marginBottom: 32,
          lineHeight: 24
        }}>
          When will your dream begin and end?
        </Text>

        {/* Start Date Selection */}
        <Input
          type="date"
          value={formatDate(startDate)}
          onDateChange={handleStartDateChange}
          onToggleDatePicker={() => setShowStartPicker(!showStartPicker)}
          showDatePicker={showStartPicker}
          label="Start Date"
          placeholder="Select start date"
          variant="borderless"
          minimumDate={new Date()} // Today is the minimum date
          style={{ marginBottom: 24 }}
        />

        {/* End Date Selection */}
        <Input
          type="date"
          value={formatDate(endDate)}
          onDateChange={handleEndDateChange}
          onToggleDatePicker={() => setShowEndPicker(!showEndPicker)}
          showDatePicker={showEndPicker}
          label="End Date"
          placeholder="Select end date"
          variant="borderless"
          minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)} // Day after start date
          style={{ marginBottom: 32 }}
        />
      </ScrollView>
      
      {/* Sticky bottom button */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16,
        paddingBottom: 32
      }}>
        <Button 
          title="Continue"
          variant={"black" as any}
          onPress={handleContinue}
        />
      </View>
    </View>
  )
}
