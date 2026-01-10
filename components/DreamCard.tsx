import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import type { Dream } from '../backend/database/types';

interface DreamCardProps {
  dream: Dream;
  onPress: (dreamId: string) => void;
  style?: any;
}

export const DreamCard: React.FC<DreamCardProps> = ({
  dream,
  onPress,
  style,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={[styles.cardContainer, style]}>
      <Pressable
        style={styles.card}
        onPress={() => onPress(dream.id)}
      >
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {dream.title}
          </Text>
          
          {dream.description && (
            <Text style={styles.description} numberOfLines={3}>
              {dream.description}
            </Text>
          )}
          
          <View style={styles.dateContainer}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>
                {formatDate(dream.start_date)}
              </Text>
            </View>
            
            {dream.end_date && (
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>End Date</Text>
                <Text style={styles.dateValue}>
                  {formatDate(dream.end_date)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  cardContainer: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.xl,
  },
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    lineHeight: 28,
  },
  description: {
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  dateValue: {
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.text.secondary,
  },
});