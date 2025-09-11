import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../utils/theme';

type TimePeriod = 'Week' | 'Month' | 'Year' | 'All Time';

interface HistorySectionProps {
  actionsComplete: number;
  activeDays: number;
  actionsOverdue: number;
  onTimePeriodChange?: (period: TimePeriod) => void;
  selectedPeriod?: TimePeriod;
}

const HistorySection: React.FC<HistorySectionProps> = ({
  actionsComplete,
  activeDays,
  actionsOverdue,
  onTimePeriodChange,
  selectedPeriod = 'Week',
}) => {

  const timePeriods: TimePeriod[] = ['Week', 'Month', 'Year', 'All Time'];

  const handlePeriodSelect = (period: TimePeriod) => {
    onTimePeriodChange?.(period);
  };

  const StatItem = ({ value, label, multiline = false }: { value: number; label: string; multiline?: boolean }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statLabel, multiline && styles.multilineLabel]}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      
      <View style={styles.periodSelector}>
        {timePeriods.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.selectedPeriodButton,
            ]}
            onPress={() => handlePeriodSelect(period)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.selectedPeriodButtonText,
              ]}
            >
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.statsContainer}>
        <StatItem value={actionsComplete} label="Actions Complete" />
        <StatItem value={activeDays} label="Active Days" multiline />
        <StatItem value={actionsOverdue} label="Actions Overdue" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.grey[100],
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: theme.colors.surface[50],
    shadowColor: theme.colors.grey[900],
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    color: theme.colors.grey[600],
    fontWeight: '500',
  },
  selectedPeriodButtonText: {
    color: theme.colors.grey[900],
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.grey[600],
    textAlign: 'center',
    fontWeight: '500',
  },
  multilineLabel: {
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default HistorySection;
