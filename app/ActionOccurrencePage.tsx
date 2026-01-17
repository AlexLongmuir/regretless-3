import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
  Pressable,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/Icon';
import type { SkillType } from '../backend/database/types';

const SKILL_EMOJIS: Record<SkillType, string> = {
  'Fitness': '🏃',
  'Strength': '💪',
  'Nutrition': '🥗',
  'Writing': '✍️',
  'Learning': '📚',
  'Languages': '🗣️',
  'Music': '🎵',
  'Creativity': '🎨',
  'Business': '💼',
  'Marketing': '📢',
  'Sales': '💰',
  'Mindfulness': '🧘',
  'Communication': '💬',
  'Finance': '💳',
  'Travel': '✈️',
  'Career': '🚀',
  'Coding': '💻',
};
import { OptionsPopover } from '../components/OptionsPopover';
import { useToast } from '../components/toast/ToastProvider';
import { SheetHeader } from '../components/SheetHeader';
import { useData } from '../contexts/DataContext';
import { deleteActionOccurrence, updateActionOccurrence, updateAction, uploadArtifact, getArtifacts, deleteArtifact, completeOccurrence, type Artifact } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import type { ActionOccurrenceStatus } from '../backend/database/types';
import { trackEvent } from '../lib/mixpanel';

// Edit Action Modal Component (copied from ActionChipsList)
interface EditActionModalProps {
  visible: boolean;
  action: any | null;
  onClose: () => void;
  onSave: (updatedAction: any) => void;
  dreamEndDate?: string;
}

