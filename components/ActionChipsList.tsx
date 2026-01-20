import React, { useMemo, useRef, useState } from 'react'
import { Alert, Keyboard, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Button } from './Button'
import { Input } from './Input'
import { useData } from '../contexts/DataContext'
import { SheetHeader } from './SheetHeader'
import { triggerHaptic } from '../utils/haptics'
import { useTheme } from '../contexts/ThemeContext'
import { Theme } from '../utils/theme'

interface ActionCard {
  id: string
  title: string
  est_minutes: number
  difficulty?: 'easy' | 'medium' | 'hard'
  repeat_every_days?: number
  slice_count_target?: number
  acceptance_criteria?: { title: string; description: string }[]
  acceptance_intro?: string
  acceptance_outro?: string
  area_image?: string
  dream_image?: string
  // For action occurrences
  occurrence_no?: number
  due_on?: string
  completed_at?: string
  is_overdue?: boolean
  is_done?: boolean
  // For hiding buttons
  hideEditButtons?: boolean
}

interface ActionChipProps {
  action: ActionCard
  onEdit?: (id: string) => void
  onRemove?: (id: string) => void
  onMoveUp?: (id: string) => void
  onMoveDown?: (id: string) => void
  showEditButton?: boolean
  showRemoveButton?: boolean
  showReorderButtons?: boolean
  isFirst?: boolean
  isLast?: boolean
  style?: any
  onPress?: (id: string) => void
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
  onReorder?: (reorderedActions: ActionCard[]) => void
  onPress?: (id: string) => void
  style?: any
  dreamEndDate?: string
  showLinkToControls?: boolean
  showAddButton?: boolean
}

