import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { theme } from '../utils/theme';
import { IconButton } from './IconButton';

interface TimeSlot {
  start: string;
  end: string;
}

interface Schedule {
  id: string;
  name: string;
  days: string[];
  timeSlots: TimeSlot[];
}

interface ScheduleSelectorProps {
  schedules: Schedule[];
  onSchedulesChange: (schedules: Schedule[]) => void;
  maxSchedules?: number;
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_GRID_HOURS = [
  ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00'],
  ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00'],
  ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
  ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
];

export const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({
  schedules,
  onSchedulesChange,
  maxSchedules = 3,
}) => {
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, TimeSlot[]>>({});
  
  console.log('ScheduleSelector rendered with schedules:', schedules);

  const formatTimeSlots = (timeSlots: TimeSlot[]): string => {
    if (timeSlots.length === 0) {
      return 'No time selected';
    }
    
    return timeSlots.map(slot => `${slot.start}-${slot.end}`).join(', ');
  };

  const isTimeSlotSelected = (scheduleId: string, startTime: string, endTime: string): boolean => {
    const slots = selectedTimeSlots[scheduleId] || [];
    return slots.some(slot => slot.start === startTime && slot.end === endTime);
  };

  const toggleTimeSlot = (scheduleId: string, startTime: string, endTime: string) => {
    const currentSlots = selectedTimeSlots[scheduleId] || [];
    const isSelected = isTimeSlotSelected(scheduleId, startTime, endTime);
    
    let newSlots: TimeSlot[];
    if (isSelected) {
      newSlots = currentSlots.filter(slot => !(slot.start === startTime && slot.end === endTime));
    } else {
      newSlots = [...currentSlots, { start: startTime, end: endTime }];
    }
    
    setSelectedTimeSlots(prev => ({
      ...prev,
      [scheduleId]: newSlots,
    }));
    
    // Update the schedule in the schedules array
    const updatedSchedules = schedules.map(schedule => 
      schedule.id === scheduleId 
        ? { ...schedule, timeSlots: newSlots }
        : schedule
    );
    onSchedulesChange(updatedSchedules);
  };

  const toggleDay = (scheduleId: string, dayIndex: number) => {
    const dayName = DAY_NAMES[dayIndex];
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const isSelected = schedule.days.includes(dayName);
    let newDays: string[];
    
    if (isSelected) {
      newDays = schedule.days.filter(day => day !== dayName);
    } else {
      newDays = [...schedule.days, dayName];
    }

    const updatedSchedules = schedules.map(s => 
      s.id === scheduleId 
        ? { ...s, days: newDays }
        : s
    );
    onSchedulesChange(updatedSchedules);
  };

  const addSchedule = () => {
    if (schedules.length >= maxSchedules) return;
    
    const newSchedule: Schedule = {
      id: Date.now().toString(),
      name: `Schedule ${schedules.length + 1}`,
      days: [],
      timeSlots: [],
    };
    
    setSelectedTimeSlots(prev => ({
      ...prev,
      [newSchedule.id]: [],
    }));
    
    onSchedulesChange([...schedules, newSchedule]);
  };

  const deleteSchedule = (scheduleId: string) => {
    const updatedSchedules = schedules.filter(s => s.id !== scheduleId);
    const updatedTimeSlots = { ...selectedTimeSlots };
    delete updatedTimeSlots[scheduleId];
    
    setSelectedTimeSlots(updatedTimeSlots);
    onSchedulesChange(updatedSchedules);
  };

  const collapseSchedule = (scheduleId: string) => {
    // For now, just a placeholder - could implement actual collapse functionality
  };

  const getTimeSlotEndTime = (startTime: string): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHour = (hours + 1) % 24;
    return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.debugText}>ScheduleSelector is rendering with {schedules.length} schedules</Text>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {schedules.map((schedule) => (
        <View key={schedule.id} style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleTitle}>{schedule.name}</Text>
              <Text style={styles.scheduleSubtitle}>
                {formatTimeSlots(selectedTimeSlots[schedule.id] || [])}
              </Text>
            </View>
            <View style={styles.scheduleActions}>
              <IconButton
                icon="delete"
                onPress={() => deleteSchedule(schedule.id)}
                variant="ghost"
                size="sm"
              />
              <IconButton
                icon="expand_less"
                onPress={() => collapseSchedule(schedule.id)}
                variant="ghost"
                size="sm"
              />
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Days</Text>
            <View style={styles.daysContainer}>
              {DAYS.map((day, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.dayButton,
                    schedule.days.includes(DAY_NAMES[index]) && styles.dayButtonSelected,
                  ]}
                  onPress={() => toggleDay(schedule.id, index)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      schedule.days.includes(DAY_NAMES[index]) && styles.dayButtonTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Time</Text>
            <View style={styles.timeGrid}>
              {TIME_GRID_HOURS.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.timeRow}>
                  <Text style={styles.timeLabel}>
                    {row[0]}
                  </Text>
                  <View style={styles.timeSlots}>
                    {row.map((time, timeIndex) => {
                      const endTime = getTimeSlotEndTime(time);
                      const isSelected = isTimeSlotSelected(schedule.id, time, endTime);
                      
                      return (
                        <Pressable
                          key={timeIndex}
                          style={[
                            styles.timeSlot,
                            isSelected && styles.timeSlotSelected,
                          ]}
                          onPress={() => toggleTimeSlot(schedule.id, time, endTime)}
                        >
                          {isSelected && (
                            <View style={styles.selectedTimeSlotContent}>
                              <Text style={styles.selectedTimeText}>
                                {time}
                              </Text>
                              <Text style={styles.selectedTimeText}>
                                {endTime}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.timeLabel}>
                    {row[row.length - 1] === '23:00' ? '00:00' : getTimeSlotEndTime(row[row.length - 1])}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}

      {schedules.length < maxSchedules && (
        <Pressable style={styles.addScheduleButton} onPress={addSchedule}>
          <Text style={styles.addScheduleText}>+ Add Another Schedule</Text>
        </Pressable>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
  },
  debugText: {
    fontSize: 16,
    color: 'red',
    padding: 10,
    textAlign: 'center',
  },
  scrollContainer: {
    maxHeight: 350,
  },
  scheduleCard: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: theme.colors.grey[600],
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  sectionContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.sm,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.grey[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: theme.colors.primary[600],
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.grey[700],
  },
  dayButtonTextSelected: {
    color: theme.colors.surface[100],
  },
  timeGrid: {
    gap: theme.spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.grey[900],
    width: 50,
    textAlign: 'center',
  },
  timeSlots: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.grey[200],
    borderRadius: theme.radius.sm,
    height: 60,
  },
  timeSlot: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: theme.radius.sm,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: theme.colors.primary[600],
  },
  selectedTimeSlotContent: {
    alignItems: 'center',
  },
  selectedTimeText: {
    color: theme.colors.surface[100],
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 14,
  },
  addScheduleButton: {
    borderWidth: 2,
    borderColor: theme.colors.grey[300],
    borderStyle: 'dashed',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  addScheduleText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.grey[600],
  },
});