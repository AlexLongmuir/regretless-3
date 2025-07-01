import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { theme } from '../utils/theme';

interface ProgressGalleryItemProps {
  date: Date;
  hasImage: boolean;
  imageUri?: string;
  isSelected: boolean;
  onPress: () => void;
  size: number;
}

export const ProgressGalleryItem: React.FC<ProgressGalleryItemProps> = ({
  date,
  hasImage,
  imageUri,
  isSelected,
  onPress,
  size,
}) => {
  const formatDisplayDate = () => {
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3)
    };
  };

  const displayDate = formatDisplayDate();

  return (
    <Pressable
      style={[
        styles.container,
        { width: size, height: size }
      ]}
      onPress={onPress}
    >
      {hasImage && imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.dayText}>{displayDate.day}</Text>
          <Text style={styles.monthText}>{displayDate.month}</Text>
        </View>
      )}
      
      {isSelected && (
        <View style={styles.selectedOverlay} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: theme.colors.primary[600],
    borderRadius: theme.radius.md,
    pointerEvents: 'none',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.grey[300],
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 20,
    color: theme.colors.grey[800],
    fontWeight: theme.typography.fontWeight.regular as any,
    textAlign: 'center',
    lineHeight: 20,
  },
  monthText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 12,
    color: theme.colors.grey[800],
    fontWeight: theme.typography.fontWeight.regular as any,
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 2,
  },
});