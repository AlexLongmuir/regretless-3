import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Icon } from './Icon';
import { theme } from '../utils/theme';

interface Schedule {
  id: number;
  name: string;
  days: number[];
  timeBlocks: number[];
  expanded: boolean;
}

interface ScheduleSelectorProps {
  schedules: Schedule[];
  onScheduleChange: (schedules: Schedule[]) => void;
  disabled?: boolean;
}

const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({
  schedules,
  onScheduleChange,
  disabled = false,
}) => {
  const handleScheduleUpdate = (scheduleIndex: number, updates: Partial<Schedule>) => {
    const newSchedules = [...schedules];
    newSchedules[scheduleIndex] = { ...newSchedules[scheduleIndex], ...updates };
    onScheduleChange(newSchedules);
  };

  const handleDeleteSchedule = (scheduleId: number) => {
    if (disabled) return;
    
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newSchedules = schedules.filter(s => s.id !== scheduleId);
            onScheduleChange(newSchedules);
          },
        },
      ]
    );
  };

  const handleToggleExpanded = (scheduleIndex: number) => {
    if (disabled) return;
    const newSchedules = schedules.map((s, idx) => ({
      ...s,
      expanded: idx === scheduleIndex ? !s.expanded : false
    }));
    onScheduleChange(newSchedules);
  };

  const handleDayToggle = (scheduleIndex: number, dayIndex: number) => {
    if (disabled) return;
    const currentDays = schedules[scheduleIndex].days || [];
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter((d: number) => d !== dayIndex)
      : [...currentDays, dayIndex];
    
    handleScheduleUpdate(scheduleIndex, { days: newDays });
  };

  const handleTimeSlotToggle = (scheduleIndex: number, slotId: number) => {
    if (disabled) return;
    const currentBlocks = schedules[scheduleIndex].timeBlocks || [];
    const newBlocks = currentBlocks.includes(slotId)
      ? currentBlocks.filter((b: number) => b !== slotId)
      : [...currentBlocks, slotId];
    
    handleScheduleUpdate(scheduleIndex, { timeBlocks: newBlocks });
  };

  const addNewSchedule = () => {
    if (disabled) return;
    const newSchedule: Schedule = {
      id: Date.now(),
      name: `Schedule #${schedules.length + 1}`,
      days: [],
      timeBlocks: [],
      expanded: true
    };
    const newSchedules = schedules.map(s => ({ ...s, expanded: false }));
    newSchedules.push(newSchedule);
    onScheduleChange(newSchedules);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={true} 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        scrollEnabled={true}
      >
      {schedules.map((schedule, scheduleIndex) => {
        console.log(`Schedule ${scheduleIndex}:`, schedule);
        return (
        <View key={schedule.id} style={styles.scheduleCard}>
          {/* Schedule Header */}
          <View style={styles.scheduleHeader}>
            <View style={styles.scheduleHeaderLeft}>
              <Text style={styles.scheduleCardTitle}>Schedule #{scheduleIndex + 1}</Text>
            </View>
            <View style={styles.scheduleHeaderRight}>
              {schedules.length > 1 && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSchedule(schedule.id)}
                  disabled={disabled}
                >
                  <Icon name="delete_forever" size={18} color={theme.colors.error[500]} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => handleToggleExpanded(scheduleIndex)}
                disabled={disabled}
              >
                <Icon 
                  name="expand_less" 
                  size={20} 
                  color={theme.colors.grey[700]} 
                  style={schedule.expanded ? {} : { transform: [{ rotate: '180deg' }] }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Expanded Content */}
          {schedule.expanded && (
            <View style={styles.scheduleContent}>
              {/* Days Section */}
              <View style={styles.daysContainer}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => {
                  const isSelected = schedule.days?.includes(dayIndex) || false;
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[
                        styles.dayCircle,
                        isSelected && styles.selectedDayCircle,
                      ]}
                      onPress={() => handleDayToggle(scheduleIndex, dayIndex)}
                      disabled={disabled}
                    >
                      <Text style={[
                        styles.dayCircleText,
                        isSelected && styles.selectedDayCircleText,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time Section */}
              <View style={styles.timeGridContainer}>
                {[
                  { startHour: 0, endHour: 6 },
                  { startHour: 6, endHour: 12 },
                  { startHour: 12, endHour: 18 },
                  { startHour: 18, endHour: 24 },
                ].map((timeRange, rangeIndex) => (
                  <View key={rangeIndex} style={styles.timeRangeBlock}>
                    <View style={styles.timeRangeHeader}>
                      <Text style={styles.timeRangeStart}>
                        {timeRange.startHour.toString().padStart(2, '0')}:00
                      </Text>
                      <Text style={styles.timeRangeEnd}>
                        {timeRange.endHour === 24 ? '00:00' : timeRange.endHour.toString().padStart(2, '0') + ':00'}
                      </Text>
                    </View>
                    
                    <View style={styles.timeSlotsContainer}>
                      {Array.from({ length: (timeRange.endHour - timeRange.startHour) * 2 }, (_, index) => {
                        const hour = timeRange.startHour + Math.floor(index / 2);
                        const minute = (index % 2) * 30;
                        const slotId = hour * 2 + (minute / 30);
                        
                        return (
                          <TouchableOpacity
                            key={slotId}
                            style={styles.timeSlot}
                            onPress={() => handleTimeSlotToggle(scheduleIndex, slotId)}
                            disabled={disabled}
                            activeOpacity={0.7}
                          />
                        );
                      })}
                      
                      {/* Render selected time ranges as blue overlays */}
                      {schedule.timeBlocks && schedule.timeBlocks.length > 0 && (
                        <>
                          {(() => {
                            // Group consecutive slots into ranges
                            const sortedBlocks = [...schedule.timeBlocks].sort((a, b) => a - b);
                            const ranges = [];
                            let currentRange = [sortedBlocks[0]];
                            
                            for (let i = 1; i < sortedBlocks.length; i++) {
                              if (sortedBlocks[i] === sortedBlocks[i-1] + 1) {
                                currentRange.push(sortedBlocks[i]);
                              } else {
                                ranges.push(currentRange);
                                currentRange = [sortedBlocks[i]];
                              }
                            }
                            ranges.push(currentRange);
                            
                            return ranges.map((range, rangeIdx) => {
                              const startSlot = range[0];
                              const endSlot = range[range.length - 1];
                              
                              // Calculate position within this time range
                              const startHour = Math.floor(startSlot / 2);
                              const startMinute = (startSlot % 2) * 30;
                              const endHour = Math.floor(endSlot / 2);
                              const endMinute = (endSlot % 2) * 30 + 30;
                              
                              // Only show if in current time range
                              if (startHour < timeRange.startHour || startHour >= timeRange.endHour) {
                                return null;
                              }
                              
                              const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
                              const endTime = endMinute >= 60 ? 
                                `${(endHour + 1).toString().padStart(2, '0')}:${(endMinute - 60).toString().padStart(2, '0')}` :
                                `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                              
                              // Calculate position and size
                              const slotsInRange = (timeRange.endHour - timeRange.startHour) * 2;
                              const slotWidth = 100 / slotsInRange;
                              const startPosition = (startSlot - timeRange.startHour * 2) * slotWidth;
                              const width = range.length * slotWidth;
                              
                              return (
                                <View
                                  key={rangeIdx}
                                  style={[
                                    styles.selectedTimeRange,
                                    {
                                      left: `${startPosition}%`,
                                      width: `${width}%`,
                                    }
                                  ]}
                                  pointerEvents="none"
                                >
                                  {range.length === 1 ? (
                                    <Text style={styles.selectedSingleTimeRangeText}>
                                      {startTime}
                                      {'\n'}
                                      {endTime}
                                    </Text>
                                  ) : (
                                    <>
                                      <Text style={styles.selectedTimeRangeText}>
                                        {startTime}
                                      </Text>
                                      <Text style={styles.selectedTimeRangeText}>
                                        {endTime}
                                      </Text>
                                    </>
                                  )}
                                </View>
                              );
                            });
                          })()}
                        </>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
        );
      })}

      {/* Add Another Schedule Button */}
      <TouchableOpacity
        style={styles.addScheduleButton}
        onPress={addNewSchedule}
        disabled={disabled}
      >
        <Text style={styles.addScheduleButtonText}>+ Add Another Schedule</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Fill parent container
  },
  scrollView: {
    flex: 1,
    marginBottom: theme.spacing.sm,
  },
  scrollContent: {
    paddingBottom: theme.spacing.md,
  },
  scheduleCard: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
    overflow: 'hidden',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.grey[100],
  },
  scheduleHeaderLeft: {
    flex: 1,
  },
  scheduleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  scheduleCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
    marginBottom: 2,
  },
  scheduleCardSubtitle: {
    fontSize: 14,
    color: theme.colors.grey[600],
  },
  deleteButton: {
    padding: theme.spacing.xs,
  },
  expandButton: {
    padding: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleContent: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  dayCircle: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.grey[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  selectedDayCircle: {
    backgroundColor: theme.colors.primary[500],
  },
  dayCircleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.grey[700],
  },
  selectedDayCircleText: {
    color: theme.colors.surface[50],
  },
  timeGridContainer: {
    gap: theme.spacing.sm,
  },
  timeRangeBlock: {
    marginBottom: theme.spacing.sm,
  },
  timeRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  timeRangeStart: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.grey[700],
  },
  timeRangeEnd: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.grey[700],
  },
  timeSlotsContainer: {
    position: 'relative',
    height: 36,
    backgroundColor: theme.colors.grey[200],
    borderRadius: 8,
    flexDirection: 'row',
  },
  timeSlot: {
    flex: 1,
    height: '100%',
    backgroundColor: 'transparent',
  },
  selectedTimeRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  selectedTimeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.surface[50],
    textAlign: 'center',
  },
  selectedSingleTimeRangeText: {
    fontSize: 5,
    fontWeight: '400',
    color: theme.colors.surface[50],
    textAlign: 'center',
    lineHeight: 6,
  },
  addScheduleButton: {
    borderWidth: 2,
    borderColor: theme.colors.grey[300],
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surface[50],
    marginBottom: theme.spacing.md,
  },
  addScheduleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.grey[600],
  },
});

export default ScheduleSelector;