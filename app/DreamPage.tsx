import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/Icon';
import { AreaGrid } from '../components/AreaChips';
import { OptionsPopover } from '../components/OptionsPopover';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ProgressPhotosSection } from '../components/progress';
import { useData } from '../contexts/DataContext';
import { upsertDream, rescheduleActions, upsertAreas, getDefaultImages, uploadDreamImage, generateAreas, type DreamImage } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import type { Dream, Action, ActionOccurrence, Area, DreamWithStats } from '../backend/database/types';
import { SheetHeader } from '../components/SheetHeader';
import { BOTTOM_NAV_PADDING } from '../utils/bottomNavigation';
import { trackEvent } from '../lib/mixpanel';

// Popular emojis for area icons
const POPULAR_EMOJIS = [
  '🚀', '💪', '🎯', '🌟', '🔥', '💡', '🎨', '📚', '🏋️', '🎵',
  '🍎', '💼', '🏠', '❤️', '💎', '🎁', '⭐', '🌈', '☀️', '🌙',
  '🎪', '🎭', '🎬', '🎤', '🎧', '🎮', '🏆', '🎓', '💰', '💳',
  '✈️', '🚗', '⛰️', '🌊', '🏖️', '🌴', '🌺', '🌸', '🌻', '🌷',
  '🐶', '🐱', '🐼', '🐨', '🦁', '🐯', '🐸', '🐰', '🐦', '🦋',
  '🍕', '🍔', '🍟', '🌮', '🌯', '🍜', '🍱', '🍣', '🍰', '🍫',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
  '📱', '💻', '⌚', '📷', '🎥', '📺', '🔊', '🎙️', '📻', '🎚️',
  '🔧', '⚙️', '🔨', '⚡', '🔋', '💡', '🔦', '🕯️', '🧯', '🛠️',
  '🎯', '🎲', '🎰', '🎪', '🎭', '🎨', '🖼️', '🎬', '📽️', '🎞️'
];

interface DreamPageProps {
  route?: {
    params?: {
      dreamId?: string;
      title?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    };
  };
  navigation?: {
    goBack?: () => void;
    navigate?: (screen: string, params?: any) => void;
  };
}


