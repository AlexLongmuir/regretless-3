import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, Dimensions } from 'react-native';
import { theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  moodRating: number;
  images: string[];
  completedActions: string[];
}

interface JournalCardProps {
  entry: JournalEntry;
  onPress: (entryId: string) => void;
  style?: any;
}

export const JournalCard: React.FC<JournalCardProps> = ({
  entry,
  onPress,
  style,
}) => {
  const cardWidth = screenWidth - (theme.spacing.md * 2);
  const displayImages = entry.images.slice(0, 3);
  
  const getMoodEmoji = (rating: number) => {
    if (rating >= 9) return '😊';
    if (rating >= 7) return '🙂';
    if (rating >= 5) return '😐';
    if (rating >= 3) return '😕';
    return '😢';
  };

  const getMoodColor = (rating: number) => {
    if (rating >= 8) return theme.colors.success[500];
    if (rating >= 6) return theme.colors.warning[500];
    if (rating >= 4) return theme.colors.primary[500];
    return theme.colors.error[500];
  };

  return (
    <View style={[styles.cardContainer, style]}>
      <Pressable
        style={styles.card}
        onPress={() => onPress(entry.id)}
      >
        <View style={styles.topSection}>
          {displayImages.length > 0 && (
            <View style={styles.imageGrid}>
              {displayImages.map((image, index) => (
                <Image 
                  key={index}
                  source={{ uri: image }} 
                  style={[
                    styles.squareImage,
                    displayImages.length === 1 && styles.singleImageSquare,
                    displayImages.length === 2 && styles.twoImageSquare,
                    displayImages.length >= 3 && styles.threeImageSquare,
                  ]} 
                />
              ))}
            </View>
          )}
          
          <View style={styles.overlayBadges}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>
                {entry.date}
              </Text>
            </View>
            <View style={[styles.moodBadge, { backgroundColor: getMoodColor(entry.moodRating) }]}>
              <Text style={styles.moodText}>{getMoodEmoji(entry.moodRating)} {entry.moodRating}/10</Text>
            </View>
          </View>
          
          <View style={styles.gradientOverlay}>
            <Text style={styles.title} numberOfLines={2}>
              {entry.title}
            </Text>
            
            <Text style={styles.content} numberOfLines={3}>
              {entry.content}
            </Text>
          </View>
        </View>
      </Pressable>
      
      {entry.completedActions.length > 0 && (
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsLabel}>Completed Actions</Text>
          {entry.completedActions.slice(0, 3).map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <Icon name="check-circle" size={16} color={theme.colors.success[500]} />
              <Text style={styles.actionText} numberOfLines={1}>
                {action}
              </Text>
            </View>
          ))}
          {entry.completedActions.length > 3 && (
            <Text style={styles.moreActionsText}>
              +{entry.completedActions.length - 3} more actions
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: theme.colors.primary[900],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  card: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  topSection: {
    backgroundColor: theme.colors.primary[600],
    position: 'relative',
  },
  imageGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: 0,
  },
  squareImage: {
    aspectRatio: 1,
    borderRadius: theme.radius.md,
  },
  singleImageSquare: {
    flex: 1,
  },
  twoImageSquare: {
    flex: 1,
  },
  threeImageSquare: {
    flex: 1,
  },
  overlayBadges: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  dateBadge: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: theme.radius.lg,
  },
  dateText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.surface[50],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moodBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: 0,
  },
  moodText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.surface[50],
  },
  gradientOverlay: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.sm,
    marginTop: 0,
  },
  content: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.surface[50],
    opacity: 0.9,
  },
  actionsContainer: {
    backgroundColor: theme.colors.primary[800],
    padding: theme.spacing.md,
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  actionsLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.primary[200],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  actionText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.medium as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.surface[50],
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  moreActionsText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.primary[200],
    marginTop: theme.spacing.xs,
  },
});