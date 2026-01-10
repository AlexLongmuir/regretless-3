import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { Icon } from './Icon';
import type { Dream, DreamWithStats } from '../backend/database/types';
import { useData } from '../contexts/DataContext';
import { triggerHaptic } from '../utils/haptics';

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isScreenshotMode } = useData(); // Get screenshot mode state

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
    // Use mocked date for screenshot mode (Jan 1, 2026), otherwise real date
    const today = isScreenshotMode ? new Date('2026-01-01') : new Date();
    
    if (endDate) {
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const currentDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return { current: Math.max(1, currentDay), total: totalDays };
    }
    
    // If no end date, calculate days since start
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { current: Math.max(1, daysSinceStart), total: null };
  };

  const dayProgress = calculateDayProgress();
  const streak = dream.current_streak || 0;

  const handlePress = () => {
    triggerHaptic();
    onPress(dream.id);
  };

  return (
    <Pressable
      style={[styles.chip, style]}
      onPress={handlePress}
    >
      <View style={styles.chipContent}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {dream.image_url ? (
            <Image source={{ uri: dream.image_url }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.placeholderImage}>
              <Image source={require('../assets/star.png')} style={styles.placeholderIcon} contentFit="contain" />
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
            {streak > 0 && (
              <View style={styles.streakContainer}>
                <Text style={styles.streakText}>{streak}</Text>
                <Icon name="fire" size={16} color={styles.streakText.color as string} />
              </View>
            )}
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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

const createStyles = (theme: Theme) => StyleSheet.create({
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
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  chipContent: {
    flexDirection: 'column',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.disabled.inactive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 32,
    height: 32,
  },
  content: {
    padding: theme.spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dayProgress: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.tertiary,
  },
  title: {
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    lineHeight: 24,
  },
  endDate: {
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.text.secondary,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.text.tertiary,
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
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
});
