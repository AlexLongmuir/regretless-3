import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { theme } from '../../utils/theme';
import { Icon } from '../Icon';

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
        styles.photoSkeleton,
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
  columns = 6,
}) => {
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(columns);
  const [sectionExpanded, setSectionExpanded] = useState(true);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({});

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
        onPress={() => onPhotoPress?.(item)}
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
            onLoadEnd={() => handleImageLoadEnd(item.id)}
            onError={() => handleImageError(item.id)}
            resizeMode="cover"
            progressiveRenderingEnabled={true}
          />
        </View>
      </TouchableOpacity>
    );
  }, [loadingStates, errorStates, onPhotoPress, handleImageLoadStart, handleImageLoadEnd, handleImageError]);

  const displayPhotos = sectionExpanded ? photos : photos.slice(0, 18);

  const handleColumnSelect = (newColumns: number) => {
    setSelectedColumns(newColumns);
    setShowColumnSelector(false);
  };

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
            style={styles.columnButton}
            onPress={() => setShowColumnSelector(!showColumnSelector)}
            activeOpacity={0.7}
          >
            <Text style={styles.photoCount}>{selectedColumns}x</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setSectionExpanded(!sectionExpanded)}
            activeOpacity={0.7}
          >
            <Icon
              name={sectionExpanded ? "expand_less" : "expand_more"}
              size={20}
              color={theme.colors.grey[500]}
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {showColumnSelector && (
        <View style={styles.columnSelector}>
          <Text style={styles.selectorTitle}>Select Columns</Text>
          <View style={styles.columnOptions}>
            {[3, 4, 5, 6, 7].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.columnOption,
                  selectedColumns === num && styles.selectedColumnOption,
                ]}
                onPress={() => handleColumnSelect(num)}
              >
                <Text
                  style={[
                    styles.columnOptionText,
                    selectedColumns === num && styles.selectedColumnOptionText,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
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
    </View>
  );
};

const styles = StyleSheet.create({
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
    color: theme.colors.grey[900],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnButton: {
    marginRight: theme.spacing.sm,
  },
  expandButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCount: {
    fontSize: 14,
    color: theme.colors.grey[500],
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
    backgroundColor: theme.colors.grey[200],
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
    backgroundColor: theme.colors.grey[300],
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
    backgroundColor: theme.colors.grey[200],
  },
  columnSelector: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  columnOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  columnOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.grey[100],
    minWidth: 40,
    alignItems: 'center',
  },
  selectedColumnOption: {
    backgroundColor: theme.colors.primary[600],
  },
  columnOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.grey[700],
  },
  selectedColumnOptionText: {
    color: theme.colors.surface[50],
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
    color: theme.colors.grey[700],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.grey[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ProgressPhotosSection;
