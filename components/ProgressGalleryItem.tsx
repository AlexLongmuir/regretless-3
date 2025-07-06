import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { theme } from '../utils/theme';
import { OptionsPopover } from './OptionsPopover';

interface ProgressGalleryItemProps {
  date: Date;
  hasImage: boolean;
  imageUri?: string;
  isSelected: boolean;
  onPress: () => void;
  size: number;
  showDreamTagging?: boolean;
  selectedDream?: string;
  onDreamSelect?: (dreamId: string) => void;
  dreams?: Array<{ id: string; title: string; }>;
}

export const ProgressGalleryItem: React.FC<ProgressGalleryItemProps> = ({
  date,
  hasImage,
  imageUri,
  isSelected,
  onPress,
  size,
  showDreamTagging = false,
  selectedDream,
  onDreamSelect,
  dreams = [],
}) => {
  const [showDreamPopover, setShowDreamPopover] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const formatDisplayDate = () => {
    return {
      day: date.getDate().toString(),
      month: date.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3)
    };
  };

  const displayDate = formatDisplayDate();
  
  const handleDreamDropdownPress = (event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setDropdownPosition({
      x: pageX - size / 2,
      y: pageY,
      width: size,
      height: 32
    });
    setShowDreamPopover(true);
  };

  const dreamOptions = [
    { 
      id: 'none', 
      icon: 'close', 
      title: 'None', 
      selected: !selectedDream || selectedDream === 'none',
      onPress: () => onDreamSelect?.('none') 
    },
    ...dreams.map(dream => ({
      id: dream.id,
      icon: 'star',
      title: dream.title,
      selected: selectedDream === dream.id,
      onPress: () => onDreamSelect?.(dream.id)
    }))
  ];

  const getSelectedDreamTitle = () => {
    if (!selectedDream || selectedDream === 'none') return 'None';
    return dreams.find(dream => dream.id === selectedDream)?.title || 'None';
  };

  return (
    <View style={[styles.container, { width: size }]}>
      <Pressable
        style={[
          styles.imageContainer,
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
      
      {showDreamTagging && (
        <Pressable
          style={[styles.dreamDropdown, { width: size }]}
          onPress={handleDreamDropdownPress}
        >
          <Text style={styles.dreamText} numberOfLines={1}>
            {getSelectedDreamTitle()}
          </Text>
        </Pressable>
      )}
      
      <OptionsPopover
        visible={showDreamPopover}
        onClose={() => setShowDreamPopover(false)}
        options={dreamOptions}
        triggerPosition={dropdownPosition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  imageContainer: {
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
  dreamDropdown: {
    backgroundColor: theme.colors.grey[100],
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
  },
  dreamText: {
    fontSize: 10,
    color: theme.colors.grey[700],
    textAlign: 'center',
    fontWeight: '500',
  },
});