import React, { useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { Theme } from '../utils/theme'
import { triggerHaptic } from '../utils/haptics'

interface AreaChipProps {
  id: string
  title: string
  emoji: string
  imageUrl?: string
  onEdit?: (id: string) => void
  onRemove?: (id: string) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  showEditButton?: boolean
  showRemoveButton?: boolean
  style?: any
  onPress?: (id: string) => void
  clickable?: boolean
  // Progress indicator props
  showProgress?: boolean
  completedActions?: number
  totalActions?: number
}

interface AddAreaChipProps {
  onPress: () => void
  style?: any
}

export function AreaChip({
  id,
  title,
  emoji,
  imageUrl,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  showEditButton = true,
  showRemoveButton = true,
  style,
  onPress,
  clickable = false,
  showProgress = false,
  completedActions = 0,
  totalActions = 0
}: AreaChipProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme])
  const handleDelete = () => {
    Alert.alert(
      'Delete Area',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onRemove?.(id),
        },
      ],
      { cancelable: true }
    )
  }

  // Calculate progress
  const progressPercentage = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0
  const isComplete = totalActions > 0 && completedActions === totalActions

  // Get background color based on completion status
  const getBackgroundColor = () => {
    if (isComplete) return theme.colors.statusBackground.completed
    return theme.colors.background.card // Default white
  }

  const ChipWrapper = clickable ? TouchableOpacity : View

  const handlePress = () => {
    if (clickable) {
      triggerHaptic();
      onPress?.(id);
    }
  };

  return (
    <ChipWrapper
      onPress={clickable ? handlePress : undefined}
      activeOpacity={clickable ? 0.7 : 1}
      style={[
        styles.chipRoot,
        { backgroundColor: getBackgroundColor() },
        style
      ]}
    >
      {/* Move Up Button */}
      {canMoveUp && onMoveUp && (
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            onMoveUp();
          }}
          style={styles.moveButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-up" size={12} color={theme.colors.icon.default} />
        </TouchableOpacity>
      )}

      {/* Move Down Button */}
      {canMoveDown && onMoveDown && (
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            onMoveDown();
          }}
          style={[styles.moveButton, { top: canMoveUp ? 36 : 8 }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={12} color={theme.colors.icon.default} />
        </TouchableOpacity>
      )}

      {/* Remove Button */}
      {showRemoveButton && onRemove && (
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            handleDelete();
          }}
          style={styles.removeButton}
        >
          <Text style={{ fontSize: 12 }}>✕</Text>
        </TouchableOpacity>
      )}
      
      {/* Edit Button */}
      {showEditButton && onEdit && (
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            onEdit(id);
          }}
          style={styles.editButton}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={12} color={theme.colors.icon.default} />
        </TouchableOpacity>
      )}
      
      {/* Left edge image/emoji (full height, flush) */}
      <View style={styles.leftMedia}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.leftMediaImage} contentFit="cover" />
        ) : (
          <View style={styles.leftMediaEmojiWrap}>
            <Text style={styles.leftMediaEmoji}>{emoji}</Text>
          </View>
        )}
      </View>
      
      {/* Title and Progress on the right */}
      <View style={styles.rightContent}>
        <Text style={[styles.title, { marginBottom: showProgress && clickable && totalActions > 0 ? 8 : 0 }]}>
          {title}
        </Text>
        
        {/* Progress Indicator - only show when clickable and has actions */}
        {showProgress && clickable && totalActions > 0 && (
          <View style={styles.progressWrap}>
            {/* Progress Text */}
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                {completedActions} of {totalActions}
              </Text>
              <Text style={styles.progressTextBold}>
                {progressPercentage}%
              </Text>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${progressPercentage}%` }]}
              />
            </View>
          </View>
        )}
      </View>
    </ChipWrapper>
  )
}

export function AddAreaChip({ onPress, style }: AddAreaChipProps) {
  const { theme } = useTheme();
  
  const handlePress = () => {
    triggerHaptic();
    onPress();
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        {
          justifyContent: 'center',
          alignItems: 'center'
        },
        style
      ]}
    >
      <Text style={{ 
        fontSize: 14, 
        fontWeight: '500',
        color: theme.colors.text.tertiary,
        textAlign: 'center'
      }}>
        + Add Area
      </Text>
    </TouchableOpacity>
  )
}

// Wrapper component for AddAreaChip in vertical layout
interface AddAreaChipInGridProps {
  onPress: () => void
  style?: any
}

export function AddAreaChipInGrid({ onPress, style }: AddAreaChipInGridProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[
      {
        width: '100%',
        borderRadius: 12,
        marginBottom: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 100,
        borderWidth: 2,
        borderColor: theme.colors.border.default,
        borderStyle: 'dashed'
      },
      style
    ]}>
      <AddAreaChip onPress={onPress} />
    </View>
  )
}

// AreaGrid component that handles all spacing and layout
interface AreaSuggestion {
  id: string
  title: string
  emoji: string
  imageUrl?: string
  completedActions?: number
  totalActions?: number
}

interface AreaGridProps {
  areas: AreaSuggestion[]
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
  onReorder?: (areas: AreaSuggestion[]) => void
  onPress?: (id: string) => void
  clickable?: boolean
  showProgress?: boolean
  style?: any
  title?: string
  showAddButton?: boolean
  showEditButtons?: boolean
  showRemoveButtons?: boolean
}

export function AreaGrid({ areas, onEdit, onRemove, onAdd, onReorder, onPress, clickable = false, showProgress = false, style, title = "Areas", showAddButton = true, showEditButtons = true, showRemoveButtons = true }: AreaGridProps) {
  const { theme } = useTheme();
  
  const handleMoveUp = (index: number) => {
    if (index > 0 && onReorder) {
      const newAreas = [...areas]
      const [movedArea] = newAreas.splice(index, 1)
      newAreas.splice(index - 1, 0, movedArea)
      onReorder(newAreas)
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < areas.length - 1 && onReorder) {
      const newAreas = [...areas]
      const [movedArea] = newAreas.splice(index, 1)
      newAreas.splice(index + 1, 0, movedArea)
      onReorder(newAreas)
    }
  }

  return (
    <View style={style}>
      {/* Header with title and add button - only show if there's a title or add button */}
      {(title || showAddButton) && (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          {title && (
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: theme.colors.text.primary, // grey[900]
            }}>
              {title}
            </Text>
          )}
          {showAddButton && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                onAdd();
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: theme.colors.icon.secondary, // grey[500]
              }}>
                +
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Areas List - Vertical Stacking */}
      <View>
        {areas.map((area, index) => (
          <AreaChip
            key={area.id}
            id={area.id}
            title={area.title}
            emoji={area.emoji}
            imageUrl={area.imageUrl}
            onEdit={onEdit}
            onRemove={onRemove}
            onMoveUp={onReorder ? () => handleMoveUp(index) : undefined}
            onMoveDown={onReorder ? () => handleMoveDown(index) : undefined}
            canMoveUp={index > 0}
            canMoveDown={index < areas.length - 1}
            onPress={onPress}
            clickable={clickable}
            showProgress={showProgress}
            completedActions={area.completedActions}
            totalActions={area.totalActions}
            showEditButton={showEditButtons}
            showRemoveButton={showRemoveButtons}
          />
        ))}
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  chipRoot: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
    height: 100,
    overflow: 'hidden',
  },
  leftMedia: {
    width: 100,
    alignSelf: 'stretch',
  },
  leftMediaImage: {
    width: 100,
    height: '100%',
  },
  leftMediaEmojiWrap: {
    width: 100,
    height: '100%',
    backgroundColor: theme.colors.disabled.inactiveAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftMediaEmoji: {
    fontSize: 40,
    color: theme.colors.text.primary,
  },
  rightContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    flexWrap: 'wrap',
  },
  progressWrap: {
    width: '100%',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.muted,
  },
  progressTextBold: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.muted,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.disabled.inactive,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.status.completed,
    borderRadius: 3,
  },
  moveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.disabled.inactiveAlt,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.disabled.inactiveAlt,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  editButton: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.disabled.inactiveAlt,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
})
