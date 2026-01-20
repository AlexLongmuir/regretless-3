import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Platform, StyleSheet } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useCreateDream } from '../../contexts/CreateDreamContext'
import { CreateScreenHeader } from '../../components/create/CreateScreenHeader'
import { Button } from '../../components/Button'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../utils/theme'
import { BOTTOM_NAV_PADDING } from '../../utils/bottomNavigation'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

export default function TimeCommitmentStep() {
  const { theme, isDark } = useTheme()
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark])
  const navigation = useNavigation<any>()
  const { 
    timeCommitment, 
    setField 
  } = useCreateDream()
  
  const [selectedTime, setSelectedTime] = useState(() => {
    // Initialize with context value or default to 30 minutes
    const defaultTime = { hours: 0, minutes: 30 }
    return timeCommitment || defaultTime
  })
  
  const [timePickerDate, setTimePickerDate] = useState(() => {
    const date = new Date()
    date.setHours(selectedTime.hours, selectedTime.minutes, 0, 0)
    return date
  })

  // Initialize from context when navigating back
  useFocusEffect(
    React.useCallback(() => {
      if (timeCommitment) {
        setSelectedTime(timeCommitment)
        const newDate = new Date()
        newDate.setHours(timeCommitment.hours, timeCommitment.minutes, 0, 0)
        setTimePickerDate(newDate)
      }
    }, [timeCommitment])
  )

  // Update time picker date when selectedTime changes
  useEffect(() => {
    const newDate = new Date()
    newDate.setHours(selectedTime.hours, selectedTime.minutes, 0, 0)
    setTimePickerDate(newDate)
  }, [selectedTime])

  // Save default time to context if not already set
  useEffect(() => {
    if (!timeCommitment) {
      const defaultTime = { hours: 0, minutes: 30 }
      setField('timeCommitment', defaultTime)
    }
  }, [timeCommitment, setField])

  const handleTimePickerChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTimePickerDate(selectedDate)
      const hours = selectedDate.getHours()
      const minutes = selectedDate.getMinutes()
      const newTime = { hours, minutes }
      setSelectedTime(newTime)
      setField('timeCommitment', newTime)
    }
  }


  const handleContinue = () => {
    // Navigate to the next step (TimelineFeasibility)
    navigation.navigate('TimelineFeasibility')
  }

  const formatTime = (hours: number, minutes: number) => {
    if (hours === 0) {
      return `${minutes} min`
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      return `${hours}h ${minutes}m`
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CreateScreenHeader step="time-commitment" />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.title}>
            On average, how much time are you willing to spend a day working towards this dream?
          </Text>

        {/* Time Picker Display */}
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>
            {formatTime(selectedTime.hours, selectedTime.minutes)}
          </Text>
        </View>

        {/* Time Picker */}
        {Platform.OS !== 'web' && (
          <View style={styles.timePickerContainer}>
            <DateTimePicker
              value={timePickerDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimePickerChange}
              style={styles.timePicker}
              themeVariant={'dark'}
              minimumDate={(() => {
                const minDate = new Date()
                minDate.setHours(0, 10, 0, 0) // Minimum 10 minutes
                return minDate
              })()}
              maximumDate={(() => {
                const maxDate = new Date()
                maxDate.setHours(23, 59, 0, 0) // Maximum 23 hours 59 minutes
                return maxDate
              })()}
              is24Hour={true}
              minuteInterval={1}
            />
          </View>
        )}

          <Text style={styles.helpText}>
            This helps us create a realistic action plan that fits your schedule.
          </Text>
        </ScrollView>
        
        {/* Footer with button */}
        <View style={styles.footer}>
          <Button 
            title="Continue"
            variant="inverse"
            onPress={handleContinue}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    </View>
  )
}

const createStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? theme.colors.text.primary : theme.colors.text.inverse,
    marginBottom: theme.spacing.sm,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? theme.colors.text.primary : theme.colors.text.inverse,
  },
  timePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timePicker: {
    height: 200,
  },
  helpText: {
    fontSize: 14,
    color: isDark ? theme.colors.text.secondary : theme.colors.text.inverse,
    opacity: isDark ? 1 : 0.85,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
})
