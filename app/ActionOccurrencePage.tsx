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
  Keyboard
} from 'react-native';
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
import { useData } from '../contexts/DataContext';
import { deleteActionOccurrence, updateActionOccurrence, updateAction, uploadArtifact, getArtifacts, deleteArtifact, completeOccurrence, generateAIReview, type Artifact } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import type { ActionOccurrenceStatus } from '../backend/database/types';

// Edit Action Modal Component (copied from ActionChipsList)
interface EditActionModalProps {
  visible: boolean;
  action: any | null;
  onClose: () => void;
  onSave: (updatedAction: any) => void;
}

function EditActionModal({ visible, action, onClose, onSave }: EditActionModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    est_minutes: 0,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    repeat_every_days: undefined as number | undefined,
    slice_count_target: undefined as number | undefined,
    acceptance_criteria: [] as string[],
    dream_image: '',
    occurrence_no: 1
  });

  React.useEffect(() => {
    if (action) {
      setFormData(action);
    }
  }, [action]);

  const handleSave = () => {
    Keyboard.dismiss(); // Close keyboard when saving
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the action');
      return;
    }
    if (!formData.est_minutes || formData.est_minutes <= 0) {
      Alert.alert('Error', 'Please enter a valid duration in minutes');
      return;
    }
    onSave(formData);
    onClose();
  };

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: [...(prev.acceptance_criteria || []), '']
    }));
  };

  const updateCriterion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptance_criteria: prev.acceptance_criteria?.map((c, i) => i === index ? value : c) || []
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
        style={{ flex: 1, backgroundColor: '#F3F4F6' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
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
          <TouchableOpacity onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}>
            <Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Edit Action</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={{ fontSize: 16, color: '#000', fontWeight: '600' }}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
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
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Duration (minutes) *</Text>
            <TextInput
              value={formData.est_minutes > 0 ? formData.est_minutes.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, est_minutes: text ? parseInt(text) : 0 }))}
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

          {/* Slice Count Target */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Series Parts (optional)</Text>
            <TextInput
              value={formData.slice_count_target ? formData.slice_count_target.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ ...prev, slice_count_target: text ? parseInt(text) : undefined }))}
              placeholder="Number of parts in series (3-12)"
              keyboardType="numeric"
              style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 12,
                fontSize: 16
              }}
            />
            <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              For finite series actions only. Leave empty for one-off or repeating actions.
            </Text>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ActionOccurrencePage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { deferOccurrence, state, updateAction: updateActionInContext, deleteActionOccurrence: deleteActionOccurrenceInContext } = useData();
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
    acceptanceCriteria?: string[];
  } | undefined;
  
  // Find the actual occurrence data from DataContext
  const occurrenceData = useMemo(() => {
    console.log('🔍 occurrenceData useMemo - params:', params);
    console.log('🔍 occurrenceData useMemo - state.today:', state.today);
    console.log('🔍 occurrenceData useMemo - state.dreamDetail:', state.dreamDetail);
    
    if (!params?.occurrenceId) {
      console.log('🔍 No occurrenceId in params');
      return null;
    }
    
    // First try to find in today's data
    const todayOccurrence = state.today?.occurrences.find(occ => occ.id === params.occurrenceId);
    if (todayOccurrence) {
      console.log('🔍 Found occurrence in today:', todayOccurrence);
      return todayOccurrence;
    }
    
    // If not found in today's data, search in dream detail caches
    for (const dreamId in state.dreamDetail) {
      const dreamDetail = state.dreamDetail[dreamId];
      if (dreamDetail) {
        const occurrence = dreamDetail.occurrences.find(occ => occ.id === params.occurrenceId);
        if (occurrence) {
          console.log('🔍 Found occurrence in dreamDetail:', occurrence);
          // We need to get the action data too, but it's not directly available in dream detail
          // For now, we'll use the occurrence data and fall back to params for action details
          return occurrence;
        }
      }
    }
    
    console.log('🔍 No occurrence found');
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
  }, [params?.occurrenceId]);

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
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      default: return '#4CAF50';
    }
  };

  const getStatusColor = () => {
    if (isCompleted) return '#4CAF50';
    if ((occurrenceData as any)?.is_overdue || params?.isOverdue) return '#F44336';
    return '#666';
  };

  const getPageBackgroundColor = () => {
    if (isCompleted) return '#E8F5E8'; // Light green for completed
    if ((occurrenceData as any)?.is_overdue || params?.isOverdue) return '#FFF3E0'; // Light orange for overdue
    return theme.colors.pageBackground; // Default background
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
    console.log('🔍 actionData useMemo - occurrenceData:', occurrenceData);
    if (occurrenceData && 'actions' in occurrenceData) {
      const actions = (occurrenceData as any).actions;
      console.log('🔍 actionData extracted:', actions);
      
      // Ensure the action has an ID - it should be in the occurrence's action_id field
      console.log('🔍 occurrenceData.action_id:', occurrenceData.action_id);
      if (actions && occurrenceData.action_id) {
        const actionWithId = {
          ...actions,
          id: occurrenceData.action_id
        };
        console.log('🔍 actionData with ID:', actionWithId);
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
            console.log('🔍 Found action in dreamDetail:', action);
            return action;
          }
        }
      }
    }
    
    console.log('🔍 No actionData found');
    return null;
  }, [occurrenceData, state.dreamDetail]);

  // Get dream and area data from the occurrence
  const dreamAreaData = useMemo(() => {
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
    
    return null;
  }, [actionData, occurrenceData]);

  const generateAIDiscussionPrompt = () => {
    const dreamTitle = dreamAreaData?.dreamTitle || params?.dreamTitle || 'My Dream';
    const areaName = dreamAreaData?.areaName || params?.areaName || 'Area';
    const actionTitle = actionData?.title || params?.actionTitle || 'Action';
    const estimatedTime = actionData?.est_minutes ? formatTime(actionData.est_minutes) : (params?.estimatedTime ? formatTime(params.estimatedTime) : 'No time estimate');
    const difficulty = actionData?.difficulty || params?.difficulty || 'easy';
    const dueDate = currentDueDate ? formatDate(currentDueDate) : 'No due date';
    const currentNote = note.trim() || 'No notes yet';
    const acceptanceCriteria = actionData?.acceptance_criteria || params?.acceptanceCriteria || [];
    
    // Format acceptance criteria
    const criteriaText = acceptanceCriteria.length > 0 
      ? acceptanceCriteria.map((criteria: string, index: number) => `${index + 1}. ${criteria}`).join('\n')
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
      
      // Show confirmation toast
      showToast('Prompt copied', 'If the chat isn\'t prefilled, just paste.');
      
      // Open ChatGPT with pre-filled text
      const encodedPrompt = encodeURIComponent(prompt);
      const chatgptUrl = `https://chatgpt.com/?q=${encodedPrompt}`;
      
      await WebBrowser.openBrowserAsync(chatgptUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: theme.colors.grey[900],
      });
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
        case 'easy': return '#4CAF50';
        case 'medium': return '#FF9800';
        case 'hard': return '#F44336';
        default: return '#4CAF50';
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
              backgroundColor: bar <= barCount ? barColor : '#E0E0E0',
              borderRadius: 1.5
            }}
          />
        ))}
      </View>
    );
  };

  const handleEditAction = () => {
    console.log('🔍 handleEditAction called');
    console.log('🔍 actionData:', actionData);
    console.log('🔍 occurrenceData:', occurrenceData);
    console.log('🔍 dreamAreaData:', dreamAreaData);
    
    if (!actionData) {
      console.log('❌ No actionData available');
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
      dream_image: dreamAreaData?.areaEmoji || '',
      occurrence_no: occurrenceData?.occurrence_no || 1
    };

    console.log('🔍 actionForEdit:', actionForEdit);
    setEditingAction(actionForEdit);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedAction: any) => {
    console.log('🔍 handleSaveEdit called');
    console.log('🔍 updatedAction:', updatedAction);
    console.log('🔍 actionData:', actionData);
    
    try {
      if (!actionData?.id) {
        console.log('❌ No actionData.id available');
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
      const updates: { title?: string; est_minutes?: number; difficulty?: string; repeat_every_days?: number; slice_count_target?: number; acceptance_criteria?: string[] } = {};
      
      if (updatedAction.title !== actionData.title) updates.title = updatedAction.title;
      if (updatedAction.est_minutes !== actionData.est_minutes) updates.est_minutes = updatedAction.est_minutes;
      if (updatedAction.difficulty !== actionData.difficulty) updates.difficulty = updatedAction.difficulty;
      if (updatedAction.repeat_every_days !== actionData.repeat_every_days) updates.repeat_every_days = updatedAction.repeat_every_days;
      if (updatedAction.slice_count_target !== actionData.slice_count_target) updates.slice_count_target = updatedAction.slice_count_target;
      if (JSON.stringify(updatedAction.acceptance_criteria) !== JSON.stringify(actionData.acceptance_criteria)) {
        updates.acceptance_criteria = updatedAction.acceptance_criteria;
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
                showToast('Error', 'No action to delete.');
                return;
              }

              // Get auth token
              const { data: { session } } = await supabaseClient.auth.getSession();
              if (!session?.access_token) {
                showToast('Error', 'Please log in to delete actions.');
                return;
              }

              await deleteActionOccurrence(params.occurrenceId, session.access_token);
              
              // Update the DataContext optimistically
              await deleteActionOccurrenceInContext(params.occurrenceId);
              
              showToast('Action Deleted', 'The action has been removed.');
              // Navigate back after deletion
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting action:', error);
              showToast('Error', 'Failed to delete action. Please try again.');
            }
          }
        }
      ]
    );
  };

  const menuOptions = [
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
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: getPageBackgroundColor() }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="chevron_left"
          onPress={() => navigation.goBack()}
          variant="ghost"
          size="md"
          style={styles.backButton}
        />
        <View style={styles.headerRight}>
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.imageContainer}>
            {(dreamAreaData?.areaEmoji || params?.areaEmoji) ? (
              <View style={styles.emojiContainer}>
                <Text style={styles.emojiText}>{dreamAreaData?.areaEmoji || params?.areaEmoji}</Text>
              </View>
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="flag" size={48} color={theme.colors.grey[500]} />
              </View>
            )}
          </View>
          
          <View style={styles.heroContent}>
            <Text style={styles.dreamTitle}>{dreamAreaData?.dreamTitle || params?.dreamTitle || 'My Dream'}</Text>
            <Text style={styles.areaTitle}>{dreamAreaData?.areaName || params?.areaName || 'Area'}</Text>
            <Text style={styles.actionTitle}>{actionData?.title || params?.actionTitle || 'Action'}</Text>
            
            {/* Due Date or Completed Date */}
            <Text style={styles.detailLabel}>
              {isCompleted 
                ? `Completed ${occurrenceData?.completed_at ? formatDate(occurrenceData.completed_at) : 'recently'}`
                : `Due ${currentDueDate ? formatDate(currentDueDate) : 'No date'}`
              }
            </Text>
            
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
            
            <TouchableOpacity style={styles.aiDiscussionLink} onPress={handleAIDiscussion}>
              <Text style={styles.aiDiscussionText}>Discuss with AI Agent How to Best Do This</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Acceptance Criteria Section */}
        <View style={styles.acceptanceSection}>
          <Text style={styles.sectionTitle}>Acceptance Criteria</Text>
          <View style={styles.criteriaList}>
            {(actionData?.acceptance_criteria && actionData.acceptance_criteria.length > 0) || (params?.acceptanceCriteria && params.acceptanceCriteria.length > 0) ? (
              (actionData?.acceptance_criteria || params?.acceptanceCriteria || []).map((criteria: string, index: number) => (
                <Text key={index} style={styles.criteriaItem}>
                  {index + 1}. {criteria}
                </Text>
              ))
            ) : (
              <Text style={styles.criteriaItem}>No specific criteria defined</Text>
            )}
          </View>
        </View>

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

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Upload Button and Images Row */}
        <View style={styles.uploadAndImagesRow}>
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
          
          {/* Uploaded Images */}
          {artifacts.length > 0 && (
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
                    <Ionicons name="close-circle" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Full Width Text Input */}
        <TextInput
          style={styles.fullWidthTextInput}
          placeholder="Add a note about your progress..."
          placeholderTextColor={theme.colors.grey[500]}
          multiline
          value={note}
          onChangeText={setNote}
        />
        
        <View style={styles.actionButtons}>
          {!isCompleted && (
            <Button
              title="Defer +1 Day"
              variant="secondary"
              onPress={handleDefer}
              style={styles.deferButton}
            />
          )}
            <Button
              title={
                isSubmitting 
                  ? (isGeneratingReview ? "Generating AI Review..." : "Submitting...") 
                  : (isCompleted ? "Re-submit" : "Mark as Done")
              }
              variant="primary"
              onPress={handleComplete}
              style={styles.completeButton}
              disabled={isSubmitting}
            />
        </View>
      </View>

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
      />

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: 12,
  },
  headerRight: {
    width: 40,
  },
  menuButton: {
    // IconButton handles its own styling
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    padding: 24,
    marginBottom: 8,
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 16,
  },
  emojiContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 120,
  },
  dreamImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.grey[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'flex-start',
    paddingHorizontal: 0,
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
    marginBottom: 8,
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
  detailValue: {
    fontSize: 14,
    color: theme.colors.grey[600],
  },
  aiDiscussionLink: {
    marginTop: 12,
  },
  aiDiscussionText: {
    fontSize: 16,
    color: theme.colors.grey[900],
    textDecorationLine: 'underline',
  },
  acceptanceSection: {
    padding: 24,
    paddingTop: 8,
    marginBottom: 16,
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
    color: theme.colors.grey[700],
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
    color: theme.colors.black,
    textAlign: 'left',
    lineHeight: 20,
    flex: 1,
  },
  bottomSection: {
    padding: 16,
    paddingBottom: 32,
  },
  uploadAndImagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  inputSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  uploadText: {
    fontSize: 14,
    color: theme.colors.grey[900],
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.surface[50],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fullWidthTextInput: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deferButton: {
    flex: 1,
  },
  completeButton: {
    flex: 1,
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
    borderRadius: 12,
  },
  deleteImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadTextDisabled: {
    color: theme.colors.grey[500],
  },
});

export default ActionOccurrencePage;
