import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../utils/theme';

interface TimeBlock {
  hour: number;
  selected: boolean;
}

interface DaySchedule {
  day: string;
  selected: boolean;
  timeBlocks: TimeBlock[];
}

interface SchedulePickerProps {
  onScheduleChange: (schedule: DaySchedule[]) => void;
  initialSchedule?: DaySchedule[];
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const createInitialSchedule = (): DaySchedule[] => {
  return DAYS_OF_WEEK.map(day => ({
    day,
    selected: false,
    timeBlocks: HOURS.map(hour => ({
      hour,
      selected: false,
    })),
  }));
};

export const SchedulePicker: React.FC<SchedulePickerProps> = ({
  onScheduleChange,
  initialSchedule,
}) => {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    initialSchedule || createInitialSchedule()
  );

  const toggleDay = (dayIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].selected = !newSchedule[dayIndex].selected;
    
    // If deselecting the day, clear all time blocks
    if (!newSchedule[dayIndex].selected) {
      newSchedule[dayIndex].timeBlocks = newSchedule[dayIndex].timeBlocks.map(block => ({
        ...block,
        selected: false,
      }));
    }
    
    setSchedule(newSchedule);
    onScheduleChange(newSchedule);
  };

  const toggleTimeBlock = (dayIndex: number, hourIndex: number) => {
    const newSchedule = [...schedule];
    
    // If the day isn't selected, select it first
    if (!newSchedule[dayIndex].selected) {
      newSchedule[dayIndex].selected = true;
    }
    
    newSchedule[dayIndex].timeBlocks[hourIndex].selected = 
      !newSchedule[dayIndex].timeBlocks[hourIndex].selected;
    
    // If all time blocks are deselected, deselect the day
    const hasSelectedBlocks = newSchedule[dayIndex].timeBlocks.some(block => block.selected);
    if (!hasSelectedBlocks) {
      newSchedule[dayIndex].selected = false;
    }
    
    setSchedule(newSchedule);
    onScheduleChange(newSchedule);
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12AM';
    if (hour < 12) return `${hour}AM`;
    if (hour === 12) return '12PM';
    return `${hour - 12}PM`;
  };

  const getSelectedTimeRange = (daySchedule: DaySchedule) => {
    const selectedHours = daySchedule.timeBlocks
      .filter(block => block.selected)
      .map(block => block.hour);
    
    if (selectedHours.length === 0) return null;
    
    const minHour = Math.min(...selectedHours);
    const maxHour = Math.max(...selectedHours);
    
    if (minHour === maxHour) {
      return `${formatHour(minHour)}`;
    }
    
    return `${formatHour(minHour)} - ${formatHour(maxHour + 1)}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Select your availability</Text>
      <Text style={styles.subtitle}>
        Choose the days and times when you'd like to work on your goal
      </Text>
      
      {schedule.map((daySchedule, dayIndex) => (
        <View key={daySchedule.day} style={styles.dayContainer}>
          <TouchableOpacity
            style={[
              styles.dayHeader,
              daySchedule.selected && styles.selectedDayHeader,
            ]}
            onPress={() => toggleDay(dayIndex)}
          >
            <Text style={[
              styles.dayHeaderText,
              daySchedule.selected && styles.selectedDayHeaderText,
            ]}>
              {daySchedule.day}
            </Text>
            
            {daySchedule.selected && getSelectedTimeRange(daySchedule) && (
              <Text style={styles.timeRangeText}>
                {getSelectedTimeRange(daySchedule)}
              </Text>
            )}
          </TouchableOpacity>
          
          {daySchedule.selected && (
            <View style={styles.timeBlocksContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeBlocksContent}
              >
                {daySchedule.timeBlocks.map((timeBlock, hourIndex) => (
                  <TouchableOpacity
                    key={timeBlock.hour}
                    style={[
                      styles.timeBlock,
                      timeBlock.selected && styles.selectedTimeBlock,
                    ]}
                    onPress={() => toggleTimeBlock(dayIndex, hourIndex)}
                  >
                    <Text style={[
                      styles.timeBlockText,
                      timeBlock.selected && styles.selectedTimeBlockText,
                    ]}>
                      {formatHour(timeBlock.hour)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  dayContainer: {
    marginBottom: theme.spacing.md,
  },
  dayHeader: {
    backgroundColor: theme.colors.surface[200],
    borderRadius: 12,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDayHeader: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[500],
  },
  dayHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
  },
  selectedDayHeaderText: {
    color: theme.colors.primary[700],
  },
  timeRangeText: {
    fontSize: 14,
    color: theme.colors.primary[600],
    fontWeight: '500',
  },
  timeBlocksContainer: {
    marginTop: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
  },
  timeBlocksContent: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  timeBlock: {
    backgroundColor: theme.colors.grey[100],
    borderRadius: 8,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
  },
  selectedTimeBlock: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[600],
  },
  timeBlockText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.grey[700],
  },
  selectedTimeBlockText: {
    color: theme.colors.surface[100],
  },
});