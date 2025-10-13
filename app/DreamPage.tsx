import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, Pressable, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { AreaGrid } from '../components/AreaChips';
import { OptionsPopover } from '../components/OptionsPopover';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ProgressPhotosSection, HistorySection } from '../components/progress';
import { useData } from '../contexts/DataContext';
import { upsertDream, rescheduleActions } from '../frontend-services/backend-bridge';
import { supabaseClient } from '../lib/supabaseClient';
import type { Dream, Action, ActionOccurrence, Area, DreamWithStats } from '../backend/database/types';

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
  const params = route?.params || {};
  const { dreamId, title = 'Sample Dream' } = params;
  
  const { state, getDreamDetail, getDreamsWithStats, getProgress, deleteDream, archiveDream, onScreenFocus } = useData();
  const [areas, setAreas] = useState<Area[]>([]);
  const [dreamData, setDreamData] = useState<DreamWithStats | null>(null);
  const [dreamDetail, setDreamDetail] = useState<Dream | null>(null);
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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'Week' | 'Month' | 'Year' | 'All Time'>('Week');
  const optionsButtonRef = useRef<View>(null);

  useEffect(() => {
    if (dreamId) {
      // Initial load - force fetch to ensure we have data
      getDreamDetail(dreamId, { force: true });
      getDreamsWithStats({ force: true });
      getProgress({ force: true });
    }
  }, [dreamId]); // Only depend on dreamId - functions are stable from DataContext

  // Re-fetch data when user navigates back to this screen
  useFocusEffect(
    React.useCallback(() => {
      if (dreamId) {
        onScreenFocus('dream-detail', dreamId);
        // Let the refresh system handle the fetching based on staleness
        getDreamDetail(dreamId);
        getDreamsWithStats();
        getProgress();
      }
    }, [dreamId]) // Only depend on dreamId - functions are stable from DataContext
  );

  useEffect(() => {
    if (dreamId && state.dreamDetail[dreamId]) {
      const detailData = state.dreamDetail[dreamId];
      if (detailData?.areas) {
        setAreas(detailData.areas);
      }
      if (detailData?.dream) {
        setDreamDetail(detailData.dream);
      }
    }
  }, [dreamId, state.dreamDetail]);

  useEffect(() => {
    if (dreamId && state.dreamsWithStats?.dreams) {
      const dream = state.dreamsWithStats.dreams.find(d => d.id === dreamId);
      if (dream) {
        setDreamData(dream);
      }
    }
  }, [dreamId, state.dreamsWithStats?.dreams]);

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
    const today = new Date();
    
    if (endDate) {
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return { current: Math.max(1, currentDay), total: totalDays };
    }
    
    // If no end date, calculate days since start
    const daysSinceStart = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { current: Math.max(1, daysSinceStart), total: null };
  };

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleOptionsPress = () => {
    optionsButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      setOptionsTriggerPosition({ x: pageX, y: pageY, width, height });
      setShowOptionsPopover(true);
    });
  };

  const handleAreaPress = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    if (area && navigation?.navigate) {
      navigation.navigate('Area', {
        areaId: area.id,
        areaTitle: area.title,
        areaEmoji: area.icon || '🚀',
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
      
      // Initialize time commitment from dreamDetail (which has the full Dream type)
      const timeCommitment = dreamDetail?.time_commitment || { hours: 0, minutes: 30 };
      setEditTimeCommitment(timeCommitment);
      
      // Update time picker date
      const date = new Date();
      date.setHours(timeCommitment.hours, timeCommitment.minutes, 0, 0);
      setTimePickerDate(date);
      
      setShowEditModal(true);
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

        // Always include end_date, image_url, start_date, and time_commitment
        if (editEndDate) updateData.end_date = formatDateForAPI(editEndDate);
        if (dreamData?.image_url) updateData.image_url = dreamData.image_url;
        updateData.start_date = formatDateForAPI(editStartDate);
        updateData.time_commitment = editTimeCommitment;

        // Only include these fields if the dream is not activated
        if (!isActivated) {
          updateData.baseline = dreamData?.baseline || null;
          updateData.obstacles = dreamData?.obstacles || null;
          updateData.enjoyment = dreamData?.enjoyment || null;
        }

        console.log('📝 [DREAM PAGE] Sending update data:', JSON.stringify(updateData, null, 2));
        console.log('📝 [DREAM PAGE] Dream is activated:', isActivated);
        await upsertDream(updateData, session.access_token);

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

  // Calculate dream-specific history stats
  const calculateDreamHistoryStats = () => {
    if (!dreamId || !state.dreamDetail[dreamId]) {
      return {
        week: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
        month: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
        year: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
        allTime: { actionsComplete: 0, activeDays: 0, actionsOverdue: 0 },
      };
    }

    const detailData = state.dreamDetail[dreamId];
    const occurrences = detailData.occurrences || [];
    const completedOccurrences = occurrences.filter(o => o.completed_at);
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const calculateStatsForPeriod = (startDate: Date, endDate?: Date) => {
      const filtered = completedOccurrences.filter(o => {
        const completedDate = new Date(o.completed_at!);
        const isAfterStart = completedDate >= startDate;
        const isBeforeEnd = !endDate || completedDate <= endDate;
        return isAfterStart && isBeforeEnd;
      });
      
      const uniqueActiveDays = new Set<string>();
      filtered.forEach(o => {
        const date = new Date(o.completed_at!);
        uniqueActiveDays.add(date.toISOString().slice(0, 10));
      });
      
      return {
        actionsComplete: filtered.length,
        activeDays: uniqueActiveDays.size,
        actionsOverdue: 0, // Could be calculated from overdue view for specific periods
      };
    };

    return {
      week: calculateStatsForPeriod(startOfWeek),
      month: calculateStatsForPeriod(startOfMonth),
      year: calculateStatsForPeriod(startOfYear),
      allTime: calculateStatsForPeriod(new Date(0)),
    };
  };

  const dreamHistoryStats = calculateDreamHistoryStats();
  const currentHistoryStats = dreamHistoryStats[selectedTimePeriod.toLowerCase() as keyof typeof dreamHistoryStats] || dreamHistoryStats.week;

  const handleTimePeriodChange = (period: 'Week' | 'Month' | 'Year' | 'All Time') => {
    setSelectedTimePeriod(period);
  };

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
    
    // Parse the date string "6 October 2025" manually
    const parts = dateString.split(' ');
    if (parts.length !== 3) {
      console.log('Invalid date format:', dateString);
      return '';
    }
    
    const day = parseInt(parts[0]);
    const monthName = parts[1];
    const year = parseInt(parts[2]);
    
    // Create a more explicit date string for parsing
    const date = new Date(`${monthName} ${day}, ${year}`);
    if (isNaN(date.getTime())) {
      console.log('Date parsing failed for:', dateString);
      return '';
    }
    
    const parsedYear = date.getFullYear();
    const parsedMonth = (date.getMonth() + 1).toString().padStart(2, '0');
    const parsedDay = date.getDate().toString().padStart(2, '0');
    return `${parsedYear}-${parsedMonth}-${parsedDay}`;
  };

  const handleStartDateChange = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    setEditStartDate(`${day} ${month} ${year}`);
  };

  const handleEndDateChange = (date: Date) => {
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
          onPress: async () => {
            setIsRescheduling(true);
            try {
              const { data: { session } } = await supabaseClient.auth.getSession();
              if (session?.access_token) {
                const result = await rescheduleActions(dreamId, session.access_token);
                if (result.success) {
                  Alert.alert(
                    'Success', 
                    `Rescheduled ${result.rescheduled_count || 0} actions successfully!`
                  );
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
          },
        },
      ]
    );
  };


  const optionsPopoverItems = [
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
      <SafeAreaView style={styles.container}>
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

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Image */}
          <View style={styles.imageContainer}>
            {dreamData?.image_url ? (
              <Image source={{ uri: dreamData.image_url }} style={styles.image} />
            ) : (
              <View style={styles.placeholderImage}>
                <Image source={require('../assets/star.png')} style={styles.placeholderIcon} />
              </View>
            )}
          </View>

          {/* Day Progress and Streak */}
          <View style={styles.progressRow}>
            <Text style={styles.dayProgress}>
              Day {dayProgress.current}{dayProgress.total ? ` of ${dayProgress.total}` : ''}
            </Text>
            <Text style={styles.streakText}>🔥 {streak}</Text>
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
          <AreaGrid
            areas={areas.map(area => {
              // Calculate progress for this area
              const detailData = state.dreamDetail[dreamId || ''];
              let completedActions = 0;
              let totalActions = 0;
              
              if (detailData?.actions && detailData?.occurrences) {
                // Filter actions for this area
                const areaActions = detailData.actions.filter(action => action.area_id === area.id);
                totalActions = areaActions.length;
                
                // Count completed occurrences for this area's actions
                const areaActionIds = areaActions.map(action => action.id);
                completedActions = detailData.occurrences.filter(occurrence => 
                  areaActionIds.includes(occurrence.action_id) && occurrence.completed_at
                ).length;
              }
              
              return {
                id: area.id,
                title: area.title,
                emoji: area.icon || '🚀',
                completedActions,
                totalActions
              };
            })}
            onEdit={() => {}} // No edit functionality in DreamPage
            onRemove={() => {}} // No remove functionality in DreamPage
            onAdd={() => {}} // No add functionality in DreamPage
            onPress={handleAreaPress}
            clickable={true}
            showProgress={true}
            title="Areas"
            style={styles.areasContainer}
            showAddButton={false}
            showEditButtons={false}
            showRemoveButtons={false}
          />

          {/* Progress Photos Section */}
          <ProgressPhotosSection
            photos={dreamProgressPhotos}
            onPhotoPress={(photo) => {
              // Handle photo press - could open full screen view
              console.log('Photo pressed:', photo);
            }}
            columns={4}
          />

          {/* History Section */}
          <HistorySection
            actionsComplete={currentHistoryStats.actionsComplete}
            activeDays={currentHistoryStats.activeDays}
            actionsOverdue={currentHistoryStats.actionsOverdue}
            onTimePeriodChange={handleTimePeriodChange}
            selectedPeriod={selectedTimePeriod}
          />
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
            style={{ flex: 1, backgroundColor: '#F3F4F6' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
              <Pressable onPress={() => {
                Keyboard.dismiss();
                setShowEditModal(false);
              }}>
                <Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text>
              </Pressable>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Edit Dream</Text>
              <Pressable onPress={handleSaveEdit} disabled={isEditing || !editTitle.trim()}>
                <Text style={{ 
                  fontSize: 16, 
                  color: isEditing || !editTitle.trim() ? '#999' : '#000', 
                  fontWeight: '600' 
                }}>
                  {isEditing ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>

            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Title</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter dream title"
                  multiline
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
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
                  minimumDate={new Date()}
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
                  minimumDate={editStartDate ? new Date(formatDateForAPI(editStartDate)) : new Date()}
                  variant="borderless"
                />
                {/* Debug info */}
                <Text style={{ fontSize: 10, color: 'red', marginTop: 4 }}>
                  Debug: startDate={editStartDate}, minDate={editStartDate ? formatDateForAPI(editStartDate) : 'today'}
                </Text>
              </View>

              {/* Daily Time Commitment */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Daily Time Commitment</Text>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    padding: 12,
                    alignItems: 'flex-start'
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    color: '#111827',
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
                        backgroundColor: '#000',
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                        borderRadius: 6,
                        marginTop: 12
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '600' }}>Done</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Reschedule Actions Section */}
              {dreamData?.activated_at && editEndDate && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Reschedule Actions</Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 12, lineHeight: 20 }}>
                    Running behind or changed your time commitment or end date? Reschedule outstanding actions from today's date to your end date.
                  </Text>
                  <Pressable
                    onPress={handleReschedule}
                    disabled={isRescheduling}
                    style={{
                      backgroundColor: isRescheduling ? '#6B7280' : '#000',
                      borderRadius: 8,
                      padding: 16,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      color: 'white',
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
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    backgroundColor: theme.colors.pageBackground,
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
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  imageContainer: {
    width: 150,
    height: 150,
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
    backgroundColor: theme.colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 48,
    height: 48,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dayProgress: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[500],
  },
  streakText: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[500],
  },
  dreamTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginBottom: theme.spacing.sm,
  },
  dueDate: {
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.lg,
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
    backgroundColor: theme.colors.surface[50],
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
    borderBottomColor: theme.colors.grey[200],
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
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
    color: theme.colors.grey[700],
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.grey[900],
    backgroundColor: theme.colors.surface[50],
    minHeight: 44,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
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
    backgroundColor: theme.colors.grey[50],
    borderRadius: theme.radius.md,
  },
  timeText: {
    fontSize: 24,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
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
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: 12,
    color: 'red',
    marginBottom: 10,
  },
});

export default DreamPage;