export function ActionChip({
  action,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  showEditButton = true,
  showRemoveButton = true,
  showReorderButtons = false,
  isFirst = false,
  isLast = false,
  style,
  onPress
}: ActionChipProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

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

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
    return { day, month }
  }

  const getStatusBackgroundColor = () => {
    if (action.is_done) return theme.colors.statusBackground.completed
    if (action.is_overdue) return theme.colors.statusBackground.overdue
    return theme.colors.background.card // Default white
  }


  const isEmoji = (str: string) => {
    if (str.startsWith('http')) return false;
    // Check if it's a single character that's not ASCII
    if (str.length > 2) return false;
    // Simple check: if it contains characters outside ASCII range, likely an emoji
    return /[^\x00-\x7F]/.test(str) && str.length <= 2;
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
        case 'easy': return theme.colors.difficulty.easy
        case 'medium': return theme.colors.difficulty.medium
        case 'hard': return theme.colors.difficulty.hard
        default: return theme.colors.difficulty.easy
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
              backgroundColor: bar <= barCount ? barColor : theme.colors.disabled.inactive,
              borderRadius: 1.5
            }}
          />
        ))}
      </View>
    )
  }


  const handleMainPress = () => {
    if (onPress) {
      triggerHaptic();
      onPress(action.id);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleMainPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.actionCard,
        { backgroundColor: getStatusBackgroundColor() },
        style
      ]}
    >

      {/* Remove Button */}
      {showRemoveButton && onRemove && !action.hideEditButtons && (
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            handleDelete();
          }}
          style={styles.removeButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={12} color={theme.colors.icon.default} />
        </TouchableOpacity>
      )}
      
      {/* Reorder Buttons */}
      {showReorderButtons && !action.hideEditButtons && (
        <View style={styles.reorderContainer}>
          {!isFirst && onMoveUp && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                onMoveUp(action.id);
              }}
              style={styles.reorderButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-up" size={12} color={theme.colors.icon.default} />
            </TouchableOpacity>
          )}
          {!isLast && onMoveDown && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                onMoveDown(action.id);
              }}
              style={styles.reorderButton}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-down" size={12} color={theme.colors.icon.default} />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Edit Button */}
      {showEditButton && onEdit && !action.hideEditButtons && (
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            handleEdit();
          }}
          style={styles.editButton}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={12} color={theme.colors.icon.default} />
        </TouchableOpacity>
      )}

      {/* Left edge image (full height, flush) */}
      <View style={styles.leftImage}>
        {action.area_image || action.dream_image ? (
          isEmoji((action.area_image || action.dream_image) as string) ? (
            <View style={styles.emojiThumb}>
              <Text style={styles.emojiThumbText}>
                {action.area_image || action.dream_image}
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: (action.area_image || action.dream_image) as string }}
              style={styles.thumbImage}
              contentFit="cover"
              transition={200}
            />
          )
        ) : (
          <View style={styles.placeholderThumb}>
            <Ionicons name="flag" size={24} color={theme.colors.icon.tertiary} />
          </View>
        )}
        
        {/* Due Date Overlay */}
        {action.due_on && (
          <View style={styles.dueOverlay}>
            <Text style={styles.dueDay}>
              {formatDueDate(action.due_on).day}
            </Text>
            <Text style={styles.dueMonth}>
              {formatDueDate(action.due_on).month}
            </Text>
          </View>
        )}
      </View>

      {/* Right Content Section (padded) */}
      <View style={styles.rightContent}>
        {/* Title */}
        <Text style={styles.actionTitle}>
          {action.title}
        </Text>

        {/* Metadata Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={theme.colors.icon.default} style={styles.metaIcon} />
            <Text style={styles.metaText}>
              {formatTime(action.est_minutes || 0)}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <DifficultyBars difficulty={action.difficulty || 'medium'} />
            <Text style={styles.difficultyText}>
              {(action.difficulty || 'medium').charAt(0).toUpperCase() + (action.difficulty || 'medium').slice(1)}
            </Text>
          </View>
          
          {action.repeat_every_days && (
            <View style={styles.metaItem}>
              <Ionicons name="refresh-outline" size={12} color={theme.colors.icon.default} style={styles.metaIcon} />
              <Text style={styles.metaText}>
                {action.repeat_every_days} days
              </Text>
            </View>
          )}
          
          {action.slice_count_target && (
            <View style={styles.metaItem}>
              <Ionicons name="layers-outline" size={12} color={theme.colors.icon.default} style={styles.metaIcon} />
              <Text style={styles.metaText}>
                {action.occurrence_no ? `${action.occurrence_no} of ${action.slice_count_target}` : `${action.slice_count_target} repeats`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export function AddActionChip({ onPress, style }: AddActionChipProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const handlePress = () => {
    triggerHaptic();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.addChip,
        style
      ]}
      activeOpacity={0.7}
    >
      <Text style={styles.addChipText}>
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
  const { theme, isDark } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [formData, setFormData] = useState<ActionCard>({
    id: '',
    title: '',
    est_minutes: 0,
    difficulty: 'medium',
    repeat_every_days: undefined,
    slice_count_target: undefined,
    acceptance_criteria: [],
    acceptance_intro: undefined,
    acceptance_outro: undefined,
    dream_image: '',
    occurrence_no: 1
  })

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
    if (!formData.est_minutes || formData.est_minutes <= 0) {
      Alert.alert('Error', 'Please enter a valid duration in minutes')
      return
    }
    onSave(formData)
    onClose()
  }

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: [...(prev.acceptance_criteria || []), { title: '', description: '' }]
    }))
  }

  const updateCriterion = (index: number, field: 'title' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria?.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ) || []
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
      <View style={styles.modalRoot}>
        {/* Header */}
        <SheetHeader
          title="Edit Action"
          onClose={onClose}
          onDone={handleSave}
        />

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 16, paddingBottom: 400 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter action title"
              placeholderTextColor={theme.colors.text.tertiary}
              style={styles.textInput}
            />
          </View>

          {/* Duration */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Duration (minutes)</Text>
            <TextInput
              value={formData.est_minutes > 0 ? formData.est_minutes.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, est_minutes: text ? parseInt(text) : 0 }))}
              placeholder="Enter duration in minutes"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
              style={styles.textInput}
            />
          </View>

          {/* Difficulty */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Difficulty</Text>
            <View style={styles.pillRow}>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  onPress={() => {
                    triggerHaptic();
                    setFormData(prev => ({ ...prev, difficulty: diff }));
                  }}
                  style={[
                    styles.pill,
                    formData.difficulty === diff ? styles.pillActive : styles.pillInactive
                  ]}
                >
                  <Text style={[
                    styles.pillText,
                    formData.difficulty === diff ? styles.pillTextActive : styles.pillTextInactive
                  ]}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>


          {/* Repeat Every Days */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Repeat Every</Text>
            <View style={styles.pillRow}>
              {[
                { value: undefined, label: 'None' },
                { value: 1, label: '1 day' },
                { value: 2, label: '2 days' },
                { value: 3, label: '3 days' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  onPress={() => {
                    triggerHaptic();
                    setFormData(prev => ({ ...prev, repeat_every_days: option.value }));
                  }}
                  style={[
                    styles.pill,
                    formData.repeat_every_days === option.value ? styles.pillActive : styles.pillInactive
                  ]}
                >
                  <Text style={[
                    styles.pillText,
                    formData.repeat_every_days === option.value ? styles.pillTextActive : styles.pillTextInactive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Slice Count Target */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Total Steps (optional)</Text>
            <TextInput
              value={formData.slice_count_target ? formData.slice_count_target.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, slice_count_target: text ? parseInt(text) : undefined }))}
              placeholder="How many times will you do this?"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
              style={styles.textInput}
            />
            <Text style={styles.helpText}>
              For actions you'll complete a specific number of times (e.g., "Do this 5 times"). Leave empty for one-off or repeating actions.
            </Text>
          </View>

          {/* Acceptance Criteria */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.modalLabel}>Acceptance Criteria</Text>
              <TouchableOpacity onPress={() => {
                triggerHaptic();
                addCriterion();
              }}>
                <Text style={styles.addBulletText}>+ Add Bullet</Text>
              </TouchableOpacity>
            </View>
            
            {/* Intro */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.subLabel}>Intro (optional)</Text>
              <TextInput
                value={formData.acceptance_intro || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, acceptance_intro: text || undefined }))}
                placeholder="One sentence setting intention..."
                multiline
                placeholderTextColor={theme.colors.text.tertiary}
                style={[styles.textInput, styles.multilineInput]}
              />
            </View>

            {/* Bullets */}
            {(formData.acceptance_criteria || []).map((criterion, index) => (
              <View key={index} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.stepLabel}>
                    Step {index + 1}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    triggerHaptic();
                    removeCriterion(index);
                  }}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.icon.error} />
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  value={criterion.title}
                  onChangeText={(text) => updateCriterion(index, 'title', text)}
                  placeholder="Short title (e.g. 'Read 10 pages')"
                  placeholderTextColor={theme.colors.text.tertiary}
                  style={[styles.textInput, styles.criteriaInputTitle]}
                />
                
                <TextInput
                  value={criterion.description}
                  onChangeText={(text) => updateCriterion(index, 'description', text)}
                  placeholder="Description (e.g. 'Focus on understanding key concepts...')"
                  placeholderTextColor={theme.colors.text.tertiary}
                  multiline
                  style={[styles.textInput, styles.criteriaInputDescription]}
                />
              </View>
            ))}

            {/* Outro */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.subLabel}>Outro (optional)</Text>
              <TextInput
                value={formData.acceptance_outro || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, acceptance_outro: text || undefined }))}
                placeholder="One sentence defining 'done'..."
                multiline
                placeholderTextColor={theme.colors.text.tertiary}
                style={[styles.textInput, styles.multilineInput]}
              />
            </View>
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
  dreamEndDate?: string
  showLinkToControls?: boolean
}

