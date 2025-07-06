import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground, ScrollView, Dimensions, Image } from 'react-native';
import { theme } from '../utils/theme';

const { width: screenWidth } = Dimensions.get('window');

interface Dream {
  id: string;
  title: string;
  progressPercentage: number;
  streakCount: number;
  daysRemaining: number;
  currentDay: number;
  totalDays: number;
  backgroundImages: string[];
  recentPhotos: string[];
  nextMilestone?: {
    title: string;
    dueDate: string;
  };
}

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
  const defaultImages = [
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
  ];

  const backgroundImages = dream.backgroundImages.length > 0 
    ? dream.backgroundImages 
    : defaultImages;
    
  const displayImages = backgroundImages.slice(0, 3);

  

  return (
    <View style={[styles.cardContainer, style]}>
      <Pressable
        style={styles.card}
        onPress={() => onPress(dream.id)}
      >
        <View style={styles.topSection}>
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
          
          <View style={styles.overlayBadges}>
            <View style={styles.dayCounterBadge}>
              <Text style={styles.dayCounter}>
                DAY {dream.currentDay} OF {dream.totalDays}
              </Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {dream.streakCount}D</Text>
            </View>
          </View>
          
          <View style={styles.gradientOverlay}>
            <Text style={styles.title} numberOfLines={2}>
              {dream.title}
            </Text>
            
          </View>
        </View>
      </Pressable>
      
      {dream.nextMilestone && (
        <View style={styles.nextActionContainer}>
          <Text style={styles.nextUpLabel}>Next up</Text>
          <Text style={styles.nextActionTitle} numberOfLines={1}>
            {dream.nextMilestone.title}
          </Text>
          <Text style={styles.nextActionDue}>
            Due: {dream.nextMilestone.dueDate}
          </Text>
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
  dayCounterBadge: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: theme.radius.lg,
  },
  gradientOverlay: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  dayCounter: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.surface[50],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.surface[50],
    marginBottom: 0,
    marginTop: 0,
  },
  streakBadge: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: 0,
  },
  streakText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.warning[500],
  },
  nextActionContainer: {
    backgroundColor: theme.colors.primary[800],
    padding: theme.spacing.md,
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  nextUpLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.primary[200],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  nextActionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.surface[50],
    marginBottom: 2,
  },
  nextActionDue: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.primary[200],
  },
});