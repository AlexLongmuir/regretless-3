import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

interface DayStreakCardProps {
  streakCount: number;
  weeklyProgress: {
    monday: 'active' | 'current' | 'inactive';
    tuesday: 'active' | 'current' | 'inactive';
    wednesday: 'active' | 'current' | 'inactive';
    thursday: 'active' | 'current' | 'inactive';
    friday: 'active' | 'current' | 'inactive';
    saturday: 'active' | 'current' | 'inactive';
    sunday: 'active' | 'current' | 'inactive';
  };
}

const DayStreakCard: React.FC<DayStreakCardProps> = ({ 
  streakCount, 
  weeklyProgress 
}) => {
  const getDayStyle = (status: 'active' | 'current' | 'inactive') => {
    switch (status) {
      case 'active':
        return [styles.dayCircle, styles.activeDay];
      case 'current':
        return [styles.dayCircle, styles.currentDay];
      case 'inactive':
        return [styles.dayCircle, styles.inactiveDay];
      default:
        return [styles.dayCircle, styles.inactiveDay];
    }
  };

  const getDayLabel = (day: string) => day.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.streakSection}>
        <View style={styles.flameContainer}>
          <Text style={styles.flameIcon}>🔥</Text>
        </View>
        <Text style={styles.streakNumber}>{streakCount}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
      </View>
      
      <View style={styles.weeklyProgress}>
        <View style={getDayStyle(weeklyProgress.monday)}>
          <Text style={styles.dayText}>{getDayLabel('monday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.tuesday)}>
          <Text style={styles.dayText}>{getDayLabel('tuesday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.wednesday)}>
          <Text style={styles.dayText}>{getDayLabel('wednesday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.thursday)}>
          <Text style={styles.dayText}>{getDayLabel('thursday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.friday)}>
          <Text style={styles.dayText}>{getDayLabel('friday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.saturday)}>
          <Text style={styles.dayText}>{getDayLabel('saturday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.sunday)}>
          <Text style={styles.dayText}>{getDayLabel('sunday')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  streakSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  flameContainer: {
    marginBottom: theme.spacing.sm,
  },
  flameIcon: {
    fontSize: 32,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  streakLabel: {
    fontSize: 16,
    color: theme.colors.grey[600],
    fontWeight: '500',
  },
  weeklyProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: theme.spacing.sm,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDay: {
    backgroundColor: theme.colors.warning[500],
  },
  currentDay: {
    borderWidth: 2,
    borderColor: theme.colors.grey[400],
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  inactiveDay: {
    backgroundColor: theme.colors.grey[200],
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.grey[700],
  },
});

export default DayStreakCard;
