import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
  Pressable
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../utils/theme';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { OptionsPopover } from '../components/OptionsPopover';
import { AIRatingRing } from '../components';
import { useToast } from '../components/toast/ToastProvider';
import { SheetHeader } from '../components/SheetHeader';
import { useData } from '../contexts/DataContext';
import { deleteActionOccurrence, updateActionOccurrence, updateAction, uploadArtifact, getArtifacts, deleteArtifact, completeOccurrence, generateAIReview, type Artifact } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import type { ActionOccurrenceStatus } from '../backend/database/types';
import { BOTTOM_NAV_HEIGHT } from '../utils/bottomNavigation';
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
    occurrence_no: 1
  });
  const [actionType, setActionType] = useState<'one-off' | 'repeating' | 'finite'>('one-off');
  const [focusedCriterionIndex, setFocusedCriterionIndex] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDate, setDueDate] = useState<Date>(new Date());

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
    } else if (actionType === 'repeating') {
      // default to 1 if not selected yet
      payload.repeat_every_days = payload.repeat_every_days ?? 1;
      payload.slice_count_target = null;
    } else if (actionType === 'finite') {
      // validate total steps
      if (!payload.slice_count_target || payload.slice_count_target < 1 || payload.slice_count_target > 32767) {
        Alert.alert('Invalid Value', 'Total steps must be between 1 and 32767');
        return;
      }
      payload.repeat_every_days = null;
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
        style={{ flex: 1, backgroundColor: theme.colors.pageBackground }}
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
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Title</Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter action title"
              placeholderTextColor={theme.colors.grey[500]}
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
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Duration (minutes)</Text>
            <TextInput
              value={formData.est_minutes > 0 ? formData.est_minutes.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, est_minutes: text ? parseInt(text) : 0 }))}
              placeholder="Enter duration in minutes"
              placeholderTextColor={theme.colors.grey[500]}
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
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Due Date</Text>
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
                  themeVariant="light"
                />
                {Platform.OS === 'ios' && (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={{
                        backgroundColor: '#000',
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderRadius: 8
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '600' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Acceptance Criteria */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Acceptance Criteria</Text>
              <TouchableOpacity onPress={addCriterion}>
                <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>+ Add Bullet</Text>
              </TouchableOpacity>
            </View>
            
            {/* Intro */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 4, color: theme.colors.grey[600] }}>Intro (optional)</Text>
              <TextInput
                value={formData.acceptance_intro || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, acceptance_intro: text || undefined }))}
                placeholder="One sentence setting intention..."
                placeholderTextColor={theme.colors.grey[500]}
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
                    <Ionicons name="close-circle" size={20} color={theme.colors.icon.error} />
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  value={criterion.title}
                  onChangeText={(text) => updateCriterion(index, 'title', text)}
                  placeholder="Short title (e.g. 'Read 10 pages')"
                  placeholderTextColor={theme.colors.text.placeholder}
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
                  placeholderTextColor={theme.colors.text.placeholder}
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
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 4, color: theme.colors.grey[600] }}>Outro (optional)</Text>
              <TextInput
                value={formData.acceptance_outro || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, acceptance_outro: text || undefined }))}
                placeholder="One sentence defining 'done'..."
                placeholderTextColor={theme.colors.grey[500]}
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
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Action Type</Text>
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
                    backgroundColor: actionType === opt.value ? theme.colors.border.selected : theme.colors.background.card,
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
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Repeat Every</Text>
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
                      backgroundColor: formData.repeat_every_days === option.value ? theme.colors.border.selected : theme.colors.background.card,
                      borderRadius: 8,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ color: formData.repeat_every_days === option.value ? theme.colors.text.inverse : theme.colors.text.primary, fontWeight: '600', fontSize: 14 }}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Finite total steps */}
          {actionType === 'finite' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Total Steps</Text>
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
                placeholderTextColor={theme.colors.grey[500]}
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
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Difficulty</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <TouchableOpacity
                  key={diff}
                  onPress={() => setFormData(prev => ({ ...prev, difficulty: diff }))}
                  style={{
                    flex: 1,
                    padding: 12,
                    backgroundColor: formData.difficulty === diff ? theme.colors.border.selected : theme.colors.background.card,
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

const ActionOccurrencePage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { deferOccurrence, state, updateAction: updateActionInContext, deleteActionOccurrence: deleteActionOccurrenceInContext, isScreenshotMode } = useData();
  const { show: showToast } = useToast();
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
    sliceCountTarget?: number;
    occurrenceNo?: number;
    isCompleted?: boolean;
    isOverdue?: boolean;
    completedAt?: string;
    note?: string;
    aiRating?: number;
    aiFeedback?: string;
    acceptanceCriteria?: { title: string; description: string }[];
  } | undefined;
  
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
  const [editingAction, setEditingAction] = useState<any>(null);
  const [menuButtonLayout, setMenuButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const menuButtonRef = useRef<View>(null);
  
  // Artifact-related state
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Review state
  const [aiRating, setAiRating] = useState<number | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);

  // Helper function to derive category from rating
  const getCategoryFromRating = (rating: number): 'okay' | 'good' | 'very_good' | 'excellent' => {
    if (rating >= 90) return 'excellent';
    if (rating >= 75) return 'very_good';
    if (rating >= 50) return 'good';
    return 'okay';
  };

  // Load artifacts when component mounts
  useEffect(() => {
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
        // Load AI review data if available
        if (response.data.occurrence.ai_rating) {
          setAiRating(response.data.occurrence.ai_rating);
          setAiFeedback(response.data.occurrence.ai_feedback);
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

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleImageUpload = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    if (!params?.occurrenceId) return;

    setIsUploading(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        showToast('Error', 'Please log in to upload photos.');
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
        showToast('Success', 'Photo uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Error', 'Failed to upload photo. Please try again.');
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
                showToast('Error', 'Please log in to delete photos.');
                return;
              }

              await deleteArtifact(artifactId, session.access_token);
              setArtifacts(prev => prev.filter(artifact => artifact.id !== artifactId));
              showToast('Success', 'Photo deleted successfully!');
            } catch (error) {
              console.error('Error deleting image:', error);
              showToast('Error', 'Failed to delete photo. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleComplete = async () => {
    if (!params?.occurrenceId) return;

    setIsSubmitting(true);
    setIsGeneratingReview(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        showToast('Error', 'Please log in to complete actions.');
        return;
      }

      // Complete the occurrence first
      await completeOccurrence(params.occurrenceId, note.trim() || undefined, session.access_token);
      
      setIsCompleted(true);
      showToast('Success', 'Action completed successfully!');
      
      // Track action completed event
      trackEvent('action_completed', {
        action_id: params.occurrenceId,
        action_title: actionData?.title || params?.actionTitle,
        dream_title: dreamAreaData?.dreamTitle || params?.dreamTitle,
        has_note: !!note.trim(),
        has_artifacts: artifacts.length > 0,
      });
      
        // Generate AI review if we have artifacts or a note
        let finalAiRating = aiRating;
        let finalAiFeedback = aiFeedback;
        
        if (artifacts.length > 0 || note.trim()) {
          try {
            const reviewResponse = await generateAIReview({
              occurrenceId: params.occurrenceId,
              note: note.trim() || undefined,
              artifacts: artifacts
            }, session.access_token);
            
            if (reviewResponse.success) {
              finalAiRating = reviewResponse.data.rating;
              finalAiFeedback = reviewResponse.data.feedback;
              setAiRating(finalAiRating);
              setAiFeedback(finalAiFeedback);
            }
        } catch (reviewError) {
          console.error('Error generating AI review:', reviewError);
          // Don't show error to user, just log it
        }
      }
      
      // Navigate to confirmation page
      (navigation as any).navigate('ArtifactSubmitted', {
        occurrenceId: params.occurrenceId,
        actionTitle: actionData?.title || params?.actionTitle,
        dreamTitle: dreamAreaData?.dreamTitle || params?.dreamTitle,
        areaName: dreamAreaData?.areaName || params?.areaName,
        areaEmoji: dreamAreaData?.areaEmoji || params?.areaEmoji,
        note: note.trim(),
        artifacts: artifacts,
        aiRating: finalAiRating,
        aiFeedback: finalAiFeedback
      });
    } catch (error) {
      console.error('Error completing action:', error);
      showToast('Error', 'Failed to complete action. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsGeneratingReview(false);
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
        areaEmoji: params.areaEmoji
      };
    }
    
    // Try from actionData with nested areas relationship
    if (actionData && actionData.areas) {
      return {
        dreamTitle: actionData.areas.dreams?.title,
        areaName: actionData.areas.title,
        areaEmoji: actionData.areas.icon
      };
    }
    
    // Fallback: try to get dream and area data from the occurrence directly
    if (occurrenceData && 'actions' in occurrenceData) {
      const actions = (occurrenceData as any).actions;
      if (actions && actions.areas) {
        return {
          dreamTitle: actions.areas.dreams?.title,
          areaName: actions.areas.title,
          areaEmoji: actions.areas.icon
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
                areaEmoji: area.icon
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
ACTION: ${actionTitle}
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
          controlsColor: theme.colors.grey[900],
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
      slice_count_target: actionData.slice_count_target,
      acceptance_criteria: actionData.acceptance_criteria || [],
      acceptance_intro: (actionData as any).acceptance_intro,
      acceptance_outro: (actionData as any).acceptance_outro,
      dream_image: dreamAreaData?.areaEmoji || '',
      occurrence_no: occurrenceData?.occurrence_no || 1
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
      const updates: { title?: string; est_minutes?: number; difficulty?: string; repeat_every_days?: number; slice_count_target?: number; acceptance_criteria?: { title: string; description: string }[]; acceptance_intro?: string; acceptance_outro?: string } = {};
      
      if (updatedAction.title !== actionData.title) updates.title = updatedAction.title;
      if (updatedAction.est_minutes !== actionData.est_minutes) updates.est_minutes = updatedAction.est_minutes;
      if (updatedAction.difficulty !== actionData.difficulty) updates.difficulty = updatedAction.difficulty;
      if (updatedAction.repeat_every_days !== actionData.repeat_every_days) updates.repeat_every_days = updatedAction.repeat_every_days;
      if (updatedAction.slice_count_target !== actionData.slice_count_target) updates.slice_count_target = updatedAction.slice_count_target;
      if (JSON.stringify(updatedAction.acceptance_criteria) !== JSON.stringify(actionData.acceptance_criteria)) {
        updates.acceptance_criteria = updatedAction.acceptance_criteria;
      }
      if ((updatedAction as any).acceptance_intro !== ((actionData as any).acceptance_intro || undefined)) {
        updates.acceptance_intro = (updatedAction as any).acceptance_intro || undefined;
      }
      if ((updatedAction as any).acceptance_outro !== ((actionData as any).acceptance_outro || undefined)) {
        updates.acceptance_outro = (updatedAction as any).acceptance_outro || undefined;
      }

      if (Object.keys(updates).length === 0) {
        setShowEditModal(false);
        return;
      }

      await updateAction(actionData.id, updates, session.access_token);
      
      // Update the DataContext optimistically
      await updateActionInContext(actionData.id, updates);
      
      setShowEditModal(false);
      showToast('Action Updated', 'Changes saved successfully.');
    } catch (error) {
      console.error('Error updating action:', error);
      showToast('Error', 'Failed to update action. Please try again.');
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
      <StatusBar style="dark" />
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
        <View style={styles.headerRight}>
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
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 0.5,
                borderColor: 'rgba(255, 255, 255, 0.8)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                fontWeight: '600', 
                color: theme.colors.grey[900] 
              }}>
                Plan with AI
              </Text>
            </BlurView>
          </TouchableOpacity>
          
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
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 200 } // Space for floating bottom section
        ]}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            {/* Icon and Title Row */}
            <View style={styles.iconTitleRow}>
              {(dreamAreaData?.areaEmoji || params?.areaEmoji) ? (
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>{dreamAreaData?.areaEmoji || params?.areaEmoji}</Text>
                </View>
              ) : (
                <View style={styles.iconPlaceholder}>
                  <Ionicons name="flag" size={24} color={theme.colors.grey[500]} />
                </View>
              )}
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
            <View style={styles.dueDateRow}>
              <Text style={styles.detailLabel}>
                {isCompleted 
                  ? `Completed ${occurrenceData?.completed_at ? formatDate(occurrenceData.completed_at) : 'recently'}`
                  : `Due ${currentDueDate ? formatDate(currentDueDate) : 'No date'}`
                }
              </Text>
            </View>
            
            {/* Details Row */}
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={theme.colors.grey[600]} />
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
                  <Ionicons name="layers-outline" size={16} color={theme.colors.grey[600]} />
                  <Text style={styles.detailValue}>
                    {occurrenceData?.occurrence_no ? `${occurrenceData.occurrence_no} of ${actionData?.slice_count_target || params?.sliceCountTarget}` : `${actionData?.slice_count_target || params?.sliceCountTarget} repeats`}
                  </Text>
                </View>
              )}
            </View>
            
          </View>
        </View>

        {/* Intro - Outside To Dos box */}
        {(actionData?.acceptance_intro || (params as any)?.acceptanceIntro) && (
          <View style={{ 
            paddingHorizontal: 24,
            paddingBottom: 12,
          }}>
            <Text style={{ 
              fontSize: 14, 
              color: theme.colors.grey[600],
            }}>
              {actionData?.acceptance_intro || (params as any)?.acceptanceIntro}
            </Text>
          </View>
        )}

        {/* Acceptance Criteria Section */}
        <View style={styles.acceptanceSection}>
          <View style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: 12, 
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.colors.grey[200],
          }}>
            {/* Header Row */}
            <View style={{ 
              backgroundColor: '#000000', // Black
              paddingVertical: 10,
              paddingHorizontal: 16,
            }}>
              <Text style={{ 
                color: '#FFFFFF', 
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
                  borderBottomColor: theme.colors.grey[100],
                }}>
                  {/* Number Column */}
                  <View style={{ 
                    width: 50, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    paddingVertical: 16,
                  }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: '700', 
                      color: '#000000' 
                    }}>
                      {index + 1}
                    </Text>
                  </View>
                  
                  {/* Vertical Divider */}
                  <View style={{
                    width: 1,
                    backgroundColor: theme.colors.grey[100],
                    marginVertical: 12,
                  }} />
                  
                  {/* Text Column */}
                  <View style={{ 
                    flex: 1, 
                    justifyContent: 'center', 
                    padding: 16,
                  }}>
                    <View>
                      <Text style={{ 
                        fontSize: 14, 
                        fontWeight: '700', 
                        color: theme.colors.grey[900],
                        lineHeight: 20,
                        marginBottom: criteria.description ? 4 : 0
                      }}>
                        {criteria.title}
                      </Text>
                      {criteria.description ? (
                        <Text style={{ 
                          fontSize: 14, 
                          fontWeight: '400', 
                          color: theme.colors.grey[500],
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
                  <Text style={{ color: theme.colors.grey[500] }}>No specific criteria defined</Text>
                </View>
              );
            })()}
          </View>
        </View>

        {/* Outro - Outside To Dos box */}
        {(actionData?.acceptance_outro || (params as any)?.acceptanceOutro) && (
          <View style={{ 
            paddingHorizontal: 24,
            paddingTop: 12,
          }}>
            <Text style={{ 
              fontSize: 14, 
              color: theme.colors.grey[600],
            }}>
              {actionData?.acceptance_outro || (params as any)?.acceptanceOutro}
            </Text>
          </View>
        )}

        {/* AI Help Section - REMOVED */}

        {/* AI Review Section */}
        {aiRating !== null && (
          <View style={styles.aiReviewSection}>
            <Text style={styles.sectionTitle}>AI Review</Text>
            <View style={styles.aiReviewContent}>
              <AIRatingRing 
                rating={aiRating} 
                category={getCategoryFromRating(aiRating)} 
                size={80} 
                strokeWidth={6} 
              />
              {aiFeedback && (
                <Text style={styles.aiFeedback}>{aiFeedback}</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Options Popover */}
      <OptionsPopover
        visible={showOptionsPopover}
        onClose={() => setShowOptionsPopover(false)}
        options={menuOptions}
        triggerPosition={menuButtonLayout.x > 0 ? menuButtonLayout : undefined}
      />

      {/* Edit Modal */}
      <EditActionModal
        visible={showEditModal}
        action={editingAction}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        dreamEndDate={undefined}
      />

        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Bottom Section - Floating above nav bar */}
      <View style={[styles.bottomSection, { bottom: insets.bottom }]}>
          {/* Uploaded Images Row */}
          {artifacts.length > 0 && !(isScreenshotMode && (params?.occurrenceId === 'occ-area-2-1' || params?.occurrenceId === 'mock-occ-1' || ((params?.actionTitle || (occurrenceData as any)?.action_title || '').toLowerCase().includes('high protein')))) && (
            <View style={styles.uploadedImagesRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                {artifacts.map((artifact) => (
                  <View key={artifact.id} style={styles.artifactImageContainer}>
                    <Image
                      source={{ uri: artifact.signed_url }}
                      style={styles.uploadedImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.deleteImageButton}
                      onPress={() => handleDeleteImage(artifact.id)}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.icon.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Upload Button and Text Input Row */}
          <View style={styles.inputRow}>
            {(() => {
              if (!isScreenshotMode || artifacts.length === 0) {
                console.log('🔍 [RENDER] Not showing image:', { isScreenshotMode, artifactsLength: artifacts.length });
                return false;
              }
              const actionTitle = params?.actionTitle || (occurrenceData as any)?.action_title || '';
              const isHighProtein = params?.occurrenceId === 'occ-area-2-1' || 
                                    params?.occurrenceId === 'mock-occ-1' || 
                                    actionTitle.toLowerCase().includes('high protein');
              console.log('🔍 [RENDER] Checking high protein:', { 
                occurrenceId: params?.occurrenceId, 
                actionTitle, 
                isHighProtein,
                artifactsLength: artifacts.length 
              });
              return isHighProtein;
            })() ? (
              // Show photo instead of upload button in screenshot mode
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: artifacts[0].signed_url }}
                  style={styles.photoInRow}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
                onPress={handleImagePicker}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Ionicons name="hourglass-outline" size={24} color={theme.colors.grey[500]} />
                ) : (
                  <Ionicons name="add" size={24} color={theme.colors.grey[900]} />
                )}
                <Text style={[styles.uploadText, isUploading && styles.uploadTextDisabled]}>
                  {isUploading ? 'Uploading...' : 'Upload Photo'}
                </Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={styles.textInputInRow}
              placeholder="Add a note about your progress..."
              placeholderTextColor={theme.colors.grey[500]}
              multiline
              value={note}
              onChangeText={setNote}
            />
          </View>
          
          <View style={styles.actionButtons}>
            <Button
              title={
                isSubmitting 
                  ? "Submitting..." 
                  : (isCompleted ? "Re-submit" : "Mark as Done")
              }
              variant="black"
              onPress={handleComplete}
              disabled={isSubmitting}
              style={{ borderRadius: theme.radius.xl }}
            />
          </View>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
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
    paddingBottom: 0,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 0,
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
    backgroundColor: theme.colors.grey[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleColumn: {
    flex: 1,
  },
  dreamTitle: {
    fontSize: 12,
    color: theme.colors.grey[600],
    textAlign: 'left',
    marginBottom: 4,
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.grey[700],
    textAlign: 'left',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
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
    color: theme.colors.grey[900],
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
    color: theme.colors.grey[600],
  },
  aiHelpSection: {
    padding: 24,
    paddingTop: 4,
    marginBottom: 16,
  },
  aiHelpSecondaryText: {
    fontSize: 14,
    color: theme.colors.grey[600],
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
    color: theme.colors.grey[900],
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
  aiReviewSection: {
    padding: 24,
    paddingTop: 8,
    marginBottom: 16,
  },
  aiReviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  aiFeedback: {
    fontSize: 14,
                  color: theme.colors.text.primary,
    textAlign: 'left',
    lineHeight: 20,
    flex: 1,
  },
  bottomSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 9999,
    elevation: 9999,
  },
  uploadedImagesRow: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  uploadButton: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.xl,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadText: {
    fontSize: 12,
    color: theme.colors.grey[900],
    marginTop: 4,
    textAlign: 'center',
  },
  textInputInRow: {
    flex: 1,
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.xl,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtons: {
    width: '100%',
  },
  imagesSection: {
    marginBottom: 16,
  },
  imagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
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
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadTextDisabled: {
    color: theme.colors.grey[500],
  },
  photoContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInRow: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.xl,
  },
});

export default ActionOccurrencePage;