const DreamPage: React.FC<DreamPageProps> = ({ route, navigation }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = route?.params || {};
  const { dreamId, title = 'Sample Dream' } = params;
  
  // Calculate image dimensions
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const imageHeight = screenHeight * 0.45;
  // Calculate image width to extend to screen edges (accounting for content padding)
  const imageWidth = screenWidth + (theme.spacing.md * 2);
  
  const { state, getDreamDetail, getDreamsWithStats, getProgress, deleteDream, archiveDream, onScreenFocus, isScreenshotMode } = useData();
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);
  const [optionsTriggerPosition, setOptionsTriggerPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editTimeCommitment, setEditTimeCommitment] = useState({ hours: 0, minutes: 30 });
  const [timePickerDate, setTimePickerDate] = useState(() => {
    const date = new Date();
    date.setHours(0, 30, 0, 0);
    return date;
  });
  const [startDatePickerDate, setStartDatePickerDate] = useState(new Date());
  const [endDatePickerDate, setEndDatePickerDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showCreateAreaModal, setShowCreateAreaModal] = useState(false);
  const [newAreaTitle, setNewAreaTitle] = useState('');
  const [newAreaIcon, setNewAreaIcon] = useState('🚀');
  const [isCreatingArea, setIsCreatingArea] = useState(false);
  const [defaultImages, setDefaultImages] = useState<DreamImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [localAreas, setLocalAreas] = useState<Area[]>([]);
  const [figurineUrl, setFigurineUrl] = useState<string | null>(null);
  const [isLoadingFigurine, setIsLoadingFigurine] = useState(false);
  const optionsButtonRef = useRef<View>(null);

  // Get data directly from state - no intermediate state needed
  const detailData = dreamId ? state.dreamDetail[dreamId] : undefined;
  const areas = detailData?.areas || [];
  const dreamDetail = detailData?.dream || null;
  const dreamData = dreamId && state.dreamsWithStats?.dreams 
    ? state.dreamsWithStats.dreams.find(d => d.id === dreamId) || null
    : null;

  // Sync local areas with server areas when they change
  useEffect(() => {
    if (areas.length > 0) {
      setLocalAreas(areas);
    }
  }, [areas]);

  // Load user's figurine from profile
  useEffect(() => {
    const loadUserFigurine = async () => {
      try {
        setIsLoadingFigurine(true);
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('figurine_url')
            .eq('user_id', user.id)
            .single();

          if (!error && profile?.figurine_url) {
            setFigurineUrl(profile.figurine_url);
            // Prefetch the image for faster loading
            Image.prefetch(profile.figurine_url).catch(() => {
              // Silently fail - image will load normally
            });
          } else {
            setFigurineUrl(null);
          }
        }
      } catch (error) {
        console.error('Error loading user figurine:', error);
        setFigurineUrl(null);
      } finally {
        setIsLoadingFigurine(false);
      }
    };

    loadUserFigurine();
  }, []);

  // Check if we're loading detail data (areas, history sections)
  // Main content can render with just dreamData, so we only need to wait for detailData
  const isLoadingDetailData = dreamId && !detailData;

  useEffect(() => {
    if (dreamId) {
      // Initial load - fetch data (will use cache if available)
      getDreamDetail(dreamId);
      getDreamsWithStats();
      getProgress();
    }
  }, [dreamId]); // Only depend on dreamId - functions are stable from DataContext

  // Re-fetch data when user navigates back to this screen
  useFocusEffect(
    React.useCallback(() => {
      if (dreamId) {
        onScreenFocus('dream-detail', dreamId);
        trackEvent('dream_detail_viewed', { dream_id: dreamId });
        // Let the refresh system handle the fetching based on staleness
        getDreamDetail(dreamId);
        getDreamsWithStats();
        getProgress();
      }
    }, [dreamId]) // Only depend on dreamId - functions are stable from DataContext
  );

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

  const calculateDayProgress = () => {
    if (!dreamData) return { current: 1, total: null };
    
    const startDate = new Date(dreamData.start_date);
    const endDate = dreamData.end_date ? new Date(dreamData.end_date) : null;
    // Use mocked date for screenshot mode (Jan 1, 2026), otherwise real date
    const today = isScreenshotMode ? new Date('2026-01-01') : new Date();
    
    if (endDate) {
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const currentDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return { current: Math.max(1, currentDay), total: totalDays };
    }
    
    // If no end date, calculate days since start
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { current: Math.max(1, daysSinceStart), total: null };
  };

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleOptionsPress = () => {
    trackEvent('dream_options_opened', { dream_id: dreamId });
    optionsButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      setOptionsTriggerPosition({ x: pageX, y: pageY, width, height });
      setShowOptionsPopover(true);
    });
  };

  const handleAreaPress = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    if (area && navigation?.navigate) {
      trackEvent('dream_area_pressed', { area_id: areaId, dream_id: dreamId });
      navigation.navigate('Area', {
        areaId: area.id,
        areaTitle: area.title,
        areaEmoji: area.icon || '🚀',
        areaImageUrl: area.image_url,
        dreamId: dreamId,
        dreamTitle: title
      });
    }
  };

  const handleDeleteDream = () => {
    Alert.alert(
      'Delete Dream',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (dreamId) {
                await deleteDream(dreamId);
                trackEvent('dream_deleted', { dream_id: dreamId });
                // Navigate back to dreams list after successful deletion
                if (navigation?.goBack) {
                  navigation.goBack();
                }
              }
            } catch (error) {
              console.error('Error deleting dream:', error);
              Alert.alert('Error', 'Failed to delete dream. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleArchiveDream = () => {
    Alert.alert(
      'Archive Dream',
      `Are you sure you want to archive "${title}"? You can unarchive it later.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              if (dreamId) {
                await archiveDream(dreamId);
                trackEvent('dream_archived', { dream_id: dreamId });
                // Navigate back to dreams list after successful archiving
                if (navigation?.goBack) {
                  navigation.goBack();
                }
              }
            } catch (error) {
              console.error('Error archiving dream:', error);
              Alert.alert('Error', 'Failed to archive dream. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditDream = () => {
    if (dreamData) {
      setEditTitle(dreamData.title);
      setEditStartDate(formatDateForDisplay(dreamData.start_date));
      setEditEndDate(formatDateForDisplay(dreamData.end_date || ''));
      setEditImageUrl(dreamData.image_url || null);
      
      // Initialize time commitment from dreamDetail (which has the full Dream type)
      const timeCommitment = dreamDetail?.time_commitment || { hours: 0, minutes: 30 };
      setEditTimeCommitment(timeCommitment);
      
      // Update time picker date
      const date = new Date();
      date.setHours(timeCommitment.hours, timeCommitment.minutes, 0, 0);
      setTimePickerDate(date);
      
      // Set start date picker to current start date
      if (dreamData.start_date) {
        const startDate = new Date(dreamData.start_date);
        setStartDatePickerDate(startDate);
      } else {
        setStartDatePickerDate(new Date());
      }
      
      // Set end date picker to current end date or today
      if (dreamData.end_date) {
        const endDate = new Date(dreamData.end_date);
        setEndDatePickerDate(endDate);
      } else {
        setEndDatePickerDate(new Date());
      }
      
      // Load default images
      loadDefaultImages();
      
      setShowEditModal(true);
    }
  };

  const loadDefaultImages = async () => {
    setIsLoadingImages(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (!session?.access_token) {
        setIsLoadingImages(false);
        return;
      }

      const response = await getDefaultImages(session.access_token);
      
      if (response.success && response.data?.images) {
        setDefaultImages(response.data.images);
      } else {
        setDefaultImages([]);
      }
    } catch (error) {
      console.error('❌ [DREAM PAGE] Error loading default images:', error);
      setDefaultImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleImageSelect = (imageUrl: string) => {
    setEditImageUrl(imageUrl);
  };

  const handleImageUpload = async () => {
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && dreamId) {
        setIsUploadingImage(true);
        try {
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session?.access_token) {
            // Create a file object for React Native
            const file = {
              uri: result.assets[0].uri,
              name: result.assets[0].fileName || 'image.jpg',
              type: result.assets[0].type || 'image/jpeg',
              size: result.assets[0].fileSize || 0,
            };

            const uploadResponse = await uploadDreamImage(file, dreamId, session.access_token);
            
            if (uploadResponse.success) {
              setEditImageUrl(uploadResponse.data.signed_url);
            }
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const performSave = async () => {
    if (!dreamId) return;
    
    setIsEditing(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        // For activated dreams, only send allowed fields
        const isActivated = dreamData?.activated_at;
        const updateData: any = {
          id: dreamId,
          title: editTitle.trim(),
        };

        // Always include image_url, start_date, and time_commitment
        if (editImageUrl) updateData.image_url = editImageUrl;
        updateData.start_date = formatDateForAPI(editStartDate);
        updateData.time_commitment = editTimeCommitment;
        
        // Only include end_date if it has a value
        const formattedEndDate = editEndDate ? formatDateForAPI(editEndDate) : null;
        if (formattedEndDate && formattedEndDate !== '') {
          updateData.end_date = formattedEndDate;
        }

        // Only include these fields if the dream is not activated
        if (!isActivated) {
          updateData.baseline = dreamData?.baseline || null;
          updateData.obstacles = dreamData?.obstacles || null;
          updateData.enjoyment = dreamData?.enjoyment || null;
        }

        await upsertDream(updateData, session.access_token);

        const changedFields = Object.keys(updateData).filter(key => key !== 'id');
        trackEvent('dream_edit_saved', { 
          dream_id: dreamId, 
          changed_fields: changedFields 
        });

        // Refresh the data
        await getDreamDetail(dreamId, { force: true });
        await getDreamsWithStats({ force: true });
        
        setShowEditModal(false);
        Alert.alert('Success', 'Dream updated successfully!');
      }
    } catch (error) {
      console.error('Error updating dream:', error);
      Alert.alert('Error', 'Failed to update dream. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleSaveEdit = async () => {
    Keyboard.dismiss(); // Close keyboard when saving
    if (!dreamId || !editTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for your dream.');
      return;
    }

    // Validate dates
    if (editStartDate && editEndDate) {
      const startDate = new Date(formatDateForAPI(editStartDate));
      const endDate = new Date(formatDateForAPI(editEndDate));
      if (startDate >= endDate) {
        Alert.alert('Error', 'End date must be after start date.');
        return;
      }
    }
    
    // Warn if end date is not set
    if (!editEndDate || editEndDate.trim() === '') {
      Alert.alert(
        'No End Date',
        'You haven\'t set an end date. Do you want to continue without an end date?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: () => {
              // Continue with save
              performSave();
            },
          },
        ]
      );
      return;
    }

    // Validate time commitment
    const totalMinutes = editTimeCommitment.hours * 60 + editTimeCommitment.minutes;
    if (totalMinutes < 10) {
      Alert.alert('Error', 'Time commitment must be at least 10 minutes.');
      return;
    }

    if (totalMinutes > 24 * 60) {
      Alert.alert('Error', 'Time commitment cannot exceed 24 hours.');
      return;
    }

    // All validations passed, proceed with save
    await performSave();
  };

  const dayProgress = calculateDayProgress();
  const streak = dreamData?.current_streak || 0;

  // Filter progress data for this specific dream
  const dreamProgressPhotos = dreamId && state.progress?.progressPhotos 
    ? state.progress.progressPhotos.filter(photo => photo.dream_id === dreamId)
    : [];

  // Debug logging for progress photos
  console.log('DreamPage progress photos debug:', {
    dreamId,
    totalProgressPhotos: state.progress?.progressPhotos?.length || 0,
    dreamProgressPhotos: dreamProgressPhotos.length,
    allProgressPhotos: state.progress?.progressPhotos?.map(p => ({ id: p.id, dream_id: p.dream_id })) || []
  });

  const handleTimePickerChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTimePickerDate(selectedDate);
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const newTime = { hours, minutes };
      setEditTimeCommitment(newTime);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDateForAPI = (dateString: string) => {
    if (!dateString) return '';
    
    // Parse the date string "13 December 2025" manually
    const parts = dateString.split(' ');
    if (parts.length !== 3) {
      return '';
    }
    
    const day = parseInt(parts[0]);
    const monthName = parts[1];
    const year = parseInt(parts[2]);
    
    // Map month names to month numbers (0-indexed for Date constructor)
    const monthMap: { [key: string]: number } = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    const month = monthMap[monthName];
    if (month === undefined) {
      return '';
    }
    
    // Create date using explicit month, day, year to avoid timezone issues
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Format as YYYY-MM-DD
    const formattedYear = date.getFullYear();
    const formattedMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    const formattedDay = date.getDate().toString().padStart(2, '0');
    return `${formattedYear}-${formattedMonth}-${formattedDay}`;
  };

  const handleStartDateChange = (date: Date) => {
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const newStartDate = `${day} ${month} ${year}`;
    setEditStartDate(newStartDate);
    
    // If end date exists and is now before or equal to the new start date, clear it
    if (editEndDate) {
      const endDate = new Date(formatDateForAPI(editEndDate));
      endDate.setHours(0, 0, 0, 0);
      if (selectedDate >= endDate) {
        setEditEndDate('');
        Alert.alert('End Date Cleared', 'The end date has been cleared because it was before or equal to the new start date.');
      }
    }
  };

  const handleEndDateChange = (date: Date) => {
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Validate that the date is not before the start date
    if (editStartDate) {
      const startDate = new Date(formatDateForAPI(editStartDate));
      startDate.setHours(0, 0, 0, 0);
      if (selectedDate <= startDate) {
        Alert.alert('Invalid Date', 'End date must be after the start date.');
        return;
      }
    }
    
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    setEditEndDate(`${day} ${month} ${year}`);
  };

  const formatTime = (hours: number, minutes: number) => {
    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const handleReschedule = async () => {
    if (!dreamId) return;

    // Check if the end date has changed in the UI
    const originalEndDate = dreamData?.end_date ? formatDateForDisplay(dreamData.end_date) : '';
    const hasEndDateChanged = editEndDate !== originalEndDate;

    let endDateToUse = editEndDate;
    
    // If end date has changed, ask the user what they want to do
    if (hasEndDateChanged) {
      Alert.alert(
        'Reschedule with New End Date?',
        `You've changed the end date from ${originalEndDate || 'none'} to ${editEndDate}.\n\nDo you want to reschedule actions using the new end date?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Use Old End Date',
            onPress: () => {
              endDateToUse = originalEndDate;
              performReschedule(endDateToUse);
            },
          },
          {
            text: 'Use New End Date',
            onPress: () => {
              endDateToUse = editEndDate;
              performReschedule(endDateToUse);
            },
          },
        ]
      );
    } else {
      // No change, proceed with normal reschedule
      Alert.alert(
        'Reschedule Actions',
        'This will reschedule all outstanding actions from today to the end date. Continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Reschedule',
            onPress: () => performReschedule(endDateToUse),
          },
        ]
      );
    }
  };

  const performReschedule = async (endDate: string) => {
    if (!dreamId) return;
    
    setIsRescheduling(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        // Format the end date for the API (convert from display format to API format)
        const formattedEndDate = formatDateForAPI(endDate);
        console.log('📝 [DREAM PAGE] Rescheduling with end date:', formattedEndDate);
        
        // Determine if we're extending or contracting the end date
        const originalEndDate = dreamData?.end_date;
        let options: { extendEndDate?: string; contractEndDate?: string; timeCommitment?: { hours: number; minutes: number } } | undefined = {};
        
        if (formattedEndDate && formattedEndDate !== originalEndDate) {
          if (new Date(formattedEndDate) > new Date(originalEndDate || '')) {
            options.extendEndDate = formattedEndDate;
          } else {
            options.contractEndDate = formattedEndDate;
          }
        }
        
        // Always pass the current time commitment from the edit state
        options.timeCommitment = editTimeCommitment;
        
        const result = await rescheduleActions(dreamId, session.access_token, options);
        if (result.success) {
          let extension_days = 0;
          if (options?.extendEndDate && dreamData?.end_date) {
            const oldEnd = new Date(dreamData.end_date);
            const newEnd = new Date(options.extendEndDate);
            extension_days = Math.ceil((newEnd.getTime() - oldEnd.getTime()) / (1000 * 60 * 60 * 24));
          }
          trackEvent('dream_reschedule_completed', { 
            dream_id: dreamId,
            extension_days: extension_days
          });

          Alert.alert('Success', 'Rescheduled actions successfully!');
          // Refresh data to show updated schedule
          await getDreamDetail(dreamId, { force: true });
          await getProgress({ force: true });
        } else {
          Alert.alert('Error', 'Failed to reschedule actions. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error rescheduling actions:', error);
      Alert.alert('Error', 'Failed to reschedule actions. Please try again.');
    } finally {
      setIsRescheduling(false);
    }
  };


  const handleCreateArea = () => {
    setNewAreaTitle('');
    setNewAreaIcon('🚀');
    setShowCreateAreaModal(true);
  };

  const handleRefineAreas = () => {
    if (!dreamId) return;
    setShowOptionsPopover(false);
    navigation?.navigate('RefineFlow', { dreamId });
  };

  const handleToggleReorder = () => {
    setIsReordering(!isReordering);
    setShowOptionsPopover(false);
  };

  const handleSaveReorder = async (reorderedAreaSuggestions: Array<{ id: string; title: string; emoji: string; completedActions?: number; totalActions?: number }>) => {
    if (!dreamId) return;
    
    // Optimistically update local state immediately
    const reorderedAreas = reorderedAreaSuggestions.map((suggestion, index) => {
      const originalArea = localAreas.find(a => a.id === suggestion.id);
      if (!originalArea) {
        throw new Error(`Area ${suggestion.id} not found`);
      }
      return {
        ...originalArea,
        position: index + 1,
        updated_at: new Date().toISOString()
      };
    });
    
    // Update UI immediately
    setLocalAreas(reorderedAreas);
    
    // Sync with backend in the background
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        await upsertAreas({
          dream_id: dreamId,
          areas: reorderedAreas
        }, session.access_token);

        // Silently refresh to ensure consistency
        await getDreamDetail(dreamId, { force: true });
      }
    } catch (error) {
      console.error('Error reordering areas:', error);
      // Revert to previous state on error
      setLocalAreas(areas);
      Alert.alert('Error', 'Failed to reorder areas. Please try again.');
    }
  };

  const handleSaveNewArea = async () => {
    Keyboard.dismiss();
    
    if (!newAreaTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the area.');
      return;
    }

    if (!newAreaIcon.trim()) {
      Alert.alert('Error', 'Please enter an emoji for the area.');
      return;
    }

    // Simple emoji validation - check if it's a single emoji character
    const emojiRegex = /^[\p{Emoji}]$/u;
    if (!emojiRegex.test(newAreaIcon.trim())) {
      Alert.alert('Error', 'Please enter a valid emoji (single emoji character only).');
      return;
    }

    if (!dreamId) {
      Alert.alert('Error', 'Dream ID is missing.');
      return;
    }

    setIsCreatingArea(true);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        // Get existing areas and add the new one
        const existingAreas = areas.map(area => ({
          id: area.id,
          dream_id: area.dream_id,
          title: area.title,
          icon: area.icon || undefined,
          position: area.position,
          created_at: area.created_at,
          updated_at: area.updated_at
        }));

        // Create new area without ID (will be generated by backend)
        const newArea = {
          dream_id: dreamId,
          title: newAreaTitle.trim(),
          icon: newAreaIcon,
          position: existingAreas.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Send all areas including the new one
        const response = await upsertAreas({
          dream_id: dreamId,
          areas: [...existingAreas, newArea]
        }, session.access_token);

        // Refresh dream detail to get the real area ID
        await getDreamDetail(dreamId, { force: true });

        // Find the newly created area in the refreshed data
        const refreshedData = state.dreamDetail[dreamId];
        const createdArea = refreshedData?.areas?.find((a: Area) => 
          a.title === newAreaTitle.trim() && a.icon === newAreaIcon
        );

        setShowCreateAreaModal(false);
        
        if (createdArea && navigation?.navigate) {
          // Navigate to the new area page
          navigation.navigate('Area', {
            areaId: createdArea.id,
            areaTitle: createdArea.title,
            areaEmoji: createdArea.icon || '🚀',
            areaImageUrl: createdArea.image_url,
            dreamId: dreamId,
            dreamTitle: title
          });
        }
      }
    } catch (error) {
      console.error('Error creating area:', error);
      Alert.alert('Error', 'Failed to create area. Please try again.');
    } finally {
      setIsCreatingArea(false);
    }
  };

  const optionsPopoverItems = [
    {
      id: 'create-area',
      icon: 'add',
      title: 'Create Area',
      onPress: handleCreateArea
    },
    {
      id: 'refine-areas',
      icon: 'auto-awesome', // Material icon for AI/magic
      title: 'Refine with AI',
      onPress: handleRefineAreas
    },
    {
      id: 'reorder',
      icon: 'reorder',
      title: isReordering ? 'Done Reordering' : 'Reorder Areas',
      onPress: handleToggleReorder
    },
    {
      id: 'edit',
      icon: 'edit',
      title: 'Edit Dream',
      onPress: handleEditDream
    },
    {
      id: 'archive',
      icon: 'archive',
      title: 'Archive Dream',
      onPress: handleArchiveDream
    },
    {
      id: 'delete',
      icon: 'delete',
      title: 'Delete Dream',
      destructive: true,
      onPress: handleDeleteDream
    }
  ];

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Header Overlay */}
        <View style={styles.headerOverlay} pointerEvents="box-none">
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.header}>
              <IconButton
                icon="chevron_left"
                onPress={handleBack}
                variant="secondary"
                size="md"
              />
              <View ref={optionsButtonRef}>
                <IconButton
                  icon="more_horiz"
                  onPress={handleOptionsPress}
                  variant="secondary"
                  size="md"
                />
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ScrollView with Image and Content */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
        >
          {/* Background Image - scrolls with content */}
          <View style={[styles.imageBackground, { height: imageHeight, width: imageWidth }]}>
            {dreamData?.image_url ? (
              <Image source={{ uri: dreamData.image_url }} style={styles.backgroundImage} contentFit="cover" transition={200} />
            ) : (
              <View style={styles.placeholderBackground}>
                <Image source={require('../assets/star.png')} style={styles.placeholderIcon} contentFit="contain" />
              </View>
            )}
          </View>
          {/* Day Progress and Streak */}
          <View style={styles.progressRow}>
            <Text style={styles.dayProgress}>
              Day {dayProgress.current}{dayProgress.total ? ` of ${dayProgress.total}` : ''}
            </Text>
            <View style={styles.streakContainer}>
              <Text style={styles.streakText}>{streak}</Text>
              <Icon name="fire" size={16} color={theme.colors.text.tertiary} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.dreamTitle}>{title}</Text>

          {/* Due Date */}
          {dreamData?.end_date && (
            <Text style={styles.dueDate}>
              {formatDate(dreamData.end_date)}
            </Text>
          )}

          {/* Areas */}
          {isLoadingDetailData ? (
            <View style={styles.areasSkeleton}>
              <View>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.areaSkeletonCard}>
                    <View style={styles.areaSkeletonEmoji} />
                    <View style={styles.areaSkeletonContent}>
                      <View style={styles.areaSkeletonTitle} />
                      <View style={styles.areaSkeletonProgressContainer}>
                        <View style={styles.areaSkeletonProgressTextRow}>
                          <View style={styles.areaSkeletonProgressText} />
                          <View style={styles.areaSkeletonProgressText} />
                        </View>
                        <View style={styles.areaSkeletonProgressBar}>
                          <View style={styles.areaSkeletonProgressFill} />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <AreaGrid
              areas={(isReordering ? localAreas : areas).map(area => {
                // Calculate progress for this area
                const detailData = state.dreamDetail[dreamId || ''];
                let completedActions = 0;
                let totalActions = 0;
                
                if (detailData?.actions && detailData?.occurrences) {
                  // Filter actions for this area
                  const areaActions = detailData.actions.filter(action => action.area_id === area.id);
                  const areaActionIds = areaActions.map(action => action.id);
                  
                  // Count ALL occurrences for this area's actions (not just action definitions)
                  totalActions = detailData.occurrences.filter(occurrence => 
                    areaActionIds.includes(occurrence.action_id)
                  ).length;
                  
                  // Count completed occurrences for this area's actions
                  completedActions = detailData.occurrences.filter(occurrence => 
                    areaActionIds.includes(occurrence.action_id) && occurrence.completed_at
                  ).length;
                }
                
                return {
                  id: area.id,
                  title: area.title,
                  emoji: area.icon || '🚀',
                  imageUrl: area.image_url,
                  completedActions,
                  totalActions
                };
              })}
              onEdit={() => {}} // No edit functionality in DreamPage
              onRemove={() => {}} // No remove functionality in DreamPage
              onAdd={() => {}} // No add functionality in DreamPage
              onReorder={isReordering ? handleSaveReorder : undefined}
              onPress={handleAreaPress}
              clickable={!isReordering}
              showProgress={!isReordering}
              title=""
              style={styles.areasContainer}
              showAddButton={false}
              showEditButtons={false}
              showRemoveButtons={false}
            />
          )}

          {/* Before/After Section */}
          {(figurineUrl || dreamData?.image_url) && (
            <View style={styles.beforeAfterContainer}>
              <View style={styles.beforeAfterHeader}>
                <Text style={styles.beforeAfterTitle}>Your Journey</Text>
              </View>
              <View style={styles.beforeAfterImages}>
                {/* Before (Figurine) */}
                <View style={styles.beforeContainer}>
                  <Text style={styles.beforeAfterLabel}>Before</Text>
                  <View style={styles.beforeAfterImageWrapper}>
                    {isLoadingFigurine ? (
                      <View style={styles.beforeAfterImageSkeleton} />
                    ) : figurineUrl ? (
                      <Image
                        source={{ uri: figurineUrl }}
                        style={styles.beforeAfterImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={styles.beforeAfterPlaceholder}>
                        <Ionicons name="person-outline" size={32} color={theme.colors.text.tertiary} />
                      </View>
                    )}
                  </View>
                </View>
                
                {/* Divider */}
                <View style={styles.beforeAfterDivider} />
                
                {/* After (Dream Image) */}
                <View style={styles.afterContainer}>
                  <Text style={styles.beforeAfterLabel}>After</Text>
                  <View style={styles.beforeAfterImageWrapper}>
                    {dreamData?.image_url ? (
                      <Image
                        source={{ uri: dreamData.image_url }}
                        style={styles.beforeAfterImage}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={styles.beforeAfterPlaceholder}>
                        <Ionicons name="image-outline" size={32} color={theme.colors.text.tertiary} />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Progress Photos Section */}
          {isLoadingDetailData ? (
            <View style={styles.progressPhotosSkeleton}>
              <Text style={styles.progressPhotosTitle}>Progress Photos</Text>
              <View style={styles.progressPhotosSkeletonGrid}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.progressPhotoSkeleton} />
                ))}
              </View>
            </View>
          ) : (
            <ProgressPhotosSection
              photos={dreamProgressPhotos}
              onPhotoPress={(photo) => {
                // Handle photo press - could open full screen view
                console.log('Photo pressed:', photo);
              }}
              columns={3}
            />
          )}
        </ScrollView>

        <OptionsPopover
          visible={showOptionsPopover}
          onClose={() => setShowOptionsPopover(false)}
          options={optionsPopoverItems}
          triggerPosition={optionsTriggerPosition}
        />

        {/* Edit Dream Modal */}
        <Modal 
          visible={showEditModal} 
          animationType="slide" 
          presentationStyle="pageSheet"
        >
          <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: theme.colors.background.page }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Header */}
            <SheetHeader
              title="Edit Dream"
              onClose={() => {
                Keyboard.dismiss();
                setShowEditModal(false);
              }}
              onDone={handleSaveEdit}
              doneDisabled={isEditing || !editTitle.trim()}
              doneLoading={isEditing}
            />

            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ padding: 16, paddingBottom: 400 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Dream Image */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Dream Image</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* Current Image */}
                  <View style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.disabled.inactive }}>
                    {editImageUrl ? (
                      <Image
                        source={{ uri: editImageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="image-outline" size={32} color={theme.colors.text.tertiary} />
                      </View>
                    )}
                  </View>
                  
                  {/* Change Photo Button */}
                  <Pressable
                    onPress={() => setShowImageOptions(!showImageOptions)}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: pressed ? theme.colors.disabled.inactive : theme.colors.background.card,
                      borderWidth: 1,
                      borderColor: theme.colors.border.default,
                      borderRadius: 8,
                      padding: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 44
                    })}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary }}>
                      {showImageOptions ? 'Hide Options' : (editImageUrl ? 'Change Photo' : 'Add Photo')}
                    </Text>
                  </Pressable>
                </View>

                {/* Image Options */}
                {showImageOptions && (
                  <View style={{ marginTop: 12 }}>
                    {isLoadingImages ? (
                      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                        <Text style={{ fontSize: 14, color: theme.colors.text.tertiary }}>Loading images...</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={[{ id: 'upload', name: 'upload' } as DreamImage, ...defaultImages]}
                        renderItem={({ item, index }) => {
                          const isUploadButton = index === 0;
                          const isSelected = editImageUrl === item.signed_url;
                          
                          if (isUploadButton) {
                            return (
                              <Pressable
                                onPress={handleImageUpload}
                                disabled={isUploadingImage}
                                style={{
                                  width: '30%',
                                  aspectRatio: 1,
                                  backgroundColor: theme.colors.background.card,
                                  borderRadius: 12,
                                  borderWidth: 2,
                                  borderColor: theme.colors.border.default,
                                  borderStyle: 'dashed',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: '3.33%',
                                  marginBottom: 12,
                                  opacity: isUploadingImage ? 0.5 : 1
                                }}
                              >
                                {isUploadingImage ? (
                                  <Ionicons name="hourglass-outline" size={24} color={theme.colors.text.tertiary} />
                                ) : (
                                  <Ionicons name="add" size={24} color={theme.colors.text.primary} />
                                )}
                                <Text style={{
                                  fontSize: 12,
                                  color: isUploadingImage ? theme.colors.text.tertiary : theme.colors.text.primary,
                                  marginTop: 4,
                                  fontWeight: '500'
                                }}>
                                  {isUploadingImage ? 'Uploading...' : 'Add'}
                                </Text>
                              </Pressable>
                            );
                          }
                          
                          return (
                            <Pressable
                              onPress={() => handleImageSelect(item.signed_url)}
                              style={{
                                width: '30%',
                                aspectRatio: 1,
                                borderRadius: 12,
                                overflow: 'hidden',
                                backgroundColor: theme.colors.background.card,
                                marginRight: '3.33%',
                                marginBottom: 12,
                                borderWidth: isSelected ? 3 : 0,
                                borderColor: theme.colors.primary[600]
                              }}
                            >
                              <Image
                                source={{ uri: item.signed_url }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                                transition={200}
                              />
                              {isSelected && (
                                <View style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                  borderRadius: 12,
                                  padding: 4
                                }}>
                                  <Ionicons name="checkmark-circle" size={20} color="white" />
                                </View>
                              )}
                            </Pressable>
                          );
                        }}
                        numColumns={3}
                        keyExtractor={(item, index) => item.id || `upload-${index}`}
                        columnWrapperStyle={{ justifyContent: 'space-between' }}
                        scrollEnabled={false}
                      />
                    )}
                  </View>
                )}
              </View>

              {/* Title */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Title</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter dream title"
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

              {/* Start Date */}
              <View style={{ marginBottom: 16 }}>
                <Input
                  type="date"
                  value={editStartDate}
                  onChangeText={() => {}} // Required prop but not used for date input
                  onDateChange={handleStartDateChange}
                  onToggleDatePicker={() => setShowStartDatePicker(!showStartDatePicker)}
                  showDatePicker={showStartDatePicker}
                  placeholder="Select start date"
                  label="Start Date"
                  initialDate={startDatePickerDate}
                  variant="borderless"
                />
              </View>

              {/* End Date */}
              <View style={{ marginBottom: 16 }}>
                <Input
                  type="date"
                  value={editEndDate}
                  onChangeText={() => {}} // Required prop but not used for date input
                  onDateChange={handleEndDateChange}
                  onToggleDatePicker={() => setShowEndDatePicker(!showEndDatePicker)}
                  showDatePicker={showEndDatePicker}
                  placeholder="Select end date"
                  label="End Date"
                  initialDate={endDatePickerDate}
                  minimumDate={(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (editStartDate) {
                      const startDate = new Date(formatDateForAPI(editStartDate));
                      startDate.setHours(0, 0, 0, 0);
                      // Return the later of today or start date
                      return startDate > today ? startDate : today;
                    }
                    return today;
                  })()}
                  variant="borderless"
                />
              </View>

              {/* Daily Time Commitment */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Daily Time Commitment</Text>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  style={{
                    backgroundColor: theme.colors.background.card,
                    borderRadius: 8,
                    padding: 12,
                    alignItems: 'flex-start'
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    color: theme.colors.text.primary,
                    textAlign: 'left'
                  }}>
                    {formatTime(editTimeCommitment.hours, editTimeCommitment.minutes)}
                  </Text>
                </Pressable>
                {showTimePicker && Platform.OS !== 'web' && (
                  <View style={{ alignItems: 'center', marginTop: 12 }}>
                    <DateTimePicker
                      value={timePickerDate}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleTimePickerChange}
                      style={{ width: '100%', height: 150 }}
                      themeVariant={isDark ? 'dark' : 'light'}
                      minimumDate={(() => {
                        const minDate = new Date();
                        minDate.setHours(0, 10, 0, 0); // Minimum 10 minutes
                        return minDate;
                      })()}
                      maximumDate={(() => {
                        const maxDate = new Date();
                        maxDate.setHours(23, 59, 0, 0); // Maximum 23 hours 59 minutes
                        return maxDate;
                      })()}
                      is24Hour={true}
                      minuteInterval={1}
                    />
                    <Pressable
                      onPress={() => setShowTimePicker(false)}
                      style={{
                        backgroundColor: theme.colors.primary[600],
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                        borderRadius: 6,
                        marginTop: 12
                      }}
                    >
                      <Text style={{ color: theme.colors.text.inverse, fontWeight: '600' }}>Done</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Reschedule Actions Section */}
              {dreamData?.activated_at && editEndDate && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Reschedule Actions</Text>
                  <Text style={{ fontSize: 14, color: theme.colors.text.secondary, marginBottom: 12, lineHeight: 20 }}>
                    Running behind or changed your time commitment or end date? Reschedule outstanding actions from today's date to your end date.
                  </Text>
                  <Pressable
                    onPress={handleReschedule}
                    disabled={isRescheduling}
                    style={{
                      backgroundColor: isRescheduling ? theme.colors.disabled.text : theme.colors.primary[600],
                      borderRadius: 8,
                      padding: 16,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      color: theme.colors.text.inverse,
                      fontWeight: '600',
                      fontSize: 16
                    }}>
                      {isRescheduling ? "Rescheduling..." : "Reschedule Actions"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Create Area Modal */}
        <Modal 
          visible={showCreateAreaModal} 
          animationType="slide" 
          presentationStyle="pageSheet"
        >
          <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: theme.colors.background.page }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Header */}
            <SheetHeader
              title="Create Area"
              onClose={() => {
                Keyboard.dismiss();
                setShowCreateAreaModal(false);
              }}
              onDone={handleSaveNewArea}
              doneDisabled={isCreatingArea || !newAreaTitle.trim()}
              doneLoading={isCreatingArea}
            />

            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ padding: 16, paddingBottom: 400 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Title</Text>
                <TextInput
                  value={newAreaTitle}
                  onChangeText={setNewAreaTitle}
                  placeholder="Enter area title"
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

              {/* Icon/Emoji */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: theme.colors.text.primary }}>Icon (Emoji)</Text>
                <TextInput
                  value={newAreaIcon}
                  onChangeText={setNewAreaIcon}
                  placeholder="Enter emoji (e.g. 🚀)"
                  placeholderTextColor={theme.colors.text.tertiary}
                  style={{
                    backgroundColor: theme.colors.background.card,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    color: theme.colors.text.primary,
                    minHeight: 44
                  }}
                  maxLength={2}
                />
                <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, marginTop: 4 }}>
                  Optional: Enter 1-2 emojis to represent this area
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  imageBackground: {
    overflow: 'hidden',
    marginLeft: -theme.spacing.md, // Extend to left edge since content has horizontal padding
    marginRight: -theme.spacing.md, // Extend to right edge since content has horizontal padding
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.disabled.inactive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 64,
    height: 64,
    opacity: 0.5,
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: BOTTOM_NAV_PADDING,
  },
  // Legacy styles kept for backward compatibility
  imageContainer: {
    width: 225,
    height: 225,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.disabled.inactive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  dayProgress: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.tertiary,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.text.tertiary,
  },
  dreamTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'left',
    marginBottom: theme.spacing.sm,
  },
  dueDate: {
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  areasContainer: {
    marginBottom: theme.spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxHeight: '80%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.default,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
  },
  modalBody: {
    flex: 1,
    maxHeight: 400,
  },
  modalBodyContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl, // Extra padding for keyboard
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.callout,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.card,
    minHeight: 44,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  infoBox: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[400],
  },
  infoText: {
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.primary[700],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.disabled.inactive,
    borderRadius: theme.radius.md,
  },
  timeText: {
    fontSize: 24,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
  },
  timePickerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  timePicker: {
    width: '100%',
    height: 150,
  },
  rescheduleButton: {
    marginTop: theme.spacing.md,
  },
  rescheduleHelpText: {
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: 12,
    color: 'red',
    marginBottom: 10,
  },
  areasSkeleton: {
    marginBottom: theme.spacing.lg,
  },
  areaSkeletonCard: {
    width: '100%',
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
  },
  areaSkeletonEmoji: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.disabled.inactive,
    borderRadius: theme.radius.sm,
    marginRight: 16,
  },
  areaSkeletonContent: {
    flex: 1,
  },
  areaSkeletonTitle: {
    height: 16,
    backgroundColor: theme.colors.disabled.inactive,
    borderRadius: theme.radius.sm,
    width: '70%',
    marginBottom: 8,
  },
  areaSkeletonProgressContainer: {
    width: '100%',
  },
  areaSkeletonProgressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  areaSkeletonProgressText: {
    height: 12,
    backgroundColor: theme.colors.disabled.inactive,
    borderRadius: theme.radius.sm,
    width: 60,
  },
  areaSkeletonProgressBar: {
    height: 6,
    backgroundColor: theme.colors.disabled.inactive,
    borderRadius: 3,
    overflow: 'hidden',
  },
  areaSkeletonProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.border.default,
    borderRadius: 3,
    width: '60%',
  },
  progressPhotosSkeleton: {
    marginBottom: theme.spacing.lg,
  },
  progressPhotosTitle: {
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  progressPhotosSkeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  progressPhotoSkeleton: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: theme.colors.disabled.inactive,
    borderRadius: theme.radius.md,
  },
  beforeAfterContainer: {
    marginBottom: theme.spacing.lg,
  },
  beforeAfterHeader: {
    marginBottom: theme.spacing.md,
  },
  beforeAfterTitle: {
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
  },
  beforeAfterImages: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  beforeContainer: {
    flex: 1,
  },
  afterContainer: {
    flex: 1,
  },
  beforeAfterLabel: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  beforeAfterImageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.disabled.inactive,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  beforeAfterImage: {
    width: '100%',
    height: '100%',
  },
  beforeAfterPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.disabled.inactive,
  },
  beforeAfterDivider: {
    width: 1,
    backgroundColor: theme.colors.border.default,
    marginVertical: 0,
  },
  beforeAfterImageSkeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.disabled.inactive,
  },
});

export default DreamPage;