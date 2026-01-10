import React, { useState, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { OptionsPopover } from './OptionsPopover';
import { ProgressGalleryItem } from './ProgressGalleryItem';
import * as ImagePicker from 'expo-image-picker';

const { width: screenWidth } = Dimensions.get('window');

interface ImageGalleryProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  containerWidth?: number;
  editable?: boolean;
  showAddButton?: boolean;
  addButtonText?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  showDreamTagging?: boolean;
  dreams?: Array<{ id: string; title: string; }>;
  imageDreamTags?: { [imageIndex: number]: string };
  onImageDreamTagChange?: (imageIndex: number, dreamId: string) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImagesChange,
  maxImages = 12,
  containerWidth,
  editable = true,
  showAddButton = true,
  addButtonText = "Add Photo",
  emptyStateTitle = "No images added yet",
  emptyStateDescription = "Tap the add button to get started",
  showDreamTagging = false,
  dreams = [],
  imageDreamTags = {},
  onImageDreamTagChange,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [addButtonPosition, setAddButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const addButtonRef = useRef<View>(null);

  const galleryWidth = containerWidth || (screenWidth - (theme.spacing.md * 2));
  
  // Fixed 4-column grid sizing
  const imagesPerRow = 4;
  const availableWidth = galleryWidth - (theme.spacing.sm * (imagesPerRow - 1));
  const imageSize = availableWidth / imagesPerRow;

  const handleAddImage = () => {
    if (images.length >= maxImages) {
      Alert.alert('Maximum Images', `You can only add up to ${maxImages} images.`);
      return;
    }

    // Capture button position for popover positioning
    if (addButtonRef.current) {
      addButtonRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setAddButtonPosition({ x: pageX, y: pageY, width, height });
        setShowImageOptions(true);
      });
    } else {
      setShowImageOptions(true);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setShowImageOptions(false);
      
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImagesChange([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePhotoLibrary = async () => {
    try {
      // console.log('Starting photo library selection...');
      setShowImageOptions(false); // Close popover immediately
      
      // Add placeholder image for testing
      const placeholderImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop';
      onImagesChange([...images, placeholderImage]);
      return;
      
      // Always request permissions explicitly first
      // console.log('Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      // console.log('Permission request result:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to select photos.');
        return;
      }
      
      // Small delay to ensure permissions are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // console.log('Launching image library...');
      const result = await Promise.race([
        ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          allowsMultipleSelection: false,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image picker timeout')), 10000)
        )
      ]);

      // console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        // console.log('Adding image:', result.assets[0].uri);
        onImagesChange([...images, result.assets[0].uri]);
      } else {
        // console.log('Image selection canceled or no assets');
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', `Failed to select photo: ${error.message}`);
    }
  };

  const handleRemoveImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const getImageOptions = () => {
    return [
      {
        id: 'take-photo',
        icon: 'camera-alt',
        title: 'Take Photo',
        onPress: handleTakePhoto,
      },
      {
        id: 'photo-library',
        icon: 'photo',
        title: 'Photo Library',
        onPress: handlePhotoLibrary,
      },
    ];
  };

  // Show empty state if no images and not editable
  if (images.length === 0 && !editable) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcon name="photo" size={48} color={theme.colors.text.tertiary} />
        <Text style={styles.emptyStateTitle}>{emptyStateTitle}</Text>
        <Text style={styles.emptyStateDescription}>{emptyStateDescription}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.imagesGridContainer}>
        {images.map((image, index) => (
          showDreamTagging ? (
            <ProgressGalleryItem
              key={index}
              date={new Date()}
              hasImage={true}
              imageUri={image}
              isSelected={false}
              onPress={() => {}}
              size={imageSize}
              showDreamTagging={true}
              selectedDream={imageDreamTags[index]}
              onDreamSelect={(dreamId) => onImageDreamTagChange?.(index, dreamId)}
              dreams={dreams}
            />
          ) : (
            <View key={index} style={styles.imageContainer}>
              <Image 
                source={{ uri: image }} 
                style={[styles.image, { width: imageSize, height: imageSize }]} 
                contentFit="cover"
                transition={200}
              />
              {editable && (
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <MaterialIcon name="close" size={16} color={theme.colors.text.inverse} />
                </Pressable>
              )}
            </View>
          )
        ))}
        
        {editable && showAddButton && images.length < maxImages && (
          <Pressable 
            ref={addButtonRef}
            style={[styles.addImageButton, { width: imageSize, height: imageSize }]} 
            onPress={handleAddImage}
          >
            <MaterialIcon name="add" size={20} color={theme.colors.text.tertiary} />
            <Text style={styles.addImageText}>{addButtonText}</Text>
          </Pressable>
        )}
      </View>

      {images.length === 0 && editable && emptyStateTitle && (
        <View style={styles.emptyState}>
          <MaterialIcon name="add-a-photo" size={48} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyStateTitle}>{emptyStateTitle}</Text>
          <Text style={styles.emptyStateDescription}>{emptyStateDescription}</Text>
        </View>
      )}

      <OptionsPopover
        visible={showImageOptions}
        onClose={() => setShowImageOptions(false)}
        options={getImageOptions()}
        triggerPosition={addButtonPosition}
      />
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    width: '100%',
  },
  imagesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    borderRadius: theme.radius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.error[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.text.inverse,
  },
  addImageButton: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.disabled.inactive,
    borderWidth: 2,
    borderColor: theme.colors.border.default,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    lineHeight: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyStateTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyStateDescription: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.callout,
  },
});