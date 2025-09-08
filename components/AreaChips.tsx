import React from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface AreaChipProps {
  id: string
  title: string
  emoji: string
  onEdit?: (id: string) => void
  onRemove?: (id: string) => void
  showEditButton?: boolean
  showRemoveButton?: boolean
  style?: any
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
  showEditButton = true,
  showRemoveButton = true,
  style
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
  return (
    <View
      style={[
        {
          width: '48%',
          aspectRatio: 1,
          backgroundColor: 'white',
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
      {showEditButton && onEdit && (
        <TouchableOpacity
          onPress={() => onEdit(id)}
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
          <Ionicons name="create-outline" size={12} color="#666" />
        </TouchableOpacity>
      )}
      
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
      
      <Text style={{ fontSize: 40, marginBottom: 8 }}>{emoji}</Text>
      <Text style={{ 
        fontSize: 16, 
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center'
      }}>
        {title}
      </Text>
    </View>
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
}

interface AreaGridProps {
  areas: AreaSuggestion[]
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
  style?: any
}

export function AreaGrid({ areas, onEdit, onRemove, onAdd, style }: AreaGridProps) {
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
      {areas.map((area) => (
        <AreaChip
          key={area.id}
          id={area.id}
          title={area.title}
          emoji={area.emoji}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
      
      {/* Add Area Button - always in final grid position */}
      <AddAreaChipInGrid onPress={onAdd} />
    </View>
  )
}
