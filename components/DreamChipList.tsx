import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, ScrollView } from 'react-native';
import { theme } from '../utils/theme';
import { Icon } from './Icon';
import type { Dream, DreamWithStats } from '../backend/database/types';

interface DreamChipProps {
  dream: DreamWithStats;
  onPress: (dreamId: string) => void;
  style?: any;
}

interface DreamChipListProps {
  dreams: DreamWithStats[];
  onDreamPress: (dreamId: string) => void;
  style?: any;
  showEmpty?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
}

const DreamChip: React.FC<DreamChipProps> = ({ dream, onPress, style }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const calculateDayProgress = () => {
    const startDate = new Date(dream.start_date);
    const endDate = dream.end_date ? new Date(dream.end_date) : null;
    const today = new Date();
    
    if (endDate) {
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return { current: Math.max(1, currentDay), total: totalDays };
    }
    
    // If no end date, calculate days since start
    const daysSinceStart = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { current: Math.max(1, daysSinceStart), total: null };
  };

  const dayProgress = calculateDayProgress();
  const streak = dream.current_streak || 0;

  return (
    <Pressable
      style={[styles.chip, style]}
      onPress={() => onPress(dream.id)}
    >
      <View style={styles.chipContent}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {dream.image_url ? (
            <Image source={{ uri: dream.image_url }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Image source={require('../assets/star.png')} style={styles.placeholderIcon} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Day Progress and Streak */}
          <View style={styles.progressRow}>
            <Text style={styles.dayProgress}>
              Day {dayProgress.current}{dayProgress.total ? ` of ${dayProgress.total}` : ''}
            </Text>
            <Text style={styles.streakText}>🔥 {streak}</Text>
          </View>
          
          {/* Title */}
          <Text style={styles.title}>
            {dream.title}
          </Text>
          
          {/* End Date */}
          {dream.end_date && (
            <Text style={styles.endDate}>
              {formatDate(dream.end_date)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export const DreamChipList: React.FC<DreamChipListProps> = ({ 
  dreams, 
  onDreamPress, 
  style,
  showEmpty = false,
  emptyTitle = 'No dreams yet',
  emptySubtitle = 'Create your first dream to get started'
}) => {
  if (dreams.length === 0 && showEmpty) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyText}>{emptyTitle}</Text>
        <Text style={styles.emptySubtext}>{emptySubtitle}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, style]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {dreams.map((dream) => (
        <DreamChip
          key={dream.id}
          dream={dream}
          onPress={onDreamPress}
          style={styles.chipSpacing}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: theme.spacing.sm,
  },
  chipSpacing: {
    marginBottom: theme.spacing.lg,
  },
  chip: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  placeholderIcon: {
    width: 32,
    height: 32,
  },
  content: {
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
  streakText: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.grey[500],
    textAlign: 'center',
  },
});
