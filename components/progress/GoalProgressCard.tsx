import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../utils/theme';

interface GoalProgressCardProps {
  dreamId: string;
  title: string;
  targetDate?: string;
  currentDay: number;
  totalDays: number;
  streakCount: number;
  actionsCompleted: number;
  totalActions: number;
  imageUri?: string;
}

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  dreamId,
  title,
  targetDate,
  currentDay,
  totalDays,
  streakCount,
  actionsCompleted,
  totalActions,
  imageUri,
}) => {
  // Debug logging
  console.log(`GoalProgressCard for ${title}:`, {
    actionsCompleted,
    totalActions,
    actionsCompletedType: typeof actionsCompleted,
    totalActionsType: typeof totalActions
  });

  // Handle expired dreams and edge cases
  const isExpired = targetDate ? new Date(targetDate) < new Date() : false;
  const isOngoing = !targetDate;
  
  // Cap progress at 100% for expired dreams
  const daysProgress = totalDays > 0 ? Math.min((currentDay / totalDays) * 100, 100) : 0;
  const actionsProgress = totalActions > 0 ? (actionsCompleted / totalActions) * 100 : 0;
  
  // Format day display for expired dreams
  const getDayDisplay = () => {
    if (isExpired) {
      return `Completed (${totalDays} days)`;
    } else if (isOngoing) {
      return `Day ${currentDay}`;
    } else {
      return `Day ${currentDay} of ${totalDays}`;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Ongoing';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    // Add ordinal suffix to day
    const getOrdinalSuffix = (day: number) => {
      if (day >= 11 && day <= 13) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  };

  const ProgressBar = ({ progress, label, current, total }: {
    progress: number;
    label: string;
    current: number;
    total: number;
  }) => {
    // Handle NaN and invalid progress values
    const safeProgress = isNaN(progress) ? 0 : Math.max(0, Math.min(100, progress));
    const safeCurrent = isNaN(current) ? 0 : current;
    const safeTotal = isNaN(total) ? 0 : total;
    
    return (
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <View style={styles.progressLabelContainer}>
            <Text style={styles.progressPercentage}>{Math.round(safeProgress)}%</Text>
            <Text style={styles.progressLabel}>{label}</Text>
          </View>
          <Text style={styles.progressText}>{safeCurrent}/{safeTotal}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${safeProgress}%` }]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>📸</Text>
            </View>
          )}
        </View>
        
        <View style={styles.details}>
          <View style={styles.progressRow}>
            <Text style={styles.dayProgress}>
              {getDayDisplay()}
            </Text>
            <Text style={styles.streakText}>🔥 {streakCount}</Text>
          </View>
          
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          
          <Text style={[styles.endDate, isExpired && styles.expiredText]}>
            {isExpired ? 'Completed' : formatDate(targetDate)}
          </Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={daysProgress}
          label={isExpired ? "days completed" : "days gone"}
          current={isExpired ? totalDays : currentDay}
          total={totalDays}
        />
        
        <ProgressBar
          progress={actionsProgress}
          label="actions complete"
          current={actionsCompleted}
          total={totalActions}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: theme.radius.md,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.md,
  },
  placeholderText: {
    fontSize: 32,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  dayProgress: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[500],
  },
  streakText: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[500],
  },
  title: {
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  endDate: {
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.grey[600],
  },
  expiredText: {
    color: theme.colors.success[600],
    fontWeight: '600',
  },
  progressContainer: {
    gap: theme.spacing.md,
  },
  progressItem: {
    marginBottom: theme.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginRight: theme.spacing.xs,
    lineHeight: 28,
  },
  progressLabel: {
    fontSize: 14,
    color: theme.colors.grey[600],
    fontWeight: '400',
    lineHeight: 14,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.grey[600],
    fontWeight: '400',
    textAlign: 'right',
    minWidth: 40,
    lineHeight: 12,
  },
  progressBarContainer: {
    height: 11,
  },
  progressBar: {
    height: 11,
    backgroundColor: theme.colors.grey[200],
    borderRadius: 5.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.grey[900],
    borderRadius: 5.5,
  },
});

export default GoalProgressCard;
