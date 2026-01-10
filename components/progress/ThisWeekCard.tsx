import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';

interface ThisWeekCardProps {
  actionsPlanned: number;
  actionsDone: number;
  actionsOverdue: number;
}

const ThisWeekCard: React.FC<ThisWeekCardProps> = ({
  actionsPlanned,
  actionsDone,
  actionsOverdue,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const StatItem = ({ value, label, multiline = false }: { value: number; label: string; multiline?: boolean }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statLabel, multiline && styles.multilineLabel]}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>This Week</Text>
      <View style={styles.statsContainer}>
        <StatItem value={actionsPlanned} label="Actions Planned" />
        <StatItem value={actionsDone} label="Actions Done" multiline />
        <StatItem value={actionsOverdue} label="Actions Overdue" />
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  multilineLabel: {
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default ThisWeekCard;
