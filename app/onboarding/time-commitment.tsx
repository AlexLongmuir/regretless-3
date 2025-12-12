/**
 * Time Commitment Step - Time picker screen for daily commitment
 * 
 * Allows user to select how much time they want to spend daily
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { OnboardingHeader } from '../../components/onboarding';
import { Button } from '../../components/Button';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { trackEvent } from '../../lib/mixpanel';

// Helper function to parse time string (e.g., "1h 30m", "30 min", "2 hours")
const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
  if (!timeStr) return { hours: 0, minutes: 30 };
  
  let hours = 0;
  let minutes = 30; // default
  
  // Match patterns like "1h 30m", "2h", "30m", "2 hours", "30 min"
  const hourMatch = timeStr.match(/(\d+)\s*h(?:our)?s?/i);
  const minuteMatch = timeStr.match(/(\d+)\s*m(?:in)?s?/i);
  
  if (hourMatch) {
    hours = parseInt(hourMatch[1], 10);
  }
  if (minuteMatch) {
    minutes = parseInt(minuteMatch[1], 10);
  }
  
  // If only minutes found and no hours, use minutes
  if (!hourMatch && minuteMatch) {
    hours = 0;
    minutes = parseInt(minuteMatch[1], 10);
  }
  
  return { hours, minutes };
};

const TimeCommitmentStep: React.FC = () => {
  const navigation = useNavigation();
  const { state, updateAnswer } = useOnboardingContext();
  
  // Initialize from context
  const savedTimeStr = state.answers[3] || '';
  const initialTime = savedTimeStr ? parseTimeString(savedTimeStr) : { hours: 0, minutes: 30 };
  
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [timePickerDate, setTimePickerDate] = useState(() => {
    const date = new Date();
    date.setHours(initialTime.hours, initialTime.minutes, 0, 0);
    return date;
  });

  // Initialize from context when component mounts or when navigating back
  useFocusEffect(
    React.useCallback(() => {
      const answer = state.answers[3] || '';
      if (answer) {
        const parsedTime = parseTimeString(answer);
        setSelectedTime(parsedTime);
        const newDate = new Date();
        newDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
        setTimePickerDate(newDate);
      }
    }, [state.answers[3]])
  );

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'time_commitment'
      });
    }, [])
  );


  const handleTimePickerChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTimePickerDate(selectedDate);
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      setSelectedTime({ hours, minutes });
      updateAnswer(3, `${hours}h ${minutes}m`);
    }
  };

  // Update time picker date when selectedTime changes
  React.useEffect(() => {
    const newDate = new Date();
    newDate.setHours(selectedTime.hours, selectedTime.minutes, 0, 0);
    setTimePickerDate(newDate);
  }, [selectedTime]);

  const handleContinue = () => {
    navigation.navigate('CurrentProgress' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatTime = (hours: number, minutes: number) => {
    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        onBack={handleBack}
        showProgress={true}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>On average, how much time are you willing to spend a day working towards this dream?</Text>
        
        {/* Time Picker Display */}
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>
            {formatTime(selectedTime.hours, selectedTime.minutes)}
          </Text>
        </View>

        {/* iOS Time Picker */}
        {Platform.OS !== 'web' && (
          <View style={styles.timePickerContainer}>
            <DateTimePicker
              value={timePickerDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimePickerChange}
              style={styles.timePicker}
              minimumDate={(() => {
                const minDate = new Date();
                minDate.setHours(0, 10, 0, 0);
                return minDate;
              })()}
              maximumDate={(() => {
                const maxDate = new Date();
                maxDate.setHours(23, 59, 0, 0);
                return maxDate;
              })()}
              is24Hour={true}
              minuteInterval={1}
            />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="black"
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginBottom: theme.spacing['2xl'],
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  timeText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 32,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
  },
  timePickerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  timePicker: {
    width: '100%',
    height: 200,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});

export default TimeCommitmentStep;
