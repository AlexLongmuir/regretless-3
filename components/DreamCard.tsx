
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground, ScrollView, Dimensions } from 'react-native';
import { theme } from '../utils/theme';

const { width: screenWidth } = Dimensions.get('window');

interface Dream {
  id: string;
  title: string;
  progressPercentage: number;
  streakCount: number;
  daysRemaining: number;
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
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  
  const defaultBackground = {
    uri: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop'
  };

  const backgroundImages = dream.backgroundImages.length > 0 
    ? dream.backgroundImages 
    : [defaultBackground.uri];
    
  const currentBackground = { uri: backgroundImages[currentBackgroundIndex] };

  const cardWidth = screenWidth - (theme.spacing.md * 2);
  
  const handleBackgroundScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const imageIndex = Math.round(scrollPosition / cardWidth);
    setCurrentBackgroundIndex(imageIndex);
  };

  return (
    <View style={[styles.cardContainer, style]}>
      <Pressable
        style={styles.card}
        onPress={() => onPress(dream.id)}
      >
        {backgroundImages.length > 1 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleBackgroundScroll}
            style={dream.recentPhotos.length > 0 ? styles.backgroundScrollContainer : styles.backgroundScrollContainerSmall}
            contentContainerStyle={styles.backgroundScrollContent}
          >
            {backgroundImages.map((bgImage, index) => (
              <ImageBackground
                key={index}
                source={{ uri: bgImage }}
                style={[styles.backgroundImageItem, { width: cardWidth }]}
                imageStyle={styles.backgroundImageStyle}
              >
                {index === currentBackgroundIndex && (
                  <View style={dream.recentPhotos.length > 0 ? styles.overlay : styles.overlaySmall}>
                    <View style={styles.topSection}>
                      <View style={styles.headerRow}>
                        <View style={styles.titleContainer}>
                          <Text style={styles.dayCounter}>
                            Day 15 of 90
                          </Text>
                          <Text style={styles.title} numberOfLines={2}>
                            {dream.title}
                          </Text>
                        </View>
                        <View style={styles.streakBadge}>
                          <Text style={styles.streakText}>🔥 {dream.streakCount}d</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.spacer} />

                    {dream.recentPhotos.length > 0 && (
                      <View style={styles.photosContainer}>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          pagingEnabled={false}
                          decelerationRate="fast"
                          contentContainerStyle={styles.photosScrollContainer}
                        >
                          {dream.recentPhotos.map((photo, photoIndex) => (
                            <View key={photoIndex} style={styles.photoThumbnail}>
                              <ImageBackground
                                source={{ uri: photo }}
                                style={styles.thumbnailImage}
                                imageStyle={styles.thumbnailImageStyle}
                              />
                            </View>
                          ))}
                          <View style={{ width: theme.spacing.lg }} />
                        </ScrollView>
                      </View>
                    )}

                    <View style={styles.spacer} />
                  </View>
                )}
              </ImageBackground>
            ))}
          </ScrollView>
        ) : (
          <ImageBackground
            source={currentBackground}
            style={dream.recentPhotos.length > 0 ? styles.backgroundImage : styles.backgroundImageSmall}
            imageStyle={styles.backgroundImageStyle}
          >
            <View style={dream.recentPhotos.length > 0 ? styles.overlay : styles.overlaySmall}>
              <View style={styles.topSection}>
                <View style={styles.headerRow}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.dayCounter}>
                      Day 15 of 90
                    </Text>
                    <Text style={styles.title} numberOfLines={2}>
                      {dream.title}
                    </Text>
                  </View>
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakText}>🔥 {dream.streakCount}d</Text>
                  </View>
                </View>
              </View>

              <View style={styles.spacer} />

              {dream.recentPhotos.length > 0 && (
                <View style={styles.photosContainer}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled={false}
                    decelerationRate="fast"
                    contentContainerStyle={styles.photosScrollContainer}
                  >
                    {dream.recentPhotos.map((photo, index) => (
                      <View key={index} style={styles.photoThumbnail}>
                        <ImageBackground
                          source={{ uri: photo }}
                          style={styles.thumbnailImage}
                          imageStyle={styles.thumbnailImageStyle}
                        />
                      </View>
                    ))}
                    <View style={{ width: theme.spacing.lg }} />
                  </ScrollView>
                </View>
              )}

              <View style={styles.spacer} />
            </View>
          </ImageBackground>
        )}
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
  backgroundImage: {
    justifyContent: 'space-between',
  },
  backgroundImageSmall: {
    justifyContent: 'center',
  },
  backgroundScrollContainer: {
    flex: 1,
  },
  backgroundScrollContainerSmall: {
    flex: 1,
  },
  backgroundScrollContent: {
    flexDirection: 'row',
  },
  backgroundImageItem: {
    justifyContent: 'space-between',
    minHeight: 180,
  },
  backgroundImageStyle: {
    opacity: 0.9,
  },
  overlay: {
    backgroundColor: `${theme.colors.primary[600]}80`,
    padding: theme.spacing.md,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  overlaySmall: {
    backgroundColor: `${theme.colors.primary[600]}80`,
    padding: theme.spacing.md,
    minHeight: 180,
    justifyContent: 'center',
  },
  spacer: {
    flex: 1,
  },
  topSection: {
    flex: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  dayCounter: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.primary[100],
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.surface[50],
  },
  streakBadge: {
    backgroundColor: `${theme.colors.warning[600]}80`,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  streakText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.surface[50],
  },
  photosContainer: {
    marginBottom: 0,
  },
  photosScrollContainer: {
    paddingHorizontal: 0,
  },
  photoThumbnail: {
    width: 80,
    height: 64,
    marginRight: theme.spacing.xs,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: `${theme.colors.surface[50]}20`,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailImageStyle: {
    borderRadius: theme.radius.md,
  },
  nextActionContainer: {
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  nextUpLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.primary[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  nextActionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.primary[600],
    marginBottom: 2,
  },
  nextActionDue: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.primary[400],
  },
});