export function AddActionModal({ visible, onClose, onSave, dreamEndDate, showLinkToControls }: AddActionModalProps) {
  const { theme, isDark } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [formData, setFormData] = useState<ActionCard>({
    id: '',
    title: '',
    est_minutes: 0,
    difficulty: 'medium',
    repeat_every_days: undefined,
    slice_count_target: undefined,
    acceptance_criteria: [],
    acceptance_intro: undefined,
    acceptance_outro: undefined,
    dream_image: '',
    occurrence_no: 1
  })
  const [dueDate, setDueDate] = useState<Date>(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [focusedCriterionIndex, setFocusedCriterionIndex] = useState<number | null>(null)
  const scrollViewRef = useRef<ScrollView>(null)
  const [actionType, setActionType] = useState<'one-off' | 'repeating' | 'finite'>('one-off')
  const [linkMode, setLinkMode] = useState<'inbox' | 'choose'>('inbox')
  const [selectedDreamId, setSelectedDreamId] = useState<string | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const { state, getDreamsSummary, getDreamDetail } = useData()

  React.useEffect(() => {
    if (showLinkToControls && visible && !state.dreamsSummary) {
      getDreamsSummary({ force: true })
    }
  }, [showLinkToControls, visible])

  const areasForSelectedDream = React.useMemo(() => {
    if (!selectedDreamId) return [] as { id: string; title: string }[]
    const dd = state.dreamDetail[selectedDreamId]
    return (dd?.areas || []).map(a => ({ id: a.id as any, title: (a as any).title }))
  }, [selectedDreamId, state.dreamDetail])

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the action')
      return
    }
    if (!formData.est_minutes || formData.est_minutes <= 0) {
      Alert.alert('Error', 'Please enter a valid duration in minutes')
      return
    }
    const newAction = {
      ...formData,
      id: Date.now().toString(), // Generate unique ID
      due_on: dueDate.toISOString().split('T')[0],
      // Pass optional linking hints for TodayPage handler
      __linkMode: showLinkToControls ? linkMode : undefined,
      __dreamId: showLinkToControls ? selectedDreamId : undefined,
      __areaId: showLinkToControls ? selectedAreaId : undefined
    }
    try {
      setIsSaving(true)
      await Promise.resolve(onSave(newAction))
      onClose()
    } finally {
      setIsSaving(false)
    }
    // Reset form
    setFormData({
      id: '',
      title: '',
      est_minutes: 0,
      difficulty: 'medium',
      repeat_every_days: undefined,
      slice_count_target: undefined,
      acceptance_criteria: [],
      acceptance_intro: undefined,
      acceptance_outro: undefined,
      dream_image: '',
      occurrence_no: 1
    })
    setDueDate(new Date())
    setFocusedCriterionIndex(null)
  }

  const addCriterion = () => {
    const newIndex = (formData.acceptance_criteria || []).length
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: [...(prev.acceptance_criteria || []), { title: '', description: '' }]
    }))
    setFocusedCriterionIndex(newIndex)
    // Scroll to bottom after a brief delay to show the new input
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 300)
  }

  const updateCriterion = (index: number, field: 'title' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria?.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ) || []
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
      <View style={styles.modalRoot}>
        {/* Header */}
        <SheetHeader
          title="Add Action"
          onClose={onClose}
          onDone={handleSave}
          doneDisabled={isSaving}
          doneLoading={isSaving}
        />

        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 16, paddingBottom: 400 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showLinkToControls && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.modalLabel}>Link To</Text>
              <View style={[styles.pillRow, { marginBottom: 12 }]}>
                {(['inbox','choose'] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      triggerHaptic();
                      setLinkMode(opt);
                    }}
                    style={[
                      styles.pill,
                      linkMode === opt ? styles.pillActive : styles.pillInactive
                    ]}
                  >
                    <Text style={[
                      styles.pillText,
                      linkMode === opt ? styles.pillTextActive : styles.pillTextInactive
                    ]}>
                      {opt === 'inbox' ? 'Inbox' : 'Choose Goal'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {linkMode === 'choose' && (
                <>
                  <Text style={styles.smallSectionLabel}>Dream</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {(state.dreamsSummary?.dreams || []).map(d => (
                      <TouchableOpacity
                        key={d.id}
                        onPress={async () => {
                          triggerHaptic();
                          setSelectedDreamId(d.id)
                          setSelectedAreaId(null)
                          if (!state.dreamDetail[d.id]) {
                            await getDreamDetail(d.id, { force: true })
                          }
                        }}
                        style={[
                          styles.chip,
                          selectedDreamId === d.id ? styles.chipActive : styles.chipInactive
                        ]}
                      >
                        <Text style={selectedDreamId === d.id ? styles.chipTextActive : styles.chipTextInactive}>
                          {(d as any).title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {selectedDreamId && (
                    <>
                      <Text style={styles.smallSectionLabel}>Area</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {areasForSelectedDream.map(a => (
                          <TouchableOpacity
                            key={a.id}
                            onPress={() => {
                              triggerHaptic();
                              setSelectedAreaId(a.id);
                            }}
                            style={[
                              styles.chip,
                              selectedAreaId === a.id ? styles.chipActive : styles.chipInactive
                            ]}
                          >
                            <Text style={selectedAreaId === a.id ? styles.chipTextActive : styles.chipTextInactive}>
                              {a.title}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  )}
                </>
              )}
            </View>
          )}
          {/* Title */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter action title"
              placeholderTextColor={theme.colors.text.tertiary}
              style={styles.textInput}
            />
          </View>

          {/* Duration */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Duration (minutes)</Text>
            <TextInput
              value={formData.est_minutes > 0 ? formData.est_minutes.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, est_minutes: text ? parseInt(text) : 0 }))}
              placeholder="Enter duration in minutes"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
              style={styles.textInput}
            />
          </View>

          {/* Due Date */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Due Date</Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                Keyboard.dismiss();
                setShowDatePicker(true);
              }}
              style={styles.textInput}
            >
              <Text style={styles.dateText}>
                {dueDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) {
                      setDueDate(selectedDate);
                    }
                  }}
                  minimumDate={new Date()}
                  maximumDate={dreamEndDate ? new Date(dreamEndDate) : undefined}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
                {Platform.OS === 'ios' && (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        setShowDatePicker(false);
                      }}
                      style={styles.datePickerDoneButton}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Acceptance Criteria */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.modalLabel}>Acceptance Criteria</Text>
              <TouchableOpacity onPress={() => {
                triggerHaptic();
                addCriterion();
              }}>
                <Text style={styles.addBulletText}>+ Add Bullet</Text>
              </TouchableOpacity>
            </View>
            
            {/* Intro */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.subLabel}>Intro (optional)</Text>
              <TextInput
                value={formData.acceptance_intro || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, acceptance_intro: text || undefined }))}
                placeholder="One sentence setting intention..."
                multiline
                placeholderTextColor={theme.colors.text.tertiary}
                style={[styles.textInput, styles.multilineInput]}
              />
            </View>

            {/* Bullets */}
            {(formData.acceptance_criteria || []).map((criterion, index) => (
              <View key={index} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.stepLabel}>
                    Step {index + 1}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    triggerHaptic();
                    removeCriterion(index);
                  }}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.icon.error} />
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  value={criterion.title}
                  onChangeText={(text) => updateCriterion(index, 'title', text)}
                  placeholder="Short title (e.g. 'Read 10 pages')"
                  placeholderTextColor={theme.colors.text.tertiary}
                  style={[styles.textInput, styles.criteriaInputTitle]}
                />
                
                <TextInput
                  value={criterion.description}
                  onChangeText={(text) => updateCriterion(index, 'description', text)}
                  placeholder="Description (e.g. 'Focus on understanding key concepts...')"
                  placeholderTextColor={theme.colors.text.tertiary}
                  multiline
                  style={[styles.textInput, styles.criteriaInputDescription]}
                />
              </View>
            ))}

            {/* Outro */}
            <View style={{ marginTop: 12 }}>
              <Text style={styles.subLabel}>Outro (optional)</Text>
              <TextInput
                value={formData.acceptance_outro || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, acceptance_outro: text || undefined }))}
                placeholder="One sentence defining 'done'..."
                multiline
                placeholderTextColor={theme.colors.text.tertiary}
                style={[styles.textInput, styles.multilineInput]}
              />
            </View>
          </View>

          {/* Action Type */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Action Type</Text>
            <View style={styles.pillRow}>
              {[
                { value: 'one-off' as const, label: 'One-off' },
                { value: 'repeating' as const, label: 'Repeating' },
                { value: 'finite' as const, label: 'Finite' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    triggerHaptic();
                    setActionType(option.value);
                    if (option.value === 'one-off') {
                      setFormData(prev => ({ ...prev, repeat_every_days: undefined, slice_count_target: undefined }));
                    }
                  }}
                  style={[
                    styles.pill,
                    actionType === option.value ? styles.pillActive : styles.pillInactive
                  ]}
                >
                  <Text style={[
                    styles.pillText,
                    actionType === option.value ? styles.pillTextActive : styles.pillTextInactive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Repeat Every Days - shown only when repeating */}
          {actionType === 'repeating' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.modalLabel}>Repeat Every</Text>
              <View style={styles.pillRow}>
                {[
                  { value: 1, label: '1 day' },
                  { value: 2, label: '2 days' },
                  { value: 3, label: '3 days' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      triggerHaptic();
                      setFormData(prev => ({ 
                        ...prev, 
                        repeat_every_days: option.value as 1 | 2 | 3
                      }));
                    }}
                    style={[
                      styles.pill,
                      formData.repeat_every_days === option.value ? styles.pillActive : styles.pillInactive
                    ]}
                  >
                    <Text style={[
                      styles.pillText,
                      formData.repeat_every_days === option.value ? styles.pillTextActive : styles.pillTextInactive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Total Steps - shown only when finite */}
          {actionType === 'finite' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.modalLabel}>Total Steps</Text>
              <TextInput
                value={formData.slice_count_target ? formData.slice_count_target.toString() : ''}
                onChangeText={(text) => {
                  const num = text ? parseInt(text) : undefined;
                  // Validate: must be between 1 and 32767 (smallint max)
                  if (num !== undefined && (num < 1 || num > 32767)) {
                    Alert.alert('Invalid Value', 'Total steps must be between 1 and 32767');
                    return;
                  }
                  setFormData(prev => ({ 
                    ...prev, 
                    slice_count_target: num
                  }));
                }}
                placeholder="How many times will you do this?"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="numeric"
                style={styles.textInput}
              />
              <Text style={styles.helpText}>
                For actions you'll complete a specific number of times (e.g., "Do this 5 times")
              </Text>
            </View>
          )}

          {/* Difficulty */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.modalLabel}>Difficulty</Text>
            <View style={styles.pillRow}>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  onPress={() => {
                    triggerHaptic();
                    setFormData(prev => ({ ...prev, difficulty: diff }));
                  }}
                  style={[
                    styles.pill,
                    formData.difficulty === diff ? styles.pillActive : styles.pillInactive
                  ]}
                >
                  <Text style={[
                    styles.pillText,
                    formData.difficulty === diff ? styles.pillTextActive : styles.pillTextInactive
                  ]}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  actionCard: {
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
    height: 100,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: theme.colors.disabled.inactiveAlt,
  },
  reorderContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'column',
    gap: 4,
    zIndex: 1,
  },
  reorderButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.disabled.inactiveAlt,
  },
  editButton: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: theme.colors.disabled.inactiveAlt,
  },
  row: {
    flexDirection: 'row',
    minHeight: 100,
    alignItems: 'center',
  },
  leftImage: {
    width: 100,
    alignSelf: 'stretch',
    position: 'relative',
  },
  thumbImage: {
    width: 100,
    height: '100%',
  },
  emojiThumb: {
    width: 100,
    height: '100%',
    backgroundColor: theme.colors.disabled.inactiveAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiThumbText: {
    fontSize: 32,
    textAlign: 'center',
    color: theme.colors.text.primary,
  },
  placeholderThumb: {
    width: 100,
    height: '100%',
    backgroundColor: theme.colors.disabled.inactiveAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dueOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueDay: {
    fontSize: 40,
    fontWeight: '700',
    color: theme.colors.text.inverse,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    lineHeight: 40,
  },
  dueMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.inverse,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    marginTop: -8,
  },
  rightContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  difficultyText: {
    fontSize: 12,
    color: theme.colors.text.muted,
    fontWeight: '400',
    marginLeft: 6,
  },
  addChip: {
    marginBottom: 16,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  addChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.muted,
    textAlign: 'left',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text.primary,
  },
  smallSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: theme.colors.text.primary,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: theme.colors.text.muted,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: 4,
  },
  addBulletText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginRight: 8,
  },
  textInput: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    minHeight: 44,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  multilineInput: {
    minHeight: 44,
  },
  criteriaInputTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  criteriaInputDescription: {
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: theme.colors.border.selected,
    borderColor: theme.colors.border.selected,
  },
  pillInactive: {
    backgroundColor: theme.colors.background.card,
    borderColor: theme.colors.border.default,
  },
  pillText: {
    fontWeight: '600',
    fontSize: 14,
  },
  pillTextActive: {
    color: theme.colors.text.inverse,
  },
  pillTextInactive: {
    color: theme.colors.text.primary,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: theme.colors.border.selected,
    borderColor: theme.colors.border.selected,
  },
  chipInactive: {
    backgroundColor: theme.colors.background.card,
    borderColor: theme.colors.border.default,
  },
  chipTextActive: {
    color: theme.colors.text.inverse,
  },
  chipTextInactive: {
    color: theme.colors.text.primary,
  },
  datePickerDoneButton: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  datePickerDoneText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
})

