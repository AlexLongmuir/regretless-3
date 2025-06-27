import React from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground, ScrollView } from 'react-native';
import { theme } from '../utils/theme';
import { Progress } from './Progress';

interface Dream {
  id: string;
  title: string;
  progressPercentage: number;
  streakCount: number;
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
  const defaultBackground = {
    uri: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop'
  };

  const backgroundImage = dream.backgroundImages.length > 0 
    ? { uri: dream.backgroundImages[0] } 
    : defaultBackground;

  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() => onPress(dream.id)}
    >
      <ImageBackground
        source={backgroundImage}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <View style={styles.overlay}>
          <View style={styles.topSection}>
            <Text style={styles.title} numberOfLines={2}>
              {dream.title}
            </Text>
            <View style={styles.progressContainer}>
              <Progress
                value={dream.progressPercentage}
                height={6}
                color={theme.colors.primary[400]}
                backgroundColor="rgba(255, 255, 255, 0.3)"
                showLabel
                label={`${dream.progressPercentage}% complete`}
              />
            </View>
          </View>

          <View style={styles.middleSection}>
            <View style={styles.streakContainer}>
              <Text style={styles.streakText}>🔥 {dream.streakCount}-day streak</Text>
            </View>

            {dream.recentPhotos.length > 0 && (
              <View style={styles.photosContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {dream.recentPhotos.map((photo, index) => (
                    <View key={index} style={styles.photoThumbnail}>
                      <ImageBackground
                        source={{ uri: photo }}
                        style={styles.thumbnailImage}
                        imageStyle={styles.thumbnailImageStyle}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {dream.nextMilestone && (
            <View style={styles.bottomSection}>
              <View style={styles.nextStepContainer}>
                <Text style={styles.nextStepTitle} numberOfLines={1}>
                  {dream.nextMilestone.title}
                </Text>
                <Text style={styles.nextStepDue}>
                  Due: {dream.nextMilestone.dueDate}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ImageBackground>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: theme.colors.grey[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  backgroundImage: {
    minHeight: 280,
    justifyContent: 'space-between',
  },
  backgroundImageStyle: {
    opacity: 0.7,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: theme.spacing.md,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 0,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  progressContainer: {
    marginTop: theme.spacing.xs,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 80,
  },
  streakContainer: {
    marginBottom: theme.spacing.md,
  },
  streakText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.callout,
    color: theme.colors.surface[50],
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  photosContainer: {
    marginTop: theme.spacing.sm,
  },
  photoThumbnail: {
    width: 50,
    height: 50,
    marginRight: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailImageStyle: {
    borderRadius: theme.radius.sm,
  },
  bottomSection: {
    flex: 0,
  },
  nextStepContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  nextStepTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.surface[50],
    marginBottom: 2,
  },
  nextStepDue: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.surface[100],
    opacity: 0.9,
  },
});