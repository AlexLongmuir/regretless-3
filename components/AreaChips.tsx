import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

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
    if (isComplete) return '#E8F5E8' // Light green for completed (same as ActionChipsList)
    return 'white' // Default white
  }

  const ChipWrapper = clickable ? TouchableOpacity : View

  return (
    <ChipWrapper
      onPress={clickable ? () => onPress?.(id) : undefined}
      activeOpacity={clickable ? 0.7 : 1}
      style={[
        {
          width: '48%',
          aspectRatio: 1,
          backgroundColor: getBackgroundColor(),
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          minHeight: 120
        },
        style
      ]}
    >
      {/* Move Up Button */}
      {canMoveUp && onMoveUp && (
        <TouchableOpacity
          onPress={onMoveUp}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#f0f0f0',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-up" size={12} color="#666" />
        </TouchableOpacity>
      )}

      {/* Move Down Button */}
      {canMoveDown && onMoveDown && (
        <TouchableOpacity
          onPress={onMoveDown}
          style={{
            position: 'absolute',
            top: canMoveUp ? 36 : 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#f0f0f0',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={12} color="#666" />
        </TouchableOpacity>
      )}

      {/* Remove Button */}
      {showRemoveButton && onRemove && (
        <TouchableOpacity
          onPress={handleDelete}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#f0f0f0',
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
          onPress={() => onEdit(id)}
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#f0f0f0',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={12} color="#666" />
        </TouchableOpacity>
      )}
      
      <Text style={{ fontSize: 40, marginBottom: 8 }}>{emoji}</Text>
      <Text style={{ 
        fontSize: 16, 
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        marginBottom: showProgress && clickable && totalActions > 0 ? 8 : 0
      }}>
        {title}
      </Text>
      
      {/* Progress Indicator - only show when clickable and has actions */}
      {showProgress && clickable && totalActions > 0 && (
        <View style={{ width: '100%', marginTop: 4 }}>
          {/* Progress Text */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 4
          }}>
            <Text style={{ 
              fontSize: 10, 
              fontWeight: '500',
              color: '#666'
            }}>
              {completedActions} of {totalActions}
            </Text>
            <Text style={{ 
              fontSize: 10, 
              fontWeight: 'bold',
              color: '#666'
            }}>
              {progressPercentage}%
            </Text>
          </View>
          
          {/* Progress Bar */}
          <View style={{
            height: 6,
            backgroundColor: '#E0E0E0',
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <View 
              style={{
                height: '100%',
                backgroundColor: '#4CAF50',
                borderRadius: 3,
                width: `${progressPercentage}%`
              }} 
            />
          </View>
        </View>
      )}
    </ChipWrapper>
  )
}

export function AddAreaChip({ onPress, style }: AddAreaChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
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
        color: '#666',
        textAlign: 'center'
      }}>
        + Add Area
      </Text>
    </TouchableOpacity>
  )
}

// Wrapper component for AddAreaChip positioned in grid
interface AddAreaChipInGridProps {
  onPress: () => void
  style?: any
}

export function AddAreaChipInGrid({ onPress, style }: AddAreaChipInGridProps) {
  return (
    <View style={[
      {
        width: '48%',
        aspectRatio: 1,
        borderRadius: 12,
        marginBottom: 16,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        position: 'relative',
        minHeight: 120
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
}

export function AreaGrid({ areas, onEdit, onRemove, onAdd, onReorder, onPress, clickable = false, showProgress = false, style }: AreaGridProps) {
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
    <View style={[
      {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: 0
      },
      style
    ]}>
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
        />
      ))}
      
      {/* Add Area Button - always in final grid position */}
      <AddAreaChipInGrid onPress={onAdd} />
    </View>
  )
}