function EditActionModal({ visible, action, onClose, onSave, dreamEndDate }: EditActionModalProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createEditModalStyles(theme), [theme]);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    est_minutes: 0,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    repeat_every_days: undefined as number | undefined,
    slice_count_target: undefined as number | undefined,
    acceptance_criteria: [] as { title: string; description: string }[],
    acceptance_intro: '' as string | undefined,
    acceptance_outro: '' as string | undefined,
    dream_image: '',
    occurrence_no: 1,
    repeat_until_date: undefined as string | undefined
  });
  const [actionType, setActionType] = useState<'one-off' | 'repeating' | 'finite'>('one-off');
  const [focusedCriterionIndex, setFocusedCriterionIndex] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [showRepeatUntilPicker, setShowRepeatUntilPicker] = useState(false);
  const [repeatUntilDate, setRepeatUntilDate] = useState<Date | undefined>(undefined);

  React.useEffect(() => {
    if (action) {
      setFormData(action);
      // Initialize actionType from incoming values
      if (action.slice_count_target && action.slice_count_target > 0) {
        setActionType('finite');
      } else if (action.repeat_every_days) {
        setActionType('repeating');
      } else {
        setActionType('one-off');
      }
      // Initialize due date from current occurrence if provided
      if (action.due_on) {
        setDueDate(new Date(action.due_on));
      }
      // Initialize repeat until date
      if (action.repeat_until_date) {
        setRepeatUntilDate(new Date(action.repeat_until_date));
      } else {
        setRepeatUntilDate(undefined);
      }
    }
  }, [action]);

  const handleSave = async () => {
    Keyboard.dismiss(); // Close keyboard when saving
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the action');
      return;
    }
    if (!formData.est_minutes || formData.est_minutes <= 0) {
      Alert.alert('Error', 'Please enter a valid duration in minutes');
      return;
    }
    // Apply actionType semantics to payload
    const payload = { ...formData } as any;
    if (actionType === 'one-off') {
      payload.repeat_every_days = null;
      payload.slice_count_target = null;
      payload.repeat_until_date = null;
    } else if (actionType === 'repeating') {
      // default to 1 if not selected yet
      payload.repeat_every_days = payload.repeat_every_days ?? 1;
      payload.slice_count_target = null;
      payload.repeat_until_date = repeatUntilDate ? repeatUntilDate.toISOString().split('T')[0] : null;
    } else if (actionType === 'finite') {
      // validate total steps
      if (!payload.slice_count_target || payload.slice_count_target < 1 || payload.slice_count_target > 32767) {
        Alert.alert('Invalid Value', 'Total steps must be between 1 and 32767');
        return;
      }
      payload.repeat_every_days = null;
      payload.repeat_until_date = null;
    }
    // Include possibly updated due date for the current occurrence
    payload.due_on = dueDate.toISOString().split('T')[0];
    try {
      setIsSaving(true);
      await Promise.resolve(onSave(payload));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const addCriterion = () => {
    const newIndex = (formData.acceptance_criteria || []).length;
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: [...(prev.acceptance_criteria || []), { title: '', description: '' }]
    }));
    setFocusedCriterionIndex(newIndex);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const updateCriterion = (index: number, field: 'title' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria?.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ) || []
    }));
  };

  const removeCriterion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: theme.colors.background.page }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <SheetHeader
          title="Edit Action"
          onClose={() => {
            Keyboard.dismiss();
            onClose();
          }}
          onDone={handleSave}
          doneDisabled={isSaving}
          doneLoading={isSaving}
        />

        <ScrollView 
          ref={scrollRef}
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 16, paddingBottom: 400 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Title</Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter action title"
              placeholderTextColor={theme.colors.text.tertiary}
              style={{
                backgroundColor: theme.colors.background.card,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: theme.colors.text.primary
              }}
            />
          </View>

          {/* Duration */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Duration (minutes)</Text>
            <TextInput
              value={formData.est_minutes > 0 ? formData.est_minutes.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, est_minutes: text ? parseInt(text) : 0 }))}
              placeholder="Enter duration in minutes"
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="numeric"
              style={{
                backgroundColor: theme.colors.background.card,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: theme.colors.text.primary
              }}
            />
          </View>

          {/* Due Date (edit current occurrence) */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Due Date</Text>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setShowDatePicker(true);
              }}
              style={{
                backgroundColor: theme.colors.background.card,
                borderRadius: 8,
                padding: 12
              }}
            >
              <Text style={{ fontSize: 16, color: theme.colors.text.primary }}>
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
                      onPress={() => setShowDatePicker(false)}
                      style={{
                        backgroundColor: theme.colors.primary[600],
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderRadius: 8
                      }}
                    >
                      <Text style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Acceptance Criteria */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.primary }}>Acceptance Criteria</Text>
              <TouchableOpacity onPress={addCriterion}>
                <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>+ Add Bullet</Text>
              </TouchableOpacity>
            </View>
            
            {/* Intro */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 4, color: theme.colors.text.secondary }}>Intro (optional)</Text>
              <TextInput
                value={formData.acceptance_intro || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, acceptance_intro: text || undefined }))}
                placeholder="One sentence setting intention..."
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
                style={{
                  backgroundColor: theme.colors.background.card,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                  minHeight: 44
                }}
              />
            </View>

            {/* Bullets */}
            {(formData.acceptance_criteria || []).map((criterion, index) => (
              <View key={index} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary, marginRight: 8 }}>
                    Step {index + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeCriterion(index)}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.error[500]} />
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  value={criterion.title}
                  onChangeText={(text) => updateCriterion(index, 'title', text)}
                  placeholder="Short title (e.g. 'Read 10 pages')"
                  placeholderTextColor={theme.colors.text.tertiary}
                  style={{
                    backgroundColor: theme.colors.background.card,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    color: theme.colors.text.primary,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: theme.colors.border.default
                  }}
                />
                
                <TextInput
                  value={criterion.description}
                  onChangeText={(text) => updateCriterion(index, 'description', text)}
                  placeholder="Description (e.g. 'Focus on understanding key concepts...')"
                  placeholderTextColor={theme.colors.text.tertiary}
                  multiline
                  style={{
                    backgroundColor: theme.colors.background.card,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    color: theme.colors.text.primary,
                    minHeight: 60,
                    textAlignVertical: 'top',
                    borderWidth: 1,
                    borderColor: theme.colors.border.default
                  }}
                />
              </View>
            ))}

            {/* Outro */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 4, color: theme.colors.text.secondary }}>Outro (optional)</Text>
              <TextInput
                value={formData.acceptance_outro || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, acceptance_outro: text || undefined }))}
                placeholder="One sentence defining 'done'..."
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
                style={{
                  backgroundColor: theme.colors.background.card,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                  minHeight: 44
                }}
              />
            </View>
          </View>

          {/* Action Type Segmented */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Action Type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                { value: 'one-off' as const, label: 'One-off' },
                { value: 'repeating' as const, label: 'Repeating' },
                { value: 'finite' as const, label: 'Finite' }
              ]).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setActionType(opt.value)}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: actionType === opt.value ? theme.colors.primary[600] : theme.colors.background.card,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: actionType === opt.value ? theme.colors.text.inverse : theme.colors.text.primary, fontWeight: '600' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Repeating options */}
          {actionType === 'repeating' && (
            <View>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Repeat Every</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { value: 1, label: '1 day' },
                    { value: 2, label: '2 days' },
                    { value: 3, label: '3 days' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setFormData(prev => ({ ...prev, repeat_every_days: option.value }))}
                      style={{
                        flex: 1,
                        padding: 12,
                        backgroundColor: formData.repeat_every_days === option.value ? theme.colors.primary[600] : theme.colors.background.card,
                        borderRadius: 8,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: formData.repeat_every_days === option.value ? theme.colors.text.inverse : theme.colors.text.primary, fontWeight: '600', fontSize: 14 }}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Repeat Until (Optional)</Text>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowRepeatUntilPicker(true);
                  }}
                  style={{
                    backgroundColor: theme.colors.background.card,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 16, color: repeatUntilDate ? theme.colors.text.primary : theme.colors.text.tertiary }}>
                    {repeatUntilDate ? repeatUntilDate.toLocaleDateString() : 'Forever (until dream ends)'}
                  </Text>
                  {repeatUntilDate && (
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        setRepeatUntilDate(undefined);
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {showRepeatUntilPicker && (
                  <View>
                    <DateTimePicker
                      value={repeatUntilDate || new Date(Date.now() + 86400000)} // Default to tomorrow if undefined
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') {
                          setShowRepeatUntilPicker(false);
                        }
                        if (selectedDate) {
                          setRepeatUntilDate(selectedDate);
                        }
                      }}
                      minimumDate={new Date()}
                      maximumDate={dreamEndDate ? new Date(dreamEndDate) : undefined}
                      themeVariant={isDark ? 'dark' : 'light'}
                    />
                    {Platform.OS === 'ios' && (
                      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
                        <TouchableOpacity
                          onPress={() => setShowRepeatUntilPicker(false)}
                          style={{
                            backgroundColor: theme.colors.primary[600],
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 8
                          }}
                        >
                          <Text style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Finite total steps */}
          {actionType === 'finite' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Total Steps</Text>
              <TextInput
                value={formData.slice_count_target ? formData.slice_count_target.toString() : ''}
                onChangeText={(text) => {
                  const num = text ? parseInt(text) : undefined;
                  if (num !== undefined && (num < 1 || num > 32767)) {
                    Alert.alert('Invalid Value', 'Total steps must be between 1 and 32767');
                    return;
                  }
                  setFormData(prev => ({ ...prev, slice_count_target: num }));
                }}
                placeholder="How many times will you do this?"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="numeric"
                style={{
                  backgroundColor: theme.colors.background.card,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: theme.colors.text.primary
                }}
              />
            </View>
          )}

          {/* Difficulty (moved to bottom) */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Difficulty</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  onPress={() => setFormData(prev => ({ ...prev, difficulty: diff }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: formData.difficulty === diff ? theme.colors.primary[600] : theme.colors.background.card,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: formData.difficulty === diff ? theme.colors.text.inverse : theme.colors.text.primary, fontWeight: '600' }}>
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createEditModalStyles = (theme: Theme) => StyleSheet.create({
  // Styles are mostly inline in EditActionModal
});

// Save Action Sheet Component
interface SaveActionSheetProps {
  onClose: () => void;
  onBack?: () => void;
  onSubmit: () => Promise<void>;
  onSuccess?: () => void;
  initialViewMode?: 'editing' | 'success';
  actionTitle?: string;
  actionData?: any;
  params?: any;
  dreamAreaData?: any;
  note: string;
  setNote: (note: string) => void;
  artifacts: Artifact[];
  isUploading: boolean;
  isSubmitting: boolean;
  isCompleted: boolean;
  handleImagePicker: () => Promise<void>;
  handleDeleteImage: (artifactId: string) => void;
  formatDate: (dateString: string) => string;
  formatTime: (minutes: number) => string;
  navigation?: any;
  checkDreamCompletion?: (dreamId: string) => Promise<boolean>;
  xpGained?: number | null;
}

function SaveActionSheet({
  onClose,
  onBack,
  onSubmit,
  onSuccess,
  initialViewMode = 'editing',
  actionTitle,
  actionData,
  params,
  dreamAreaData,
  note,
  setNote,
  artifacts,
  isUploading,
  isSubmitting,
  isCompleted,
  handleImagePicker,
  handleDeleteImage,
  formatDate,
  formatTime,
  navigation,
  checkDreamCompletion,
  xpGained,
}: SaveActionSheetProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createSaveSheetStyles(theme, isDark), [theme, isDark]);
  const scrollRef = useRef<ScrollView>(null);
  const descriptionSectionRef = useRef<View>(null);
  const descriptionSectionY = useRef<number>(0);
  const currentDate = new Date().toISOString().split('T')[0];
  
  // State for modal view mode
  const [viewMode, setViewMode] = useState<'editing' | 'success'>(initialViewMode);
  const [dreamId, setDreamId] = useState<string | null>(null);
  const [isDreamComplete, setIsDreamComplete] = useState(false);
  
  // Sync viewMode with initialViewMode prop
  useEffect(() => {
    setViewMode(initialViewMode);
    if (initialViewMode === 'editing') {
      setDreamId(null);
      setIsDreamComplete(false);
    }
  }, [initialViewMode]);

  const handleDescriptionFocus = () => {
    // Scroll to position the input near the top of the visible area
    setTimeout(() => {
      const scrollY = Math.max(0, descriptionSectionY.current - 100);
      scrollRef.current?.scrollTo({ 
        y: scrollY, 
        animated: true 
      });
    }, 150);
  };

  const DifficultyBars = ({ difficulty }: { difficulty: string }) => {
    const getBarCount = (diff: string) => {
      switch (diff) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: return 1;
      }
    };

    const getBarColor = (diff: string) => {
      switch (diff) {
        case 'easy': return theme.colors.difficulty.easy;
        case 'medium': return theme.colors.difficulty.medium;
        case 'hard': return theme.colors.difficulty.hard;
        default: return theme.colors.difficulty.easy;
      }
    };

    const barCount = getBarCount(difficulty);
    const barColor = getBarColor(difficulty);

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
    );
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    try {
      await onSubmit();
      // If onSubmit succeeds (doesn't throw), transition to success view
      setViewMode('success');
      if (onSuccess) {
        onSuccess(); // This will update pageView in parent
      }
    } catch (error) {
      // Error handling is done in parent's handleComplete
      // Don't transition to success view on error
    }
  };

  // Check dream completion when transitioning to success view
  useEffect(() => {
    const checkCompletion = async () => {
      if (viewMode === 'success' && params?.occurrenceId && checkDreamCompletion) {
        try {
          // Get dream ID from occurrence
          const { data: occurrenceData } = await supabaseClient
            .from('action_occurrences')
            .select(`
              dream_id,
              actions!inner(
                areas!inner(
                  dreams!inner(id, title, completed_at)
                )
              )
            `)
            .eq('id', params.occurrenceId)
            .single();
            
          if (occurrenceData?.actions?.[0]?.areas?.[0]?.dreams?.[0]) {
            const dream = occurrenceData.actions[0].areas[0].dreams[0];
            const foundDreamId = dream.id;
            setDreamId(foundDreamId);
            
            // Check if dream is complete
            const isComplete = await checkDreamCompletion(foundDreamId);
            setIsDreamComplete(isComplete);
          }
        } catch (error) {
          console.error('Error checking dream completion:', error);
        }
      }
    };
    
    checkCompletion();
  }, [viewMode, params?.occurrenceId, checkDreamCompletion]);

  const handleDone = () => {
    if (isDreamComplete && dreamId && navigation) {
      // Navigate to dream completion page
      navigation.navigate('DreamCompleted', {
        dreamId: dreamId,
        dreamTitle: dreamAreaData?.dreamTitle || params?.dreamTitle,
        completedAt: new Date().toISOString(),
      });
      onClose();
    } else {
      // Close modal and navigate back
      onClose();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.page }} edges={['top']}>
      <View style={styles.header}>
        {viewMode === 'editing' && onBack ? (
          <IconButton
            icon="chevron_left_rounded"
            onPress={() => {
              Keyboard.dismiss();
              onBack();
            }}
            variant="secondary"
            size="md"
          />
        ) : (
          <View style={{ width: 44 }} />
        )}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            {viewMode === 'success' ? "Action Complete" : "Save Action"}
          </Text>
        </View>
        <IconButton
          icon="close"
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          variant="secondary"
          size="md"
        />
      </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
          {viewMode === 'editing' ? (
            <>
              <ScrollView 
                ref={scrollRef}
                style={{ flex: 1 }} 
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Title */}
                <Text style={styles.sheetActionTitle}>
                  {actionData?.title || actionTitle || 'Action'}
                </Text>

                {/* Sub Information Section */}
                <View style={styles.subInfoSection}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={16} color={theme.colors.text.secondary} />
                      <Text style={styles.detailValue}>
                        Completed {formatDate(currentDate)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.text.secondary} />
                      <Text style={styles.detailValue}>
                        {actionData?.est_minutes ? formatTime(actionData.est_minutes) : (params?.estimatedTime ? formatTime(params.estimatedTime) : 'No time')}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <DifficultyBars difficulty={actionData?.difficulty || params?.difficulty || 'easy'} />
                      <Text style={styles.detailValue}>
                        {(actionData?.difficulty || params?.difficulty || 'easy').charAt(0).toUpperCase() + (actionData?.difficulty || params?.difficulty || 'easy').slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Photo Upload Section */}
                <View style={styles.photoSection}>
                  <Text style={styles.sectionLabel}>Photos</Text>
                  
                  {/* Uploaded Images */}
                  {artifacts.length > 0 && (
                    <View style={styles.uploadedImagesContainer}>
                      {artifacts.map((artifact) => (
                        <View key={artifact.id} style={styles.artifactItem}>
                          <Image
                            source={{ uri: artifact.signed_url }}
                            style={styles.artifactImage}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={styles.deleteImageButton}
                            onPress={() => handleDeleteImage(artifact.id)}
                          >
                            <Ionicons name="close-circle" size={24} color={theme.colors.error[500]} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Upload Button */}
                  <TouchableOpacity 
                    style={[styles.uploadButtonSheet, isUploading && styles.uploadButtonDisabled]}
                    onPress={handleImagePicker}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Ionicons name="hourglass-outline" size={24} color={theme.colors.text.tertiary} />
                        <Text style={[styles.uploadTextSheet, isUploading && styles.uploadTextDisabled]}>
                          Uploading...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="add" size={24} color={theme.colors.text.primary} />
                        <Text style={styles.uploadTextSheet}>
                          Upload Photo
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Description Section */}
                <View 
                  ref={descriptionSectionRef}
                  style={styles.descriptionSection}
                  onLayout={(event) => {
                    // Store the Y position of the description section within the ScrollView content
                    const { y } = event.nativeEvent.layout;
                    descriptionSectionY.current = y;
                  }}
                >
                  <Text style={styles.sectionLabel}>Description</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    placeholder="Add a description about your progress..."
                    placeholderTextColor={theme.colors.text.tertiary}
                    multiline
                    value={note}
                    onChangeText={setNote}
                    textAlignVertical="top"
                    onFocus={handleDescriptionFocus}
                  />
                </View>
              </ScrollView>

              {/* Bottom Section with Mark as Done Button */}
              <View style={styles.sheetBottomSection}>
                <Button
                  title={
                    isSubmitting 
                      ? "Submitting..." 
                      : (isCompleted ? "Mark Incomplete" : "Mark as Done")
                  }
                  variant="black"
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={{ borderRadius: theme.radius.xl }}
                />
              </View>
            </>
          ) : (
            <>
              <ScrollView 
                ref={scrollRef}
                style={{ flex: 1 }} 
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Success Icon */}
                <View style={styles.successIcon}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                  <View style={styles.heroContent}>
                    <Text style={styles.dreamTitle}>{dreamAreaData?.dreamTitle || params?.dreamTitle || 'My Dream'}</Text>
                    <Text style={styles.areaTitle}>{dreamAreaData?.areaName || params?.areaName || 'Area'}</Text>
                    <Text style={styles.sheetActionTitle}>
                      {actionData?.title || actionTitle || 'Action'}
                    </Text>
                    
                    {/* Due Date */}
                    <Text style={styles.detailLabel}>Completed on {new Date().toLocaleDateString()}</Text>
                    
                    {/* Details Row */}
                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={16} color={theme.colors.text.secondary} />
                        <Text style={styles.detailValue}>
                          {actionData?.est_minutes ? formatTime(actionData.est_minutes) : (params?.estimatedTime ? formatTime(params.estimatedTime) : 'No time')}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <DifficultyBars difficulty={actionData?.difficulty || params?.difficulty || 'easy'} />
                        <Text style={styles.detailValue}>
                          {(actionData?.difficulty || params?.difficulty || 'easy').charAt(0).toUpperCase() + (actionData?.difficulty || params?.difficulty || 'easy').slice(1)}
                        </Text>
                      </View>
                      {(actionData?.primary_skill || params?.primarySkill) && (
                        <View style={styles.detailItem}>
                          <Icon name="military_tech" size={16} color={theme.colors.text.secondary} />
                          <Text style={styles.detailValue}>
                            {actionData?.primary_skill || params?.primarySkill}
                            {actionData?.secondary_skill || params?.secondarySkill ? ` / ${actionData?.secondary_skill || params?.secondarySkill}` : ''}
                          </Text>
                    </View>
                      )}
                  </View>
                  </View>
                </View>

                {/* XP Gained Section */}
                {xpGained !== null && xpGained > 0 && (() => {
                  const primarySkill = actionData?.primary_skill || params?.primarySkill;
                  const secondarySkill = actionData?.secondary_skill || params?.secondarySkill;
                  
                  // Calculate XP allocation (70/30 split)
                  const primaryXp = Math.round(xpGained * 0.7);
                  const secondaryXp = xpGained - primaryXp;
                  
                  const skillsGained: Array<{ skill: SkillType; xp: number; isPrimary: boolean }> = [];
                  if (primarySkill) {
                    skillsGained.push({ skill: primarySkill as SkillType, xp: primaryXp, isPrimary: true });
                  }
                  if (secondarySkill) {
                    skillsGained.push({ skill: secondarySkill as SkillType, xp: secondaryXp, isPrimary: false });
                  }
                  
                  if (skillsGained.length === 0) return null;
                  
                  return (
                    <View style={styles.xpGainedSection}>
                      <Text style={styles.xpSectionTitle}>Experience Gained</Text>
                      <View style={styles.skillsXpContainer}>
                        {skillsGained.map((skillGain, index) => (
                          <View
                            key={`${skillGain.skill}-${index}`}
                            style={[
                              styles.skillXpCard,
                              skillGain.isPrimary && styles.skillXpCardPrimary,
                              isDark && styles.skillXpCardDark
                            ]}
                          >
                            <View style={styles.skillXpHeader}>
                              <Text style={styles.skillXpEmoji}>
                                {SKILL_EMOJIS[skillGain.skill] || '⭐'}
                              </Text>
                              <View style={styles.skillXpInfo}>
                                <Text style={styles.skillXpName} numberOfLines={1}>
                                  {skillGain.skill}
                                </Text>
                                {skillGain.isPrimary && (
                                  <Text style={styles.skillXpLabel}>Primary</Text>
                                )}
                              </View>
                            </View>
                            <View style={[
                              styles.skillXpBadge,
                              skillGain.isPrimary && styles.skillXpBadgePrimary
                            ]}>
                              <Text style={[
                                styles.skillXpAmount,
                                skillGain.isPrimary && styles.skillXpAmountPrimary
                              ]}>
                                +{skillGain.xp}
                              </Text>
                              <Text style={[
                                styles.skillXpUnit,
                                skillGain.isPrimary && styles.skillXpUnitPrimary
                              ]}>
                                XP
                              </Text>
                            </View>
                          </View>
                        ))}
                        <View style={styles.totalXpCard}>
                          <View style={styles.totalXpContent}>
                            <Icon name="military_tech" size={20} color={theme.colors.primary[600]} />
                            <View style={styles.totalXpInfo}>
                              <Text style={styles.totalXpLabel}>Total XP</Text>
                              <Text style={styles.totalXpAmount}>+{xpGained}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* Submitted Content */}
                {((artifacts.length > 0) || note.trim()) && (
                  <View style={styles.submittedContent}>
                    <Text style={styles.sectionTitle}>What You Submitted</Text>
                    
                    {note.trim() && (
                      <View style={styles.noteSection}>
                        <Text style={styles.noteLabel}>Note:</Text>
                        <Text style={styles.noteText}>{note.trim()}</Text>
                      </View>
                    )}

                    {artifacts.length > 0 && (
                      <View style={styles.photosSection}>
                        <Text style={styles.photosLabel}>Photos ({artifacts.length}):</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                          {artifacts.map((artifact) => (
                            <Image
                              key={artifact.id}
                              source={{ uri: artifact.signed_url }}
                              style={styles.submittedPhoto}
                              resizeMode="cover"
                            />
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
              
              {/* Bottom button */}
              <View style={styles.sheetBottomSection}>
                <Button 
                  title="Done" 
                  variant="black"
                  onPress={handleDone}
                  style={{ borderRadius: theme.radius.xl }}
                />
              </View>
            </>
          )}
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createSaveSheetStyles = (theme: Theme, isDark?: boolean) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  sheetActionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 24,
  },
  subInfoSection: {
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  photoSection: {
    marginBottom: 32,
  },
  uploadedImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  artifactItem: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  artifactImage: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.xl,
  },
  deleteImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
  },
  uploadButtonSheet: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.xl,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  uploadTextSheet: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  descriptionSection: {
    marginBottom: 32,
  },
  descriptionInput: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.xl,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  sheetBottomSection: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.page,
  },
  successIcon: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.status.completed,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 100,
    color: theme.colors.text.inverse,
    fontWeight: 'bold',
  },
  heroSection: {
    padding: 0,
    marginBottom: 8,
  },
  heroContent: {
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  dreamTitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'left',
    marginBottom: 4,
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'left',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  submittedContent: {
    paddingHorizontal: 0,
    marginBottom: 32,
    marginTop: 16,
  },
  noteSection: {
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  photosSection: {
    marginBottom: 16,
  },
  photosLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  photosScroll: {
    flexDirection: 'row',
  },
  submittedPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
  },
  xpGainedSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  xpSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  skillsXpContainer: {
    gap: 12,
  },
  skillXpCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  skillXpCardPrimary: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
  },
  skillXpCardDark: {
    backgroundColor: theme.colors.background.card,
  },
  skillXpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  skillXpEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  skillXpInfo: {
    flex: 1,
  },
  skillXpName: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  skillXpLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skillXpBadge: {
    backgroundColor: theme.colors.background.pressed,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  skillXpBadgePrimary: {
    backgroundColor: theme.colors.primary[600],
  },
  skillXpAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    lineHeight: 24,
  },
  skillXpAmountPrimary: {
    color: '#FFFFFF',
  },
  skillXpUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: -2,
  },
  skillXpUnitPrimary: {
    color: 'rgba(255,255,255,0.9)',
  },
  totalXpCard: {
    backgroundColor: isDark ? theme.colors.background.card : theme.colors.primary[50],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border.default : theme.colors.primary[200],
    marginTop: 4,
  },
  totalXpContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalXpInfo: {
    marginLeft: 12,
    flex: 1,
  },
  totalXpLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalXpAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
});

const ActionOccurrencePage = () => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const route = useRoute();
  const { deferOccurrence, unmarkOccurrence, state, updateAction: updateActionInContext, deleteActionOccurrence: deleteActionOccurrenceInContext, isScreenshotMode, checkAchievements, checkDreamCompletion } = useData();
  const { show: showToast } = useToast();
  
  // Calculate emoji dimensions
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const emojiHeight = screenHeight * 0.225;
  // Calculate emoji width to extend to screen edges (accounting for content padding)
  const emojiWidth = screenWidth + (theme.spacing.md * 2);
  const params = route.params as {
    occurrenceId?: string;
    actionTitle?: string;
    actionDescription?: string;
    dueDate?: string;
    estimatedTime?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    dreamImage?: string;
    dreamTitle?: string;
    areaName?: string;
    areaEmoji?: string;
    areaImageUrl?: string;
    sliceCountTarget?: number;
    occurrenceNo?: number;
    isCompleted?: boolean;
    isOverdue?: boolean;
    completedAt?: string;
    note?: string;
    acceptanceCriteria?: { title: string; description: string }[];
    acceptanceIntro?: string;
    acceptanceOutro?: string;
  } | undefined;
  
  // Check if we're in preview mode (no occurrenceId means preview from create/onboarding flows)
  const isPreviewMode = !params?.occurrenceId;
  
  // Find the actual occurrence data from DataContext
  const occurrenceData = useMemo(() => {
    if (!params?.occurrenceId) {
      return null;
    }
    
    // First try to find in today's data
    const todayOccurrence = state.today?.occurrences.find(occ => occ.id === params.occurrenceId);
    if (todayOccurrence) {
      return todayOccurrence;
    }
    
    // If not found in today's data, search in dream detail caches
    for (const dreamId in state.dreamDetail) {
      const dreamDetail = state.dreamDetail[dreamId];
      if (dreamDetail) {
        const occurrence = dreamDetail.occurrences.find(occ => occ.id === params.occurrenceId);
        if (occurrence) {
          // We need to get the action data too, but it's not directly available in dream detail
          // For now, we'll use the occurrence data and fall back to params for action details
          return occurrence;
        }
      }
    }
    
    return null;
  }, [params?.occurrenceId, state.today?.occurrences, state.dreamDetail]);
  
  const [isCompleted, setIsCompleted] = useState(occurrenceData?.completed_at ? true : (params?.isCompleted || false));
  const [note, setNote] = useState(occurrenceData?.note || params?.note || '');
  const [currentDueDate, setCurrentDueDate] = useState(occurrenceData?.due_on || params?.dueDate || '');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pageView, setPageView] = useState<'main' | 'save' | 'success'>('main');
  const [editingAction, setEditingAction] = useState<any>(null);
  const [menuButtonLayout, setMenuButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const menuButtonRef = useRef<View>(null);
  
  // Artifact-related state
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [xpGained, setXpGained] = useState<number | null>(null);

  // Load artifacts when component mounts
  useEffect(() => {
    if (params?.occurrenceId) {
      trackEvent('action_detail_viewed', { 
        action_id: params.occurrenceId,
        status: isCompleted ? 'completed' : ((occurrenceData as any)?.is_overdue ? 'overdue' : 'pending')
      });
    }

    const loadArtifacts = async () => {
      if (!params?.occurrenceId) return;

      // Mock Data for Screenshot Mode
      if (isScreenshotMode) {
        // Check if it's the High Protein action (Area 2, Index 1 -> 'occ-area-2-1' or 'mock-occ-1')
        // Check occurrenceId first (most reliable), then action title from params or occurrenceData
        const actionTitle = params.actionTitle || (occurrenceData as any)?.action_title || '';
        const isHighProtein = params.occurrenceId === 'occ-area-2-1' || 
                              params.occurrenceId === 'mock-occ-1' || 
                              actionTitle.toLowerCase().includes('high protein');
        
        console.log('🎯 [SCREENSHOT] Checking high protein action:', {
          occurrenceId: params.occurrenceId,
          isScreenshotMode,
          actionTitle,
          isHighProtein,
          hasOccurrenceData: !!occurrenceData
        });
        
        if (isHighProtein) {
          console.log('✅ [SCREENSHOT] Setting mock artifacts for high protein action');
          // @ts-ignore: Mocking artifact
          setArtifacts([{ 
            id: 'mock-art-1', 
            signed_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80', // Healthy food
            created_at: new Date().toISOString(),
            file_name: 'meal_prep.jpg',
            mime_type: 'image/jpeg',
            occurrence_id: params.occurrenceId,
            storage_path: 'mock'
          }]);
          setNote("Found some great recipes for chicken breast and quinoa. Planning to prep on Sunday.");
          return;
        }
      }
      
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) return;

        const response = await getArtifacts(params.occurrenceId, session.access_token);
        if (response.success) {
          setArtifacts(response.data.artifacts);
          // Update note from server if available
          if (response.data.occurrence.note) {
            setNote(response.data.occurrence.note);
          }
        }
      } catch (error) {
        console.error('Error loading artifacts:', error);
      }
    };

    loadArtifacts();
  }, [params?.occurrenceId, occurrenceData, isScreenshotMode]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    // Add ordinal suffix to day
    const getOrdinalSuffix = (day: number) => {
      if (day >= 11 && day <= 13) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return theme.colors.difficulty.easy;
      case 'medium': return theme.colors.difficulty.medium;
      case 'hard': return theme.colors.difficulty.hard;
      default: return theme.colors.difficulty.easy;
    }
  };

  const getStatusColor = () => {
    if (isCompleted) return theme.colors.status.completed;
    if ((occurrenceData as any)?.is_overdue || params?.isOverdue) return theme.colors.status.overdue;
    return theme.colors.status.pending;
  };

  const getPageBackgroundColor = () => {
    if (isCompleted) return theme.colors.statusBackground.completed;
    if ((occurrenceData as any)?.is_overdue || params?.isOverdue) return theme.colors.statusBackground.overdue;
    return theme.colors.background.page; // Default background
  };

  const getStatusText = () => {
    if (isCompleted) return 'Completed';
    if ((occurrenceData as any)?.is_overdue || params?.isOverdue) return 'Overdue';
    return 'Pending';
  };

  const handleImagePicker = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos.');
        return;
      }

      // Launch image picker with multiple selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Upload all selected images
        for (const asset of result.assets) {
          await handleImageUpload(asset);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleImageUpload = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    if (!params?.occurrenceId) return;

    setIsUploading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      // Create a file object for React Native
      const file = {
        uri: imageAsset.uri,
        name: imageAsset.fileName || 'image.jpg',
        type: imageAsset.type || 'image/jpeg',
        size: imageAsset.fileSize || 0,
      };

      const uploadResponse = await uploadArtifact(file, params.occurrenceId, session.access_token);
      
      if (uploadResponse.success) {
        setArtifacts(prev => [...prev, uploadResponse.data]);
        trackEvent('action_photo_uploaded', { action_id: params.occurrenceId });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (artifactId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabaseClient.auth.getSession();
              if (!session?.access_token) {
                return;
              }

              await deleteArtifact(artifactId, session.access_token);
              setArtifacts(prev => prev.filter(artifact => artifact.id !== artifactId));
            } catch (error) {
              console.error('Error deleting image:', error);
            }
          }
        }
      ]
    );
  };

  const handleComplete = async () => {
    if (!params?.occurrenceId) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      // Complete the occurrence first
      await completeOccurrence(params.occurrenceId, note.trim() || undefined, session.access_token);
      
      console.log('✅ [ACHIEVEMENT] Action completed via API, calling checkAchievements');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActionOccurrencePage.tsx:1223',message:'Action completed via API, calling checkAchievements',data:{occurrenceId:params.occurrenceId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'N'})}).catch((e)=>{console.error('Log error:',e);});
      // #endregion
      
      // Check for achievements after completing the action
      try {
        await checkAchievements();
        console.log('✅ [ACHIEVEMENT] checkAchievements completed');
      } catch (error) {
        console.error('❌ [ACHIEVEMENT] Error in checkAchievements:', error);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/40853674-0114-49e6-bb6b-7006ee264c68',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ActionOccurrencePage.tsx:1228',message:'checkAchievements completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'O'})}).catch((e)=>{console.error('Log error:',e);});
      // #endregion
      
      setIsCompleted(true);
      
      // Fetch XP gained after completion
      try {
        const { data: occurrence } = await supabaseClient
          .from('action_occurrences')
          .select('xp_gained')
          .eq('id', params.occurrenceId)
          .single();
        
        if (occurrence?.xp_gained) {
          setXpGained(occurrence.xp_gained);
        }
      } catch (error) {
        console.error('Error fetching XP gained:', error);
      }
      
      // Track action completed event
      trackEvent('action_completed', {
        action_id: params.occurrenceId,
        action_title: actionData?.title || params?.actionTitle,
        dream_title: dreamAreaData?.dreamTitle || params?.dreamTitle,
        has_note: !!note.trim(),
        has_artifacts: artifacts.length > 0,
      });
      
      // onSuccess callback will be called from SaveActionSheet to transition to success view
    } catch (error: any) {
      console.error('Error completing action:', error);
      const errorMessage = error?.message || error?.error || 'Failed to complete action. Please try again.';
      // Try to parse JSON error message if it's a string
      let displayMessage = errorMessage;
      try {
        if (typeof errorMessage === 'string' && errorMessage.startsWith('{')) {
          const parsed = JSON.parse(errorMessage);
          displayMessage = parsed.error || parsed.message || errorMessage;
        }
      } catch {
        // If parsing fails, use the original message
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnmark = async () => {
    if (!params?.occurrenceId) return;

    setIsSubmitting(true);
    try {
      await unmarkOccurrence(params.occurrenceId);
      
      setIsCompleted(false);
      
      // Track action unmarked event
      trackEvent('action_unmarked', {
        action_id: params.occurrenceId,
        action_title: actionData?.title || params?.actionTitle,
      });
    } catch (error: any) {
      console.error('Error unmarking action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNote = () => {
    setShowNoteInput(false);
    // Here you would save the note to the backend
    console.log('Saving note:', note);
  };

  const handleDefer = async () => {
    const currentDate = new Date(currentDueDate || new Date());
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    
    const newDateStr = newDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const formattedNewDate = formatDate(newDateStr);
    
    Alert.alert(
      'Defer Action',
      `Are you sure you want to defer this action to ${formattedNewDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Defer',
          onPress: async () => {
            try {
              // Update the local state immediately
              setCurrentDueDate(newDateStr);
              
              // Call the DataContext method to defer the occurrence
              if (params?.occurrenceId) {
                await deferOccurrence(params.occurrenceId, currentDueDate);
                trackEvent('action_deferred', { action_id: params.occurrenceId });
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to defer action. Please try again.');
              // Revert the date change on error
              setCurrentDueDate(params?.dueDate || '');
            }
          }
        }
      ]
    );
  };

  const isEmoji = (str: string) => {
    return !str.startsWith('http') && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(str);
  };

  // Get action data from the occurrence (if it's from today's data)
  const actionData = useMemo(() => {
    if (occurrenceData && 'actions' in occurrenceData) {
      const actions = (occurrenceData as any).actions;
      
      // Ensure the action has an ID - it should be in the occurrence's action_id field
      if (actions && occurrenceData.action_id) {
        const actionWithId = {
          ...actions,
          id: occurrenceData.action_id
        };
        return actionWithId;
      }
      
      return actions;
    }
    
    // If not found in today's data, search in dream detail caches
    if (occurrenceData?.action_id) {
      for (const dreamId in state.dreamDetail) {
        const dreamDetail = state.dreamDetail[dreamId];
        if (dreamDetail) {
          const action = dreamDetail.actions.find(a => a.id === occurrenceData.action_id);
          if (action) {
            return action;
          }
        }
      }
    }
    
    return null;
  }, [occurrenceData, state.dreamDetail]);

  // Get dream and area data from the occurrence
  const dreamAreaData = useMemo(() => {
    // First try params (passed from navigation)
    if (params?.dreamTitle || params?.areaName) {
      return {
        dreamTitle: params.dreamTitle,
        areaName: params.areaName,
        areaEmoji: params.areaEmoji,
        areaImageUrl: params.areaImageUrl
      };
    }
    
    // Try from actionData with nested areas relationship
    if (actionData && actionData.areas) {
      return {
        dreamTitle: actionData.areas.dreams?.title,
        areaName: actionData.areas.title,
        areaEmoji: actionData.areas.icon,
        areaImageUrl: actionData.areas.image_url
      };
    }
    
    // Fallback: try to get dream and area data from the occurrence directly
    if (occurrenceData && 'actions' in occurrenceData) {
      const actions = (occurrenceData as any).actions;
      if (actions && actions.areas) {
        return {
          dreamTitle: actions.areas.dreams?.title,
          areaName: actions.areas.title,
          areaEmoji: actions.areas.icon,
          areaImageUrl: actions.areas.image_url
        };
      }
    }
    
    // Last resort: try to find from dream detail cache
    if (occurrenceData?.action_id) {
      for (const dreamId in state.dreamDetail) {
        const dreamDetail = state.dreamDetail[dreamId];
        if (dreamDetail) {
          const action = dreamDetail.actions.find(a => a.id === occurrenceData.action_id);
          if (action) {
            // Find the area for this action
            const area = dreamDetail.areas.find((a: any) => a.id === action.area_id);
            if (area && dreamDetail.dream) {
              return {
                dreamTitle: dreamDetail.dream.title,
                areaName: area.title,
                areaEmoji: area.icon,
                areaImageUrl: area.image_url
              };
            }
          }
        }
      }
    }
    
    return null;
  }, [actionData, occurrenceData, params, state.dreamDetail]);

  const generateAIDiscussionPrompt = () => {
    const dreamTitle = dreamAreaData?.dreamTitle || params?.dreamTitle || 'My Dream';
    const areaName = dreamAreaData?.areaName || params?.areaName || 'Area';
    const actionTitle = actionData?.title || params?.actionTitle || 'Action';
    const actionDescription = params?.actionDescription || '';
    const estimatedTime = actionData?.est_minutes ? formatTime(actionData.est_minutes) : (params?.estimatedTime ? formatTime(params.estimatedTime) : 'No time estimate');
    const difficulty = actionData?.difficulty || params?.difficulty || 'easy';
    const dueDate = currentDueDate ? formatDate(currentDueDate) : 'No due date';
    const currentNote = note.trim() || 'No notes yet';
    const acceptanceCriteria = actionData?.acceptance_criteria || params?.acceptanceCriteria || [];
    
    // Format acceptance criteria with new structure
    const intro = (actionData as any)?.acceptance_intro || (params as any)?.acceptanceIntro;
    const outro = (actionData as any)?.acceptance_outro || (params as any)?.acceptanceOutro;
    const criteriaText = acceptanceCriteria.length > 0 || intro || outro
      ? [
          intro ? `Intro: ${intro}` : null,
          acceptanceCriteria.length > 0 
            ? acceptanceCriteria.map((criteria: any, index: number) => {
                if (typeof criteria === 'string') return `${index + 1}. ${criteria}`;
                return `${index + 1}. ${criteria.title}: ${criteria.description}`;
              }).join('\n')
            : null,
          outro ? `Outro: ${outro}` : null
        ].filter(Boolean).join('\n\n')
      : 'No specific criteria defined';
    
    // Create a concise summary with improved prompt engineering
    const prompt = `I'm working on this action as part of my dream:

DREAM: ${dreamTitle}
AREA: ${areaName}
ACTION: ${actionTitle}${actionDescription ? `\nACTION DESCRIPTION: ${actionDescription}` : ''}
TIME ESTIMATE: ${estimatedTime}
DIFFICULTY: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
DUE DATE: ${dueDate}
CURRENT NOTE: ${currentNote}

ACCEPTANCE CRITERIA:
${criteriaText}

I need your help to break this down into actionable steps. Please provide:

1. 2-3 specific, concrete actions I can take TODAY to make meaningful progress
2. Any potential obstacles I should anticipate and how to overcome them
3. A quick win I can achieve in the next 30 minutes to build momentum

Focus on practical, immediately actionable advice that moves me closer to completing this action successfully.`;

    return prompt;
  };

  const handleAIDiscussion = async () => {
    try {
      trackEvent('action_ai_plan_opened', { action_id: params?.occurrenceId });
      const prompt = generateAIDiscussionPrompt();
      
      // Copy to clipboard
      await Clipboard.setStringAsync(prompt);
      
      const encodedPrompt = encodeURIComponent(prompt);
      
      // Try to open ChatGPT app first
      const chatgptAppUrl = `chatgpt://chat?q=${encodedPrompt}`;
      
      // Check if the app can be opened
      const canOpen = await Linking.canOpenURL(chatgptAppUrl);
      
      if (canOpen) {
        // App is installed, open it
        await Linking.openURL(chatgptAppUrl);
      } else {
        // App not installed, open in in-app browser
        const chatgptWebUrl = `https://chatgpt.com/?q=${encodedPrompt}`;
        await WebBrowser.openBrowserAsync(chatgptWebUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
          controlsColor: theme.colors.text.primary,
          enableBarCollapsing: false,
          showTitle: true,
        });
      }
    } catch (error) {
      console.error('Error opening AI discussion:', error);
      showToast('Error', 'Failed to open ChatGPT. Please try again.');
    }
  };

  const DifficultyBars = ({ difficulty }: { difficulty: string }) => {
    const getBarCount = (diff: string) => {
      switch (diff) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: return 1;
      }
    };

    const getBarColor = (diff: string) => {
      switch (diff) {
        case 'easy': return theme.colors.difficulty.easy;
        case 'medium': return theme.colors.difficulty.medium;
        case 'hard': return theme.colors.difficulty.hard;
        default: return theme.colors.difficulty.easy;
      }
    };

    const barCount = getBarCount(difficulty);
    const barColor = getBarColor(difficulty);

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
    );
  };

  const handleEditAction = () => {
    if (!actionData) {
      showToast('Error', 'No action data available.');
      return;
    }

    // Convert action data to the format expected by EditActionModal
    const actionForEdit = {
      id: actionData.id,
      title: actionData.title,
      est_minutes: actionData.est_minutes || 0,
      difficulty: actionData.difficulty || 'medium',
      repeat_every_days: actionData.repeat_every_days,
      repeat_until_date: actionData.repeat_until_date,
      slice_count_target: actionData.slice_count_target,
      acceptance_criteria: actionData.acceptance_criteria || [],
      acceptance_intro: (actionData as any).acceptance_intro,
      acceptance_outro: (actionData as any).acceptance_outro,
      dream_image: dreamAreaData?.areaImageUrl || dreamAreaData?.areaEmoji || '',
      occurrence_no: occurrenceData?.occurrence_no || 1,
      due_on: occurrenceData?.due_on || currentDueDate
    };

    setEditingAction(actionForEdit);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedAction: any) => {
    try {
      if (!actionData?.id) {
        showToast('Error', 'No action to edit.');
        return;
      }

      // Get auth token
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        showToast('Error', 'Please log in to edit actions.');
        return;
      }

      // Prepare updates for the action
      const updates: { 
        title?: string; 
        est_minutes?: number; 
        difficulty?: string; 
        repeat_every_days?: number | null; 
        repeat_until_date?: string | null;
        slice_count_target?: number | null; 
        acceptance_criteria?: { title: string; description: string }[]; 
        acceptance_intro?: string; 
        acceptance_outro?: string 
      } = {};
      
      if (updatedAction.title !== actionData.title) updates.title = updatedAction.title;
      if (updatedAction.est_minutes !== actionData.est_minutes) updates.est_minutes = updatedAction.est_minutes;
      if (updatedAction.difficulty !== actionData.difficulty) updates.difficulty = updatedAction.difficulty;
      if (updatedAction.repeat_every_days !== actionData.repeat_every_days) updates.repeat_every_days = updatedAction.repeat_every_days;
      if (updatedAction.repeat_until_date !== actionData.repeat_until_date) updates.repeat_until_date = updatedAction.repeat_until_date;
      if (updatedAction.slice_count_target !== actionData.slice_count_target) updates.slice_count_target = updatedAction.slice_count_target;
      if (JSON.stringify(updatedAction.acceptance_criteria) !== JSON.stringify(actionData.acceptance_criteria)) {
        updates.acceptance_criteria = updatedAction.acceptance_criteria;
      }
      // Add missing type definition for updates object
      const typedUpdates = updates as any;
      if ((updatedAction as any).acceptance_intro !== ((actionData as any).acceptance_intro || undefined)) {
        typedUpdates.acceptance_intro = (updatedAction as any).acceptance_intro || undefined;
      }
      if ((updatedAction as any).acceptance_outro !== ((actionData as any).acceptance_outro || undefined)) {
        typedUpdates.acceptance_outro = (updatedAction as any).acceptance_outro || undefined;
      }

      if (Object.keys(updates).length === 0) {
        setShowEditModal(false);
        return;
      }

      await updateAction(actionData.id, updates, session.access_token);
      
      // Update the DataContext optimistically
      await updateActionInContext(actionData.id, updates);
      
      setShowEditModal(false);
      trackEvent('action_edited', { action_id: actionData.id });
    } catch (error) {
      console.error('Error updating action:', error);
    }
  };

  const handleDeleteAction = () => {
    Alert.alert(
      'Delete Action',
      'Are you sure you want to delete this action? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!params?.occurrenceId) {
                return;
              }

              // Get auth token
              const { data: { session } } = await supabaseClient.auth.getSession();
              if (!session?.access_token) {
                return;
              }

              await deleteActionOccurrence(params.occurrenceId, session.access_token);
              
              // Update the DataContext optimistically
              await deleteActionOccurrenceInContext(params.occurrenceId);
              
              // Navigate back after deletion
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting action:', error);
            }
          }
        }
      ]
    );
  };

  const menuOptions = [
    ...(!isCompleted ? [{
      id: 'defer',
      icon: 'event',
      title: 'Defer +1 Day',
      onPress: handleDefer
    }] : []),
    {
      id: 'edit',
      icon: 'edit',
      title: 'Edit Action',
      onPress: handleEditAction
    },
    {
      id: 'delete',
      icon: 'delete',
      title: 'Delete Action',
      destructive: true,
      onPress: handleDeleteAction
    }
  ];

  return (
    <View style={styles.wrapper}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {pageView === 'main' && (
        <SafeAreaView style={[styles.container, { backgroundColor: getPageBackgroundColor() }]} edges={['top']}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Header */}
            <View style={styles.header}>
        <IconButton
          icon="close"
          onPress={() => navigation.goBack()}
          variant="secondary"
          size="md"
        />
        {!isPreviewMode && (
          <View style={styles.headerRight}>
            {isDark ? (
              // In dark mode, use solid View to eliminate fuzzy edges
              <TouchableOpacity 
                onPress={handleAIDiscussion}
                style={{
                  height: 40,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  backgroundColor: theme.colors.background.card,
                  borderWidth: 0.5,
                  borderColor: theme.colors.border.default,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: theme.colors.text.primary 
                }}>
                  Plan with AI
                </Text>
              </TouchableOpacity>
            ) : (
              // In light mode, use BlurView for glass effect
              <TouchableOpacity 
                onPress={handleAIDiscussion}
                style={{
                  height: 40,
                  borderRadius: 20,
                  overflow: 'hidden',
                  marginRight: 8,
                }}
              >
                <BlurView 
                  intensity={100} 
                  tint="light" 
                  style={{
                    height: 40,
                    paddingHorizontal: 16,
                    backgroundColor: theme.colors.background.card + 'F0',
                    borderWidth: 0.5,
                    borderColor: theme.colors.border.default,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600', 
                    color: theme.colors.text.primary 
                  }}>
                    Plan with AI
                  </Text>
                </BlurView>
              </TouchableOpacity>
            )}
            
            <View ref={menuButtonRef}>
              <IconButton
                icon="more_horiz"
                onPress={() => {
                  if (menuButtonRef.current) {
                    menuButtonRef.current.measureInWindow((x, y, width, height) => {
                      setMenuButtonLayout({ x, y, width, height });
                      setShowOptionsPopover(true);
                    });
                  } else {
                    setShowOptionsPopover(true);
                  }
                }}
                variant="secondary"
                size="md"
                style={styles.menuButton}
              />
            </View>
            
          </View>
        )}
          </View>

          {/* ScrollView with Emoji and Content */}
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Area Image/Emoji - scrolls with content */}
            {((dreamAreaData?.areaImageUrl || params?.areaImageUrl) || (dreamAreaData?.areaEmoji || params?.areaEmoji)) && (
              <View style={[styles.emojiBackground, { height: emojiHeight, width: emojiWidth }]}>
                {(dreamAreaData?.areaImageUrl || params?.areaImageUrl) ? (
                  <Image
                    source={{ uri: dreamAreaData?.areaImageUrl || params?.areaImageUrl }}
                    style={styles.areaImage}
                    contentFit="cover"
                  />
                ) : (
                <Text style={styles.emojiText}>{dreamAreaData?.areaEmoji || params?.areaEmoji}</Text>
                )}
              </View>
            )}

            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroContent}>
                {/* Icon and Title Row */}
                <View style={styles.iconTitleRow}>
                  <View style={styles.titleColumn}>
                {dreamAreaData?.dreamTitle && (
                  <Pressable onPress={() => {
                    // Navigate to dream page - we need to get the dream ID from the action data
                    const dreamId = actionData?.areas?.dreams?.id || actionData?.dream_id;
                    if (dreamId) {
                      (navigation as any).navigate('Tabs', {
                        screen: 'Dreams',
                        params: {
                          screen: 'Dream',
                          params: { dreamId }
                        }
                      });
                    }
                  }}>
                    <Text style={styles.dreamTitle}>{dreamAreaData.dreamTitle}</Text>
                  </Pressable>
                )}
                {dreamAreaData?.areaName && (
                  <Pressable onPress={() => {
                    // Navigate to area page - we need to get the area ID from the action data
                    const areaId = actionData?.areas?.id || actionData?.area_id;
                    const dreamId = actionData?.areas?.dreams?.id || actionData?.dream_id;
                    if (areaId && dreamId) {
                      (navigation as any).navigate('Tabs', {
                        screen: 'Dreams',
                        params: {
                          screen: 'Area',
                          params: { 
                            areaId, 
                            areaTitle: dreamAreaData.areaName,
                            areaEmoji: dreamAreaData.areaEmoji,
                            dreamId,
                            dreamTitle: dreamAreaData.dreamTitle
                          }
                        }
                      });
                    }
                  }}>
                    <Text style={styles.areaTitle}>{dreamAreaData.areaName}</Text>
                  </Pressable>
                )}
              </View>
            </View>
            <Text style={styles.actionTitle}>{actionData?.title || params?.actionTitle || 'Action'}</Text>
            
            {/* Due Date or Completed Date */}
            {!isPreviewMode && (
              <View style={styles.dueDateRow}>
                <Text style={styles.detailLabel}>
                  {isCompleted 
                    ? `Completed ${occurrenceData?.completed_at ? formatDate(occurrenceData.completed_at) : 'recently'}`
                    : `Due ${currentDueDate ? formatDate(currentDueDate) : 'No date'}`
                  }
                </Text>
              </View>
            )}
            
            {/* Details Row */}
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={theme.colors.text.secondary} />
                <Text style={styles.detailValue}>
                  {actionData?.est_minutes ? formatTime(actionData.est_minutes) : (params?.estimatedTime ? formatTime(params.estimatedTime) : 'No time')}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <DifficultyBars difficulty={actionData?.difficulty || params?.difficulty || 'easy'} />
                <Text style={styles.detailValue}>
                  {(actionData?.difficulty || params?.difficulty || 'easy').charAt(0).toUpperCase() + (actionData?.difficulty || params?.difficulty || 'easy').slice(1)}
                </Text>
              </View>
              {(actionData?.slice_count_target || params?.sliceCountTarget) && (
                <View style={styles.detailItem}>
                  <Ionicons name="layers-outline" size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.detailValue}>
                    {occurrenceData?.occurrence_no ? `${occurrenceData.occurrence_no} of ${actionData?.slice_count_target || params?.sliceCountTarget}` : `${actionData?.slice_count_target || params?.sliceCountTarget} repeats`}
                  </Text>
                </View>
              )}
              {(actionData?.primary_skill || params?.primarySkill) && (
                <View style={styles.detailItem}>
                  <Icon name="military_tech" size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.detailValue}>
                    {actionData?.primary_skill || params?.primarySkill}
                    {actionData?.secondary_skill || params?.secondarySkill ? ` / ${actionData?.secondary_skill || params?.secondarySkill}` : ''}
                  </Text>
                </View>
              )}
            </View>
            
          </View>
        </View>

        {/* Acceptance Criteria Section */}
        <View style={styles.acceptanceSection}>
          <View style={{ 
            backgroundColor: theme.colors.background.card, 
            borderRadius: 12, 
            overflow: 'hidden',
          }}>
            {/* Header Row */}
            <View style={{ 
              backgroundColor: isDark ? theme.colors.background.pressed : theme.colors.grey[400],
              paddingVertical: 10,
              paddingHorizontal: 16,
            }}>
              <Text style={{ 
                color: theme.colors.text.primary, 
                fontSize: 12, 
                fontWeight: '700',
                letterSpacing: 1,
              }}>
                To Dos
              </Text>
            </View>

            {/* Bullets */}
            {(() => {
              // Normalize acceptance_criteria: convert string arrays to object arrays
              const rawCriteria = actionData?.acceptance_criteria || params?.acceptanceCriteria || [];
              
              // Debug log for screenshot mode
              if (isScreenshotMode && params?.occurrenceId === 'mock-occ-1') {
                console.log('🔍 [SCREENSHOT] Acceptance criteria debug:', {
                  rawCriteria,
                  actionData: actionData?.acceptance_criteria,
                  params: params?.acceptanceCriteria,
                  actionDataKeys: actionData ? Object.keys(actionData) : null
                });
              }
              
              let normalizedCriteria: { title: string; description: string }[] = [];
              
              if (Array.isArray(rawCriteria) && rawCriteria.length > 0) {
                normalizedCriteria = rawCriteria.map((criterion: any) => {
                  if (typeof criterion === 'string') {
                    return { title: criterion, description: '' };
                  } else if (criterion && typeof criterion === 'object' && 'title' in criterion) {
                    return { title: criterion.title || '', description: criterion.description || '' };
                  }
                  return { title: '', description: '' };
                });
              }
              
              return normalizedCriteria.length > 0 ? (
                normalizedCriteria.map((criteria: { title: string; description: string }, index: number) => (
                <View key={index} style={{ 
                  flexDirection: 'row', 
                  borderBottomWidth: 0,
                  borderBottomColor: theme.colors.border.default,
                }}>
                  {/* Number Column */}
                  <View style={{ 
                    width: 50, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    paddingVertical: 8,
                  }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: '700', 
                      color: theme.colors.text.primary 
                    }}>
                      {index + 1}
                    </Text>
                  </View>
                  
                  {/* Vertical Divider */}
                  <View style={{
                    width: 1,
                    backgroundColor: theme.colors.border.default,
                    marginVertical: 6,
                  }} />
                  
                  {/* Text Column */}
                  <View style={{ 
                    flex: 1, 
                    justifyContent: 'center', 
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}>
                    <View>
                      <Text style={{ 
                        fontSize: 14, 
                        fontWeight: '700', 
                        color: theme.colors.text.primary,
                        lineHeight: 20,
                        marginBottom: criteria.description ? 4 : 0
                      }}>
                        {criteria.title}
                      </Text>
                      {criteria.description ? (
                        <Text style={{ 
                          fontSize: 14, 
                          fontWeight: '400', 
                          color: theme.colors.text.secondary,
                          lineHeight: 20,
                        }}>
                          {criteria.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))
              ) : (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: theme.colors.text.tertiary }}>No specific criteria defined</Text>
                </View>
              );
            })()}
          </View>
        </View>

        {/* AI Help Section - REMOVED */}
      </ScrollView>

      {/* Mark as Complete Button */}
      {!isPreviewMode && (
        <View style={styles.markCompleteSection}>
          {isCompleted ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title={isSubmitting ? "Submitting..." : "Mark Incomplete"}
                variant="secondary"
                onPress={handleUnmark}
                disabled={isSubmitting}
                style={{ flex: 1, borderRadius: theme.radius.xl, borderWidth: 0 }}
              />
              <Button
                title={isSubmitting ? "Submitting..." : "Re-submit"}
                variant="black"
                onPress={() => setPageView('save')}
                disabled={isSubmitting}
                style={{ flex: 1, borderRadius: theme.radius.xl }}
              />
            </View>
          ) : (
            <Button
              title={isSubmitting ? "Submitting..." : "Mark as Complete"}
              variant="black"
              onPress={() => setPageView('save')}
              disabled={isSubmitting}
              style={{ borderRadius: theme.radius.xl }}
            />
          )}
        </View>
      )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}

      {pageView === 'save' && (
        <SaveActionSheet
          onClose={() => {
            setPageView('main');
            navigation.goBack();
          }}
          onBack={() => setPageView('main')}
          onSubmit={async () => {
            if (isCompleted) {
              await handleUnmark();
              setPageView('main');
            } else {
              await handleComplete();
              // Don't close modal here - it will transition to success view
            }
          }}
          onSuccess={() => {
            setPageView('success');
          }}
          actionTitle={actionData?.title || params?.actionTitle}
          actionData={actionData}
          params={params}
          dreamAreaData={dreamAreaData}
          note={note}
          setNote={setNote}
          artifacts={artifacts}
          isUploading={isUploading}
          isSubmitting={isSubmitting}
          isCompleted={isCompleted}
          handleImagePicker={handleImagePicker}
          handleDeleteImage={handleDeleteImage}
          formatDate={formatDate}
          formatTime={formatTime}
          navigation={navigation}
          checkDreamCompletion={checkDreamCompletion}
          xpGained={xpGained}
        />
      )}

      {pageView === 'success' && (
        <SaveActionSheet
          onClose={() => {
            setPageView('main');
            navigation.goBack();
          }}
          onBack={undefined}
          initialViewMode="success"
          onSubmit={async () => {
            // Should not be called in success view
          }}
          onSuccess={() => {
            // Already in success view
          }}
          actionTitle={actionData?.title || params?.actionTitle}
          actionData={actionData}
          params={params}
          dreamAreaData={dreamAreaData}
          note={note}
          setNote={setNote}
          artifacts={artifacts}
          isUploading={isUploading}
          isSubmitting={isSubmitting}
          isCompleted={isCompleted}
          handleImagePicker={handleImagePicker}
          handleDeleteImage={handleDeleteImage}
          formatDate={formatDate}
          formatTime={formatTime}
          navigation={navigation}
          checkDreamCompletion={checkDreamCompletion}
          xpGained={xpGained}
        />
      )}

      {/* Options Popover */}
      {!isPreviewMode && pageView === 'main' && (
        <OptionsPopover
          visible={showOptionsPopover}
          onClose={() => setShowOptionsPopover(false)}
          options={menuOptions}
          triggerPosition={menuButtonLayout.x > 0 ? menuButtonLayout : undefined}
        />
      )}

      {/* Edit Modal */}
      <EditActionModal
        visible={showEditModal}
        action={editingAction}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        dreamEndDate={undefined}
      />
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerSafeArea: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    // IconButton handles its own styling
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  emojiBackground: {
    overflow: 'hidden',
    marginLeft: -theme.spacing.md,
    marginRight: -theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaImage: {
    width: '100%',
    height: '100%',
  },
  emojiText: {
    fontSize: 100,
    textAlign: 'center',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: theme.spacing.md,
    paddingBottom: 24,
    marginBottom: 8,
  },
  heroContent: {
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 32,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.disabled.inactive,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleColumn: {
    flex: 1,
  },
  dreamTitle: {
    fontSize: 12,
                color: theme.colors.text.secondary,
    textAlign: 'left',
    marginBottom: 4,
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'left',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
                        color: theme.colors.text.primary,
    textAlign: 'left',
    marginBottom: 0,
  },
  detailsSection: {
    padding: 24,
    paddingTop: 0,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 14,
                        color: theme.colors.text.primary,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 8,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    width: '100%',
  },
  detailValue: {
    fontSize: 14,
                color: theme.colors.text.secondary,
  },
  aiHelpSection: {
    padding: 24,
    paddingTop: 4,
    marginBottom: 16,
  },
  aiHelpSecondaryText: {
    fontSize: 14,
                color: theme.colors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  acceptanceSection: {
    padding: 24,
    paddingTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  criteriaList: {
    gap: 8,
  },
  criteriaItem: {
    fontSize: 16,
                  color: theme.colors.text.primary,
    marginBottom: 4,
  },
  criteriaIntro: {
    fontSize: 16,
                  color: theme.colors.text.primary,
    marginBottom: 12,
    lineHeight: 22,
  },
  criteriaOutro: {
    fontSize: 16,
                  color: theme.colors.text.primary,
    marginTop: 12,
    lineHeight: 22,
  },
  criteriaOutroWithBullets: {
    marginTop: 12,
  },
  markCompleteSection: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  imagesSection: {
    marginBottom: 16,
  },
  imagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  imagesScroll: {
    flex: 1,
  },
  artifactImageContainer: {
    position: 'relative',
    marginRight: 12,
    paddingTop: 8,
    paddingRight: 8,
  },
  uploadedImage: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.xl,
  },
  deleteImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
                    backgroundColor: theme.colors.background.card,
    borderRadius: 10,
  },
});

export default ActionOccurrencePage;
