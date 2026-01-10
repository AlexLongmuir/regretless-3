import React, { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { Theme } from '../utils/theme'
import { triggerHaptic } from '../utils/haptics'

interface AreaChipProps {
  id: string
  title: string
  emoji: string
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
        {
          width: '100%',
          backgroundColor: getBackgroundColor(),
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          position: 'relative',
          minHeight: 80
        },
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
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.disabled.inactiveAlt,
            justifyContent: 'center',
            alignItems: 'center'
          }}
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
          style={{
            position: 'absolute',
            top: canMoveUp ? 36 : 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.disabled.inactiveAlt,
            justifyContent: 'center',
            alignItems: 'center'
          }}
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
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.disabled.inactiveAlt,
            justifyContent: 'center',
            alignItems: 'center'
          }}
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
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.colors.disabled.inactiveAlt,
            justifyContent: 'center',
            alignItems: 'center'
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={12} color={theme.colors.icon.default} />
        </TouchableOpacity>
      )}
      
      {/* Icon on the left */}
      <View style={{ marginRight: 16 }}>
        <Text style={{ fontSize: 40 }}>{emoji}</Text>
      </View>
      
      {/* Title and Progress on the right */}
      <View style={{ flex: 1 }}>
        <Text style={{ 
          fontSize: 16, 
          fontWeight: 'bold',
          color: theme.colors.text.primary,
          marginBottom: showProgress && clickable && totalActions > 0 ? 8 : 0
        }}>
          {title}
        </Text>
        
        {/* Progress Indicator - only show when clickable and has actions */}
        {showProgress && clickable && totalActions > 0 && (
          <View style={{ width: '100%' }}>
            {/* Progress Text */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 4
            }}>
              <Text style={{ 
                fontSize: 12, 
                fontWeight: '500',
                color: theme.colors.text.muted
              }}>
                {completedActions} of {totalActions}
              </Text>
              <Text style={{ 
                fontSize: 12, 
                fontWeight: 'bold',
                color: theme.colors.text.muted
              }}>
                {progressPercentage}%
              </Text>
            </View>
            
            {/* Progress Bar */}
            <View style={{
              height: 6,
              backgroundColor: theme.colors.disabled.inactive,
              borderRadius: 3,
              overflow: 'hidden'
            }}>
              <View 
                style={{
                  height: '100%',
                  backgroundColor: theme.colors.status.completed,
                  borderRadius: 3,
                  width: `${progressPercentage}%`
                }} 
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
        minHeight: 80,
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
