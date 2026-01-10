import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';

interface DayStreakCardProps {
  streakCount: number;
  weeklyProgress: {
    monday: 'active' | 'current' | 'missed' | 'future';
    tuesday: 'active' | 'current' | 'missed' | 'future';
    wednesday: 'active' | 'current' | 'missed' | 'future';
    thursday: 'active' | 'current' | 'missed' | 'future';
    friday: 'active' | 'current' | 'missed' | 'future';
    saturday: 'active' | 'current' | 'missed' | 'future';
    sunday: 'active' | 'current' | 'missed' | 'future';
  };
}

const DayStreakCard: React.FC<DayStreakCardProps> = ({ 
  streakCount, 
  weeklyProgress 
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const getDayStyle = (status: 'active' | 'current' | 'missed' | 'future') => {
    switch (status) {
      case 'active':
        return [styles.dayCircle, styles.activeDay];
      case 'current':
        return [styles.dayCircle, styles.currentDay];
      case 'missed':
        return [styles.dayCircle, styles.missedDay];
      case 'future':
        return [styles.dayCircle, styles.futureDay];
      default:
        return [styles.dayCircle, styles.futureDay];
    }
  };

  const getDayLabel = (day: string) => day.charAt(0).toUpperCase();
  
  const getDayTextStyle = (status: 'active' | 'current' | 'missed' | 'future') => {
    switch (status) {
      case 'active':
        return styles.activeDayText;
      case 'current':
        return styles.currentDayText;
      case 'missed':
        return styles.missedDayText;
      case 'future':
        return styles.futureDayText;
      default:
        return styles.futureDayText;
    }
  };

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
          <Text style={getDayTextStyle(weeklyProgress.monday)}>{getDayLabel('monday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.tuesday)}>
          <Text style={getDayTextStyle(weeklyProgress.tuesday)}>{getDayLabel('tuesday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.wednesday)}>
          <Text style={getDayTextStyle(weeklyProgress.wednesday)}>{getDayLabel('wednesday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.thursday)}>
          <Text style={getDayTextStyle(weeklyProgress.thursday)}>{getDayLabel('thursday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.friday)}>
          <Text style={getDayTextStyle(weeklyProgress.friday)}>{getDayLabel('friday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.saturday)}>
          <Text style={getDayTextStyle(weeklyProgress.saturday)}>{getDayLabel('saturday')}</Text>
        </View>
        <View style={getDayStyle(weeklyProgress.sunday)}>
          <Text style={getDayTextStyle(weeklyProgress.sunday)}>{getDayLabel('sunday')}</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.card,
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
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  streakLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
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
    borderColor: theme.colors.border.default,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  missedDay: {
    backgroundColor: 'transparent',
  },
  futureDay: {
    backgroundColor: theme.colors.background.input || '#E0E0E0', // Use input background (dark in dark mode, light in light mode)
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  activeDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.inverse, // White text on warning background
  },
  currentDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  missedDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.tertiary,
  },
  futureDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
});

export default DayStreakCard;
