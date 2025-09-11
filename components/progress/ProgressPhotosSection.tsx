import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList } from 'react-native';
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

  const renderPhoto = ({ item }: { item: ProgressPhoto }) => (
    <TouchableOpacity
      style={styles.photoContainer}
      onPress={() => onPhotoPress?.(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.uri }} style={styles.photo} />
    </TouchableOpacity>
  );

  const displayPhotos = sectionExpanded ? photos : photos.slice(0, 18);

  const handleColumnSelect = (newColumns: number) => {
    setSelectedColumns(newColumns);
    setShowColumnSelector(false);
  };

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
                        <FlatList
                          data={displayPhotos}
                          renderItem={renderPhoto}
                          keyExtractor={(item) => item.id}
                          numColumns={selectedColumns}
                          key={selectedColumns} // This fixes the FlatList error
                          scrollEnabled={false}
                          contentContainerStyle={styles.gridContent}
                        />
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
  gridContent: {
    paddingVertical: theme.spacing.sm,
  },
  photoContainer: {
    flex: 1,
    margin: 2,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
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