// Main ActionChipsList component
export function ActionChipsList({ actions, onEdit, onRemove, onAdd, onReorder, onPress, style, dreamEndDate, showAddButton = true }: ActionChipsListProps) {
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

  const handleMoveUp = (id: string) => {
    const currentIndex = actions.findIndex(a => a.id === id)
    if (currentIndex > 0) {
      const newActions = [...actions]
      const temp = newActions[currentIndex]
      newActions[currentIndex] = newActions[currentIndex - 1]
      newActions[currentIndex - 1] = temp
      onReorder?.(newActions)
    }
  }

  const handleMoveDown = (id: string) => {
    const currentIndex = actions.findIndex(a => a.id === id)
    if (currentIndex < actions.length - 1) {
      const newActions = [...actions]
      const temp = newActions[currentIndex]
      newActions[currentIndex] = newActions[currentIndex + 1]
      newActions[currentIndex + 1] = temp
      onReorder?.(newActions)
    }
  }

  return (
    <View style={[{ gap: 0 }, style]}>
      {actions.map((action, index) => (
        <ActionChip
          key={action.id}
          action={action}
          onEdit={handleEdit}
          onRemove={onRemove}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          showReorderButtons={true}
          isFirst={index === 0}
          isLast={index === actions.length - 1}
          onPress={onPress}
        />
      ))}
      
      {showAddButton && <AddActionChip onPress={handleAdd} />}

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
        dreamEndDate={dreamEndDate}
      />
    </View>
  )
}