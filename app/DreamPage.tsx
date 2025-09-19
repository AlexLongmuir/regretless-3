import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, Pressable, Alert, Modal, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { AreaGrid } from '../components/AreaChips';
import { OptionsPopover } from '../components/OptionsPopover';
import { Button } from '../components/Button';
import { ProgressPhotosSection, HistorySection } from '../components/progress';
import { useData } from '../contexts/DataContext';
import { upsertDream } from '../frontend-services/backend-bridge';
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
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);
  const [optionsTriggerPosition, setOptionsTriggerPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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
      setEditStartDate(dreamData.start_date);
      setEditEndDate(dreamData.end_date || '');
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!dreamId || !editTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for your dream.');
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

        // Always include end_date and image_url
        if (editEndDate) updateData.end_date = editEndDate;
        if (dreamData?.image_url) updateData.image_url = dreamData.image_url;

        // Only include these fields if the dream is not activated
        if (!isActivated) {
          updateData.start_date = editStartDate;
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
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Dream</Text>
                <IconButton
                  icon="close"
                  onPress={() => setShowEditModal(false)}
                  variant="secondary"
                  size="sm"
                />
              </View>

              <ScrollView style={styles.modalBody}>
                {dreamData?.activated_at && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      This dream is already active. You can only edit the title and end date.
                    </Text>
                  </View>
                )}
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Enter dream title"
                    multiline
                  />
                </View>

                {!dreamData?.activated_at && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Start Date</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editStartDate}
                      onChangeText={setEditStartDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>End Date (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editEndDate}
                    onChangeText={setEditEndDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button
                  title="Cancel"
                  onPress={() => setShowEditModal(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title={isEditing ? "Saving..." : "Save Changes"}
                  onPress={handleSaveEdit}
                  variant="primary"
                  style={styles.modalButton}
                  disabled={isEditing || !editTitle.trim()}
                />
              </View>
            </View>
          </View>
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
    padding: theme.spacing.lg,
    maxHeight: 400,
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
});

export default DreamPage;