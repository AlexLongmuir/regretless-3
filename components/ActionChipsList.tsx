import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Alert, Modal, TextInput, ScrollView, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from './Button'
import { Input } from './Input'

interface ActionCard {
  id: string
  title: string
  est_minutes?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  repeat_every_days?: number
  acceptance_criteria?: string[]
  due_date?: string
  dream_image?: string
}

interface ActionChipProps {
  action: ActionCard
  onEdit?: (id: string) => void
  onRemove?: (id: string) => void
  showEditButton?: boolean
  showRemoveButton?: boolean
  style?: any
}

interface AddActionChipProps {
  onPress: () => void
  style?: any
}

interface ActionChipsListProps {
  actions: ActionCard[]
  onEdit: (id: string, updatedAction: ActionCard) => void
  onRemove: (id: string) => void
  onAdd: (action: ActionCard) => void
  style?: any
}

export function ActionChip({
  action,
  onEdit,
  onRemove,
  showEditButton = true,
  showRemoveButton = true,
  style
}: ActionChipProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Action',
      `Are you sure you want to delete "${action.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onRemove?.(action.id),
        },
      ],
      { cancelable: true }
    )
  }

  const handleEdit = () => {
    onEdit?.(action.id)
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return { day: '?', month: '???' }
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString('en', { month: 'short' }).toUpperCase()
    return { day, month }
  }

  const isEmoji = (str: string) => {
    return !str.startsWith('http') && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(str)
  }

  const DifficultyBars = ({ difficulty }: { difficulty: string }) => {
    const getBarCount = (diff: string) => {
      switch (diff) {
        case 'easy': return 1
        case 'medium': return 2
        case 'hard': return 3
        default: return 1
      }
    }

    const getBarColor = (diff: string) => {
      switch (diff) {
        case 'easy': return '#4CAF50'
        case 'medium': return '#FF9800'
        case 'hard': return '#F44336'
        default: return '#4CAF50'
      }
    }

    const barCount = getBarCount(difficulty)
    const barColor = getBarColor(difficulty)

    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 12 }}>
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            style={{
              width: 3,
              height: bar * 2 + 4,
              backgroundColor: bar <= barCount ? barColor : '#E0E0E0',
              borderRadius: 1.5
            }}
          />
        ))}
      </View>
    )
  }

  const { day, month } = formatDate(action.due_date || '')

  return (
    <View
      style={[
        {
          backgroundColor: 'white',
          borderRadius: 12,
          position: 'relative',
          overflow: 'hidden',
          padding: 16,
          marginBottom: 16
        },
        style
      ]}
    >
      {showEditButton && onEdit && (
        <TouchableOpacity
          onPress={handleEdit}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#f0f0f0',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1
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
            alignItems: 'center',
            zIndex: 1
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={12} color="#666" />
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', minHeight: 120 }}>
        {/* Left Image Section */}
        <View style={{ width: 120, position: 'relative', marginRight: 16, height: 120 }}>
          {action.dream_image ? (
            isEmoji(action.dream_image) ? (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#f0f0f0',
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 48, textAlign: 'center' }}>
                  {action.dream_image}
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: action.dream_image }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 8
                }}
                resizeMode="cover"
              />
            )
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#f0f0f0',
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Ionicons name="flag" size={32} color="#999" />
            </View>
          )}
          
          {/* Date Overlay */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Text style={{ 
              fontSize: 40, 
              fontWeight: 'bold', 
              color: '#fff', 
              lineHeight: 40,
              textShadowColor: 'rgba(0, 0, 0, 0.5)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 6
            }}>
              {day}
            </Text>
            <Text style={{ 
              fontSize: 12, 
              fontWeight: 'bold', 
              color: '#fff',
              textShadowColor: 'rgba(0, 0, 0, 0.5)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 6
            }}>
              {month}
            </Text>
          </View>
        </View>

        {/* Right Content Section */}
        <View style={{ flex: 1 }}>
          {/* Title */}
          <Text style={{ 
            fontSize: 14, 
            fontWeight: 'bold',
            color: '#000',
            marginBottom: 8,
            lineHeight: 18
          }}>
            {action.title}
          </Text>

          {/* Metadata Row */}
          <View style={{ flexDirection: 'row', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={12} color="#666" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: '#666' }}>
                {formatTime(action.est_minutes || 0)}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DifficultyBars difficulty={action.difficulty || 'medium'} />
              <Text style={{ 
                fontSize: 12, 
                color: '#666',
                fontWeight: '400',
                marginLeft: 6
              }}>
                {(action.difficulty || 'medium').charAt(0).toUpperCase() + (action.difficulty || 'medium').slice(1)}
              </Text>
            </View>
            
            {action.repeat_every_days && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="refresh-outline" size={12} color="#666" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: '#666' }}>
                  {action.repeat_every_days} days
                </Text>
              </View>
            )}
          </View>

          {/* Acceptance Criteria */}
          <View>
            {(action.acceptance_criteria || []).slice(0, 3).map((criterion, index) => (
              <Text key={index} style={{ 
                fontSize: 12, 
                color: '#666', 
                marginBottom: 4,
                lineHeight: 16
              }}>
                • {criterion}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

export function AddActionChip({ onPress, style }: AddActionChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          marginBottom: 16,
          justifyContent: 'flex-start',
          alignItems: 'flex-start'
        },
        style
      ]}
      activeOpacity={0.7}
    >
      <Text style={{ 
        fontSize: 14, 
        fontWeight: '500',
        color: '#666',
        textAlign: 'left'
      }}>
        + Add Action
      </Text>
    </TouchableOpacity>
  )
}

// Edit Action Modal
interface EditActionModalProps {
  visible: boolean
  action: ActionCard | null
  onClose: () => void
  onSave: (updatedAction: ActionCard) => void
}

function EditActionModal({ visible, action, onClose, onSave }: EditActionModalProps) {
  const [formData, setFormData] = useState<ActionCard>({
    id: '',
    title: '',
    est_minutes: 0,
    difficulty: 'medium',
    repeat_every_days: undefined,
    acceptance_criteria: [],
    due_date: '',
    dream_image: ''
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  React.useEffect(() => {
    if (action) {
      setFormData(action)
    }
  }, [action])

  const handleSave = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the action')
      return
    }
    onSave(formData)
    onClose()
  }

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: [...(prev.acceptance_criteria || []), '']
    }))
  }

  const updateCriterion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria?.map((c, i) => i === index ? value : c) || []
    }))
  }

  const removeCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria?.filter((_, i) => i !== index) || []
    }))
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 16,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB'
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Edit Action</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={{ fontSize: 16, color: '#000', fontWeight: '600' }}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Title */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Title</Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter action title"
              style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 12,
                fontSize: 16
              }}
            />
          </View>

          {/* Duration */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Duration (minutes)</Text>
            <TextInput
              value={formData.est_minutes?.toString() || ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, est_minutes: parseInt(text) || 0 }))}
              placeholder="Enter duration in minutes"
              keyboardType="numeric"
              style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 12,
                fontSize: 16
              }}
            />
          </View>

          {/* Difficulty */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Difficulty</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  onPress={() => setFormData(prev => ({ ...prev, difficulty: diff }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: formData.difficulty === diff ? '#000' : 'white',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ 
                    color: formData.difficulty === diff ? 'white' : '#000',
                    fontWeight: '600'
                  }}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Due Date */}
          <View style={{ marginBottom: 16 }}>
            <Input
              label="Due Date"
              value={formData.due_date || ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, due_date: text }))}
              type="date"
              variant="borderless"
              showDatePicker={showDatePicker}
              onToggleDatePicker={() => setShowDatePicker(!showDatePicker)}
              onDateChange={(date) => {
                const dateString = date.toISOString().split('T')[0]
                setFormData(prev => ({ ...prev, due_date: dateString }))
                setShowDatePicker(false)
              }}
            />
          </View>

          {/* Repeat Every Days */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Repeat Every</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { value: undefined, label: 'None' },
                { value: 1, label: '1 day' },
                { value: 2, label: '2 days' },
                { value: 3, label: '3 days' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  onPress={() => setFormData(prev => ({ ...prev, repeat_every_days: option.value }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: formData.repeat_every_days === option.value ? '#000' : 'white',
                    borderRadius: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: formData.repeat_every_days === option.value ? '#000' : '#E5E7EB'
                  }}
                >
                  <Text style={{ 
                    color: formData.repeat_every_days === option.value ? 'white' : '#000',
                    fontWeight: '600',
                    fontSize: 14
                  }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Acceptance Criteria */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Acceptance Criteria</Text>
              <TouchableOpacity onPress={addCriterion}>
                <Text style={{ color: '#000', fontWeight: '600' }}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {(formData.acceptance_criteria || []).map((criterion, index) => (
              <View key={index} style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'center' }}>
                <TextInput
                  value={criterion}
                  onChangeText={(text) => updateCriterion(index, text)}
                  placeholder={`Criterion ${index + 1}`}
                  style={{
                    flex: 1,
                    backgroundColor: 'white',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    marginRight: 8
                  }}
                />
                <TouchableOpacity onPress={() => removeCriterion(index)}>
                  <Ionicons name="close-circle" size={24} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

// Add Action Modal
interface AddActionModalProps {
  visible: boolean
  onClose: () => void
  onSave: (action: ActionCard) => void
}

function AddActionModal({ visible, onClose, onSave }: AddActionModalProps) {
  const [formData, setFormData] = useState<ActionCard>({
    id: '',
    title: '',
    est_minutes: 0,
    difficulty: 'medium',
    repeat_every_days: undefined,
    acceptance_criteria: [],
    due_date: '',
    dream_image: ''
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleSave = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the action')
      return
    }
    const newAction = {
      ...formData,
      id: Date.now().toString() // Generate unique ID
    }
    onSave(newAction)
    onClose()
    // Reset form
    setFormData({
      id: '',
      title: '',
      est_minutes: 0,
      difficulty: 'medium',
      repeat_every_days: undefined,
      acceptance_criteria: [],
      due_date: '',
      dream_image: ''
    })
  }

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: [...(prev.acceptance_criteria || []), '']
    }))
  }

  const updateCriterion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria?.map((c, i) => i === index ? value : c) || []
    }))
  }

  const removeCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria?.filter((_, i) => i !== index) || []
    }))
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 16,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB'
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Add Action</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={{ fontSize: 16, color: '#000', fontWeight: '600' }}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Title */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Title</Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter action title"
              style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 12,
                fontSize: 16
              }}
            />
          </View>

          {/* Duration */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Duration (minutes)</Text>
            <TextInput
              value={formData.est_minutes?.toString() || ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, est_minutes: parseInt(text) || 0 }))}
              placeholder="Enter duration in minutes"
              keyboardType="numeric"
              style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 12,
                fontSize: 16
              }}
            />
          </View>

          {/* Difficulty */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Difficulty</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  onPress={() => setFormData(prev => ({ ...prev, difficulty: diff }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: formData.difficulty === diff ? '#000' : 'white',
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ 
                    color: formData.difficulty === diff ? 'white' : '#000',
                    fontWeight: '600'
                  }}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Due Date */}
          <View style={{ marginBottom: 16 }}>
            <Input
              label="Due Date"
              value={formData.due_date || ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, due_date: text }))}
              type="date"
              variant="borderless"
              showDatePicker={showDatePicker}
              onToggleDatePicker={() => setShowDatePicker(!showDatePicker)}
              onDateChange={(date) => {
                const dateString = date.toISOString().split('T')[0]
                setFormData(prev => ({ ...prev, due_date: dateString }))
                setShowDatePicker(false)
              }}
            />
          </View>

          {/* Repeat Every Days */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Repeat Every</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { value: undefined, label: 'None' },
                { value: 1, label: '1 day' },
                { value: 2, label: '2 days' },
                { value: 3, label: '3 days' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  onPress={() => setFormData(prev => ({ ...prev, repeat_every_days: option.value }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: formData.repeat_every_days === option.value ? '#000' : 'white',
                    borderRadius: 8,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: formData.repeat_every_days === option.value ? '#000' : '#E5E7EB'
                  }}
                >
                  <Text style={{ 
                    color: formData.repeat_every_days === option.value ? 'white' : '#000',
                    fontWeight: '600',
                    fontSize: 14
                  }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Acceptance Criteria */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Acceptance Criteria</Text>
              <TouchableOpacity onPress={addCriterion}>
                <Text style={{ color: '#000', fontWeight: '600' }}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {(formData.acceptance_criteria || []).map((criterion, index) => (
              <View key={index} style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'center' }}>
                <TextInput
                  value={criterion}
                  onChangeText={(text) => updateCriterion(index, text)}
                  placeholder={`Criterion ${index + 1}`}
                  style={{
                    flex: 1,
                    backgroundColor: 'white',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    marginRight: 8
                  }}
                />
                <TouchableOpacity onPress={() => removeCriterion(index)}>
                  <Ionicons name="close-circle" size={24} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

// Main ActionChipsList component
export function ActionChipsList({ actions, onEdit, onRemove, onAdd, style }: ActionChipsListProps) {
  const [editingAction, setEditingAction] = useState<ActionCard | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const handleEdit = (id: string) => {
    const action = actions.find(a => a.id === id)
    if (action) {
      setEditingAction(action)
    }
  }

  const handleSaveEdit = (updatedAction: ActionCard) => {
    onEdit(updatedAction.id, updatedAction)
    setEditingAction(null)
  }

  const handleAdd = () => {
    setShowAddModal(true)
  }

  const handleSaveAdd = (action: ActionCard) => {
    onAdd(action)
    setShowAddModal(false)
  }

  return (
    <View style={[{ gap: 0 }, style]}>
      {actions.map((action) => (
        <ActionChip
          key={action.id}
          action={action}
          onEdit={handleEdit}
          onRemove={onRemove}
        />
      ))}
      
      <AddActionChip onPress={handleAdd} />

      {/* Edit Modal */}
      <EditActionModal
        visible={editingAction !== null}
        action={editingAction}
        onClose={() => setEditingAction(null)}
        onSave={handleSaveEdit}
      />

      {/* Add Modal */}
      <AddActionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveAdd}
      />
    </View>
  )
}