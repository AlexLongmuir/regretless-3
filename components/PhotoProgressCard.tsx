import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, Pressable } from 'react-native';
import { theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Input } from './Input';
import { Button } from './Button';

const { width: screenWidth } = Dimensions.get('window');

interface PhotoProgressCardProps {
  recentImages?: string[];
  onAddPhoto?: () => void;
  onTakePhoto?: () => void;
  onPhotoLibrary?: () => void;
  onAddProgress?: () => void;
  inputText?: string;
  onInputChange?: (text: string) => void;
  style?: any;
}

export const PhotoProgressCard: React.FC<PhotoProgressCardProps> = ({
  recentImages = [],
  onAddPhoto,
  onTakePhoto,
  onPhotoLibrary,
  onAddProgress,
  inputText = '',
  onInputChange,
  style,
}) => {
  const photoButtonRef = useRef<View>(null);
  
  // Create a 5x5 grid (25 slots)
  const totalSlots = 25;
  const cardWidth = screenWidth - (theme.spacing.md * 2);
  const itemSize = (cardWidth - (theme.spacing.md * 2) - (theme.spacing.xs * 4)) / 5;
  
  return (
    <View style={[styles.cardContainer, style]}>
      {/* Image Grid with Blue Background */}
      <View style={styles.card}>
        <View style={styles.topSection}>
          {recentImages.length > 0 && (
            <View style={styles.imageGrid}>
              {recentImages.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={[styles.gridImage, { width: itemSize, height: itemSize }]}
                />
              ))}
            </View>
          )}
          
          {recentImages.length === 0 && (
            <View style={styles.gradientOverlay}>
              <Text style={styles.emptyText}>No photos uploaded yet. Add your first progress photo below!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Input and Upload Section */}
      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <Input
            value={inputText}
            onChangeText={onInputChange}
            placeholder="Add notes about your progress..."
            style={styles.textInput}
          />
          <Pressable
            ref={photoButtonRef}
            style={styles.photoButton}
            onPress={onAddPhoto}
          >
            <Icon name="photo-camera" size={24} color={theme.colors.grey[800]} />
          </Pressable>
        </View>
        
        <View style={styles.buttonRow}>
          <Button
            title="Add Progress Update"
            onPress={onAddProgress}
            style={styles.progressButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary[600],
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
    overflow: 'hidden',
  },
  topSection: {
    backgroundColor: theme.colors.primary[600],
    position: 'relative',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: 0,
  },
  gridImage: {
    borderRadius: theme.radius.lg,
  },
  gradientOverlay: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.xs,
    marginTop: 0,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.surface[50],
    opacity: 0.9,
  },
  photoCountText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.surface[50],
    opacity: 0.9,
  },
  inputArea: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  textInput: {
    flex: 1,
    marginBottom: 0,
  },
  photoButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.defaultGrey,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    alignItems: 'stretch',
  },
  progressButton: {
    width: '100%',
    backgroundColor: theme.colors.primary[800],
  },
});