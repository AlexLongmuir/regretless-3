import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions, Image, TextInput, Alert } from 'react-native';
import { theme } from '../utils/theme';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { OptionsPopover } from './OptionsPopover';
import { ImageGallery } from './ImageGallery';
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

  // Reset editing state when entry changes
  useEffect(() => {
    const newEntryCheck = entry.images.length === 0 && entry.text === '';
    setIsEditing(newEntryCheck);
    setEditText(entry.text);
    setEditImages(entry.images);
  }, [entry]);

  const cardWidth = screenWidth - (theme.spacing.md * 2);
  const imageGalleryWidth = cardWidth - (theme.spacing.md * 2);

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
              <ImageGallery
                images={editImages}
                onImagesChange={setEditImages}
                containerWidth={imageGalleryWidth}
                addButtonText="Add Photo"
                emptyStateTitle="No photos added yet"
                emptyStateDescription="Tap add to include progress photos"
              />
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
                <ImageGallery
                  images={entry.images}
                  onImagesChange={() => {}}
                  containerWidth={imageGalleryWidth}
                  editable={false}
                  showAddButton={false}
                />
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