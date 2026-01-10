import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';
import { Icon } from '../Icon';
import { FullScreenPhotoViewer } from './FullScreenPhotoViewer';

interface ProgressPhoto {
  id: string;
  uri: string;
  timestamp?: Date;
}

interface ProgressPhotosSectionProps {
  photos: ProgressPhoto[];
  onPhotoPress?: (photo: ProgressPhoto) => void;
  onExpandPress?: () => void;
  isExpanded?: boolean;
  columns?: number;
}

// Skeleton loading component for individual photos
const PhotoSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const skeletonStyles = useMemo(() => StyleSheet.create({
    photoSkeleton: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.border.default,
      borderRadius: theme.radius.sm,
    },
  }), [theme]);
  
  const animatedValue = useMemo(() => new Animated.Value(0), []);
  
  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        skeletonStyles.photoSkeleton,
        {
          opacity,
        },
      ]}
    />
  );
};

const ProgressPhotosSection: React.FC<ProgressPhotosSectionProps> = ({
  photos,
  onPhotoPress,
  onExpandPress,
  isExpanded = false,
  columns = 3,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sectionExpanded, setSectionExpanded] = useState(true);
  const selectedColumns = 3; // Always use 3 columns
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({});
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const handleImageLoadStart = useCallback((photoId: string) => {
    setLoadingStates(prev => ({ ...prev, [photoId]: true }));
    setErrorStates(prev => ({ ...prev, [photoId]: false }));
  }, []);

  const handleImageLoadEnd = useCallback((photoId: string) => {
    setLoadingStates(prev => ({ ...prev, [photoId]: false }));
  }, []);

  const handleImageError = useCallback((photoId: string) => {
    setLoadingStates(prev => ({ ...prev, [photoId]: false }));
    setErrorStates(prev => ({ ...prev, [photoId]: true }));
  }, []);

  const handlePhotoPress = useCallback((photo: ProgressPhoto) => {
    const index = photos.findIndex((p) => p.id === photo.id);
    if (index >= 0) {
      setSelectedPhotoIndex(index);
      setViewerVisible(true);
    }
    onPhotoPress?.(photo);
  }, [photos, onPhotoPress]);

  const renderPhoto = useCallback(({ item }: { item: ProgressPhoto }) => {
    const isLoading = loadingStates[item.id] ?? true;
    const hasError = errorStates[item.id] ?? false;

    // Don't render anything if the image failed to load
    if (hasError) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.photoContainer}
        onPress={() => handlePhotoPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.photoWrapper}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <PhotoSkeleton />
            </View>
          )}
          
          <Image
            source={{ uri: item.uri }}
            style={styles.photo}
            onLoadStart={() => handleImageLoadStart(item.id)}
            onLoad={() => handleImageLoadEnd(item.id)}
            onError={() => handleImageError(item.id)}
            contentFit="cover"
            transition={200}
          />
        </View>
      </TouchableOpacity>
    );
  }, [loadingStates, errorStates, handlePhotoPress, handleImageLoadStart, handleImageLoadEnd, handleImageError]);

  const displayPhotos = sectionExpanded ? photos : photos.slice(0, 18);

  // Create a grid layout by organizing photos into rows
  const createGridRows = (photos: ProgressPhoto[], columns: number) => {
    const rows: ProgressPhoto[][] = [];
    for (let i = 0; i < photos.length; i += columns) {
      rows.push(photos.slice(i, i + columns));
    }
    return rows;
  };

  const gridRows = createGridRows(displayPhotos, selectedColumns);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress Photos</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setSectionExpanded(!sectionExpanded)}
            activeOpacity={0.7}
          >
            <Icon
              name={sectionExpanded ? "expand_less" : "expand_more"}
              size={20}
              color={theme.colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </View>
      
                  {sectionExpanded && (
                    <>
                      {displayPhotos.length > 0 ? (
                        <View style={styles.gridContainer}>
                          {gridRows.map((row, rowIndex) => (
                            <View key={rowIndex} style={styles.gridRow}>
                              {row.map((photo) => (
                                <View key={photo.id} style={styles.gridItem}>
                                  {renderPhoto({ item: photo })}
                                </View>
                              ))}
                              {/* Fill remaining space in the row if it's not full */}
                              {row.length < selectedColumns && (
                                Array.from({ length: selectedColumns - row.length }).map((_, emptyIndex) => (
                                  <View key={`empty-${rowIndex}-${emptyIndex}`} style={styles.gridItem} />
                                ))
                              )}
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyStateText}>No progress photos yet</Text>
                          <Text style={styles.emptyStateSubtext}>Complete actions and add photos to see your progress here</Text>
                        </View>
                      )}
                    </>
                  )}

      <FullScreenPhotoViewer
        visible={viewerVisible}
        photos={photos}
        initialIndex={selectedPhotoIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    paddingVertical: theme.spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 2,
  },
  photoContainer: {
    width: '100%',
  },
  photoWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.disabled.inactive,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoSkeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.border.default,
    borderRadius: theme.radius.sm,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.disabled.inactive,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ProgressPhotosSection;
