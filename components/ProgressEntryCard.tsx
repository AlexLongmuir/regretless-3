import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions, Image, TextInput, Alert } from 'react-native';
import { theme } from '../utils/theme';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { OptionsPopover } from './OptionsPopover';
import * as ImagePicker from 'expo-image-picker';

const { width: screenWidth } = Dimensions.get('window');

interface ProgressEntry {
  date: string;
  images: string[];
  text: string;
}

interface ProgressEntryCardProps {
  entry: ProgressEntry;
  onUpdate: (entry: ProgressEntry) => void;
  onDelete: (dateString: string) => void;
  style?: any;
}

export const ProgressEntryCard: React.FC<ProgressEntryCardProps> = ({
  entry,
  onUpdate,
  onDelete,
  style,
}) => {
  const isNewEntry = entry.images.length === 0 && entry.text === '';
  const [isEditing, setIsEditing] = useState(isNewEntry);
  const [editText, setEditText] = useState(entry.text);
  const [editImages, setEditImages] = useState(entry.images);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [addButtonPosition, setAddButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const addButtonRef = useRef<View>(null);

  // Reset editing state when entry changes
  useEffect(() => {
    const newEntryCheck = entry.images.length === 0 && entry.text === '';
    setIsEditing(newEntryCheck);
    setEditText(entry.text);
    setEditImages(entry.images);
    setShowImageOptions(false);
  }, [entry]);

  const cardWidth = screenWidth - (theme.spacing.md * 2);
  
  // Fixed 4-column grid sizing
  const imagesPerRow = 4;
  const availableWidth = cardWidth - (theme.spacing.md * 2) - (theme.spacing.sm * (imagesPerRow - 1));
  const imageSize = availableWidth / imagesPerRow;

  const formatDisplayDate = () => {
    const date = new Date(entry.date);
    if (isNaN(date.getTime())) return entry.date;
    
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3);
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${weekday} ${month} ${day} ${year}`;
  };

  const handleSave = () => {
    const updatedEntry: ProgressEntry = {
      ...entry,
      images: editImages,
      text: editText,
    };
    onUpdate(updatedEntry);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(entry.text);
    setEditImages(entry.images);
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this progress entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(entry.date) },
      ]
    );
  };

  const handleAddImage = () => {
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
        setEditImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePhotoLibrary = async () => {
    try {
      console.log('Starting photo library selection...');
      setShowImageOptions(false); // Close popover immediately
      
      // Always request permissions explicitly first
      console.log('Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission request result:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to select photos.');
        return;
      }
      
      // Small delay to ensure permissions are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Launching image library...');
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

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Adding image:', result.assets[0].uri);
        setEditImages(prev => [...prev, result.assets[0].uri]);
      } else {
        console.log('Image selection canceled or no assets');
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', `Failed to select photo: ${error.message}`);
    }
  };

  const handleRemoveImage = (index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
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

  return (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.dateTitle}>{formatDisplayDate()}</Text>
            {isNewEntry && !isEditing && (
              <Text style={styles.newEntryLabel}>New Entry</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <IconButton
                  icon="close"
                  onPress={handleCancel}
                  variant="ghost"
                  size="sm"
                />
                <IconButton
                  icon="check"
                  onPress={handleSave}
                  variant="primary"
                  size="sm"
                />
              </>
            ) : (
              <>
                <IconButton
                  icon="edit"
                  onPress={() => setIsEditing(true)}
                  variant="ghost"
                  size="sm"
                />
                {!isNewEntry && (
                  <IconButton
                    icon="delete"
                    onPress={handleDelete}
                    variant="ghost"
                    size="sm"
                  />
                )}
              </>
            )}
          </View>
        </View>

        {isEditing ? (
          <View style={styles.editContainer}>
            <View style={styles.imagesEditSection}>
              <Text style={styles.sectionLabel}>Images</Text>
              <View style={styles.imagesGridContainer}>
                {editImages.map((image, index) => (
                  <View key={index} style={styles.editImageContainer}>
                    <Image 
                      source={{ uri: image }} 
                      style={[styles.editImage, { width: imageSize, height: imageSize }]} 
                    />
                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <MaterialIcon name="close" size={16} color={theme.colors.surface[50]} />
                    </Pressable>
                  </View>
                ))}
                <Pressable 
                  ref={addButtonRef}
                  style={[styles.addImageButton, { width: imageSize, height: imageSize }]} 
                  onPress={handleAddImage}
                >
                  <MaterialIcon name="add" size={20} color={theme.colors.grey[500]} />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.textEditSection}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <TextInput
                style={styles.textInput}
                value={editText}
                onChangeText={setEditText}
                placeholder="Add your progress notes..."
                placeholderTextColor={theme.colors.grey[400]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        ) : (
          <View style={styles.displayContainer}>
            {entry.images.length > 0 && (
              <View style={styles.imagesSection}>
                <View style={styles.imagesGridContainer}>
                  {entry.images.map((image, index) => (
                    <Image
                      key={index}
                      source={{ uri: image }}
                      style={[styles.displayImage, { width: imageSize, height: imageSize }]}
                    />
                  ))}
                </View>
              </View>
            )}

            {entry.text ? (
              <View style={styles.textSection}>
                <Text style={styles.entryText}>{entry.text}</Text>
              </View>
            ) : isNewEntry ? (
              <View style={styles.emptyState}>
                <MaterialIcon name="add-a-photo" size={48} color={theme.colors.grey[400]} />
                <Text style={styles.emptyStateTitle}>No progress recorded yet</Text>
                <Text style={styles.emptyStateDescription}>
                  Tap edit to add photos and notes for this day
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <OptionsPopover
        visible={showImageOptions}
        onClose={() => setShowImageOptions(false)}
        options={getImageOptions()}
        triggerPosition={addButtonPosition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: theme.colors.primary[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  card: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  dateTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.xs,
  },
  newEntryLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.warning[300],
    fontWeight: theme.typography.fontWeight.medium as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  editContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.blue[50],
  },
  displayContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.blue[50],
  },
  imagesEditSection: {
    marginBottom: theme.spacing.lg,
  },
  imagesSection: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[700],
    marginBottom: theme.spacing.sm,
  },
  imagesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  editImageContainer: {
    position: 'relative',
  },
  editImage: {
    borderRadius: theme.radius.md,
  },
  displayImage: {
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
    borderColor: theme.colors.surface[50],
  },
  addImageButton: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.grey[100],
    borderWidth: 2,
    borderColor: theme.colors.grey[300],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    color: theme.colors.grey[500],
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    lineHeight: 12,
  },
  textEditSection: {
    // No additional margin needed
  },
  textSection: {
    // No additional margin needed
  },
  textInput: {
    backgroundColor: theme.colors.surface[100],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.grey[800],
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
    minHeight: 100,
  },
  entryText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.grey[700],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyStateTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[600],
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyStateDescription: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    color: theme.colors.grey[500],
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.callout,
  },
});