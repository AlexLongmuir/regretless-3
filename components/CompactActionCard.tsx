import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface CompactActionCardProps {
  id: string;
  title: string;
  status: 'todo' | 'done' | 'skipped';
  priority?: 'low' | 'medium' | 'high';
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  repeatInterval?: number;
  estimatedTime?: number;
  dueDate?: string;
  onPress: (id: string) => void;
  onStatusChange: (id: string, status: 'todo' | 'done' | 'skipped') => void;
}

export const CompactActionCard: React.FC<CompactActionCardProps> = ({
  id,
  title,
  status,
  priority = 'medium',
  frequency = 'once',
  repeatInterval,
  estimatedTime,
  dueDate,
  onPress,
  onStatusChange,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'done':
        return theme.colors.success[500];
      case 'skipped':
        return theme.colors.grey[400];
      case 'todo':
      default:
        return theme.colors.primary[600];
    }
  };

  const getFrequencyText = () => {
    if (frequency === 'once') return 'One time';
    if (frequency === 'daily') return 'Daily';
    if (frequency === 'weekly') {
      return repeatInterval ? `Every ${repeatInterval} week${repeatInterval > 1 ? 's' : ''}` : 'Weekly';
    }
    if (frequency === 'monthly') {
      return repeatInterval ? `Every ${repeatInterval} month${repeatInterval > 1 ? 's' : ''}` : 'Monthly';
    }
    return 'One time';
  };

  const formatEstimatedTime = () => {
    if (!estimatedTime) return null;
    if (estimatedTime < 60) return `${estimatedTime}min`;
    const hours = Math.floor(estimatedTime / 60);
    const minutes = estimatedTime % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  const formatDueDate = () => {
    if (!dueDate) return { day: '', month: '' };
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) return { day: '', month: '' };
    const day = date.getDate().toString();
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return { day, month };
  };

  return (
    <View style={[
      styles.cardContainer,
      status === 'done' && styles.doneContainer,
      status === 'skipped' && styles.skippedContainer,
    ]}>
      <Pressable
        style={styles.card}
        onPress={() => onPress(id)}
      >
        <View style={[
          styles.actionSection,
          status === 'done' && styles.doneActionSection
        ]}>
          {/* Date section on the left */}
          <View style={styles.dateContainer}>
            {dueDate ? (
              <>
                <Text style={styles.dueDateDay}>{formatDueDate().day}</Text>
                <Text style={styles.dueDateMonth}>{formatDueDate().month}</Text>
              </>
            ) : (
              <View style={styles.noDatePlaceholder}>
                <Icon name="event" size={24} color={status === 'done' ? theme.colors.surface[50] : theme.colors.grey[300]} />
              </View>
            )}
            {status === 'done' && (
              <View style={styles.checkOverlay}>
                <Icon name="check-circle" size={20} color={theme.colors.surface[50]} />
              </View>
            )}
          </View>
          
          {/* Action details on the right */}
          <View style={styles.actionDetailsSection}>
            <Text style={styles.actionTitle} numberOfLines={2}>
              {title}
            </Text>
            
            <View style={styles.metaContainer}>
              <View style={styles.frequencyContainer}>
                <Icon name="repeat" size={14} color={status === 'done' ? theme.colors.surface[50] : theme.colors.grey[300]} />
                <Text style={styles.frequencyText}>{getFrequencyText()}</Text>
              </View>
              
              <View style={styles.timeContainer}>
                <Icon name="schedule" size={14} color={status === 'done' ? theme.colors.surface[50] : theme.colors.grey[300]} />
                <Text style={styles.timeText}>{estimatedTime ? formatEstimatedTime() : '5min'}</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: theme.colors.primary[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
  },
  doneContainer: {
    borderColor: theme.colors.success[300],
    borderWidth: 2,
  },
  skippedContainer: {
    opacity: 0.5,
  },
  card: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  actionSection: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary[600],
    padding: theme.spacing.sm,
    alignItems: 'center',
    gap: theme.spacing.md,
    minHeight: 60,
  },
  doneActionSection: {
    backgroundColor: theme.colors.success[600],
  },
  dateContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dueDateDay: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 20,
    color: theme.colors.surface[50],
    fontWeight: theme.typography.fontWeight.bold as any,
    textAlign: 'center',
    lineHeight: 20,
  },
  dueDateMonth: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    color: theme.colors.surface[50],
    fontWeight: theme.typography.fontWeight.semibold as any,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 12,
    marginTop: 2,
  },
  noDatePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOverlay: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  actionDetailsSection: {
    flex: 1,
    justifyContent: 'center',
  },
  actionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  frequencyText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.grey[200],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  timeText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.grey[200],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
});