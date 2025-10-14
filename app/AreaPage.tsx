import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, Alert, Modal, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { ActionChipsList } from '../components/ActionChipsList';
import { OptionsPopover } from '../components/OptionsPopover';
import { Input } from '../components/Input';
import { AddActionModal } from '../components/ActionChipsList';
import { useData } from '../contexts/DataContext';
import type { Dream, Action, ActionOccurrence, Area } from '../backend/database/types';

interface AreaPageProps {
  route?: {
    params?: {
      areaId?: string;
      areaTitle?: string;
      areaEmoji?: string;
      dreamId?: string;
      dreamTitle?: string;
    };
  };
  navigation?: {
    goBack?: () => void;
    navigate?: (screen: string, params?: any) => void;
  };
}

const AreaPage: React.FC<AreaPageProps> = ({ route, navigation }) => {
  const params = route?.params || {};
  const { areaId, areaTitle: initialAreaTitle = 'Area', areaEmoji: initialAreaEmoji = '🚀', dreamId, dreamTitle = 'Dream' } = params;
  
  const { state, getDreamDetail, completeOccurrence, deferOccurrence, updateArea, deleteArea } = useData();
  const [actions, setActions] = useState<any[]>([]);
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);
  const [optionsTriggerPosition, setOptionsTriggerPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  const optionsButtonRef = React.useRef<View>(null);

  // Get current area data from state to ensure it updates when edited
  const currentArea = dreamId && areaId && state.dreamDetail[dreamId] 
    ? state.dreamDetail[dreamId].areas.find((a: Area) => a.id === areaId)
    : null;
  
  const areaTitle = currentArea?.title || initialAreaTitle;
  const areaEmoji = currentArea?.icon || initialAreaEmoji;

  useEffect(() => {
    if (dreamId) {
      getDreamDetail(dreamId, { force: true });
    }
  }, [dreamId]); // Only depend on dreamId - functions are stable from DataContext

  // Re-fetch data when user navigates back to this screen
  useFocusEffect(
    React.useCallback(() => {
      if (dreamId) {
        getDreamDetail(dreamId, { force: true });
      }
    }, [dreamId]) // Only depend on dreamId - functions are stable from DataContext
  );

  useEffect(() => {
    if (dreamId && areaId && state.dreamDetail[dreamId]) {
      const dreamData = state.dreamDetail[dreamId];
      if (dreamData?.occurrences && dreamData?.actions) {
        // Filter actions for this specific area
        const areaActions = dreamData.actions.filter((action: Action) => action.area_id === areaId);
        
        // Convert ActionOccurrence[] to the format expected by ActionChipsList
        const formattedActions = dreamData.occurrences
          .filter((occurrence: ActionOccurrence) => {
            // Only include occurrences for actions in this area
            return areaActions.some((action: Action) => action.id === occurrence.action_id);
          })
          .map((occurrence: ActionOccurrence) => {
            // Find the corresponding action for this occurrence
            const action = areaActions.find((a: Action) => a.id === occurrence.action_id);
            if (!action) return null;
            
            return {
              id: occurrence.id,
              title: action.title,
              est_minutes: action.est_minutes || 30,
              difficulty: action.difficulty,
              repeat_every_days: action.repeat_every_days,
              slice_count_target: action.slice_count_target,
              acceptance_criteria: action.acceptance_criteria || [],
              dream_image: dreamData.dream?.image_url,
              // Occurrence-specific fields
              occurrence_no: occurrence.occurrence_no,
              due_on: occurrence.due_on,
              completed_at: occurrence.completed_at,
              is_done: !!occurrence.completed_at,
              is_overdue: new Date(occurrence.due_on) < new Date() && !occurrence.completed_at,
              // Hide edit buttons on individual actions
              hideEditButtons: true,
            };
          })
          .filter(Boolean); // Remove null entries
        setActions(formattedActions);
      }
    }
  }, [dreamId, areaId, state.dreamDetail]);

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

  const handleActionPress = (occurrenceId: string) => {
    console.log('Action occurrence pressed:', occurrenceId);
    
    // Find the occurrence and action details
    const occurrence = actions.find(action => action.id === occurrenceId);
    if (occurrence && navigation?.navigate) {
      navigation.navigate('ActionOccurrence', {
        occurrenceId: occurrence.id,
        actionTitle: occurrence.title,
        dreamTitle: dreamTitle,
        areaName: areaTitle,
        areaEmoji: areaEmoji,
        actionDescription: 'Complete this action to progress toward your goal.',
        dueDate: occurrence.due_on,
        estimatedTime: occurrence.est_minutes,
        difficulty: occurrence.difficulty,
        dreamImage: occurrence.dream_image,
        sliceCountTarget: occurrence.slice_count_target,
        occurrenceNo: occurrence.occurrence_no,
        isCompleted: occurrence.is_done,
        isOverdue: occurrence.is_overdue,
        completedAt: occurrence.completed_at,
        note: undefined, // This would come from the occurrence data
        aiRating: undefined, // This would come from the occurrence data
        aiFeedback: undefined // This would come from the occurrence data
      });
    }
  };

  const handleEditAction = (id: string, updatedAction: any) => {
    console.log('Edit action occurrence:', id, updatedAction);
    // TODO: Update action occurrence in database
  };

  const handleRemoveAction = (id: string) => {
    console.log('Remove action occurrence:', id);
    // TODO: Remove action occurrence from database
  };

  const handleAddAction = (action: any) => {
    console.log('Add action occurrence:', action);
    // TODO: Add new action occurrence to database
  };

  const handleReorderActions = (reorderedActions: any[]) => {
    console.log('Reorder action occurrences:', reorderedActions);
    // TODO: Update action occurrence order in database
  };

  const handleCompleteOccurrence = async (occurrenceId: string) => {
    try {
      await completeOccurrence(occurrenceId);
      // Refresh the dream detail to get updated data
      if (dreamId) {
        getDreamDetail(dreamId, { force: true });
      }
    } catch (error) {
      console.error('Error completing occurrence:', error);
    }
  };

  const handleDeferOccurrence = async (occurrenceId: string) => {
    try {
      await deferOccurrence(occurrenceId);
      // Refresh the dream detail to get updated data
      if (dreamId) {
        getDreamDetail(dreamId, { force: true });
      }
    } catch (error) {
      console.error('Error deferring occurrence:', error);
    }
  };

  // Calculate area progress
  const calculateAreaProgress = () => {
    if (actions.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = actions.filter(action => action.is_done).length;
    const total = actions.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const areaProgress = calculateAreaProgress();

  // Helper function to check if a string contains only emojis
  const isValidEmoji = (str: string): boolean => {
    if (!str || str.trim() === '') return true; // Empty is valid (optional field)
    // Check if string contains only emoji characters
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200d]+$/u;
    return emojiRegex.test(str);
  };

  const handleEditArea = () => {
    // Get current area data from state
    const dreamData = state.dreamDetail[dreamId || ''];
    const area = dreamData?.areas?.find((a: Area) => a.id === areaId);
    
    if (area) {
      setEditTitle(area.title);
      setEditIcon(area.icon || '');
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    Keyboard.dismiss();
    
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the area.');
      return;
    }

    if (!areaId) {
      Alert.alert('Error', 'Area ID is missing.');
      return;
    }

    // Validate emoji
    if (editIcon.trim() && !isValidEmoji(editIcon.trim())) {
      Alert.alert('Invalid Input', 'Please enter only emojis in the icon field.');
      return;
    }

    setIsEditing(true);
    try {
      const updates: { title: string; icon?: string } = {
        title: editTitle.trim(),
      };

      if (editIcon.trim()) {
        updates.icon = editIcon.trim();
      }

      await updateArea(areaId, updates);
      
      // Refresh dream detail to ensure UI updates
      if (dreamId) {
        await getDreamDetail(dreamId, { force: true });
      }
      
      setShowEditModal(false);
      Alert.alert('Success', 'Area updated successfully!');
    } catch (error) {
      console.error('Error updating area:', error);
      Alert.alert('Error', 'Failed to update area. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteArea = () => {
    if (!areaId || !dreamId) {
      Alert.alert('Error', 'Area ID or Dream ID is missing.');
      return;
    }

    Alert.alert(
      'Delete Area',
      `Are you sure you want to delete "${areaTitle}"? This will also delete all associated actions. This action cannot be undone.`,
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
              await deleteArea(areaId, dreamId);
              // Navigate back to dream page after successful deletion
              if (navigation?.goBack) {
                navigation.goBack();
              }
            } catch (error) {
              console.error('Error deleting area:', error);
              Alert.alert('Error', 'Failed to delete area. Please try again.');
            }
          },
        },
      ]
    );
  };

  const optionsPopoverItems = [
    {
      id: 'add_action',
      icon: 'add',
      title: 'Add Action',
      onPress: () => {
        setShowOptionsPopover(false);
        setShowAddActionModal(true);
      }
    },
    {
      id: 'edit',
      icon: 'edit',
      title: 'Edit Area',
      onPress: handleEditArea
    },
    {
      id: 'delete',
      icon: 'delete',
      title: 'Delete Area',
      destructive: true,
      onPress: handleDeleteArea
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
          {/* Area Emoji */}
          <View style={styles.emojiContainer}>
            <Text style={styles.areaEmoji}>{areaEmoji}</Text>
          </View>

          {/* Dream Title */}
          <Text style={styles.dreamTitle}>{dreamTitle}</Text>

          {/* Area Title */}
          <Text style={styles.areaTitle}>{areaTitle}</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                {areaProgress.completed} of {areaProgress.total} actions
              </Text>
              <Text style={styles.progressPercentage}>
                {areaProgress.percentage}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${areaProgress.percentage}%` }
                ]} 
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <ActionChipsList
              actions={actions}
              onEdit={handleEditAction}
              onRemove={handleRemoveAction}
              onAdd={handleAddAction}
              onReorder={handleReorderActions}
              onPress={handleActionPress}
            />
          </View>
        </ScrollView>

        <OptionsPopover
          visible={showOptionsPopover}
          onClose={() => setShowOptionsPopover(false)}
          options={optionsPopoverItems}
          triggerPosition={optionsTriggerPosition}
        />

        {/* Edit Area Modal */}
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
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Edit Area</Text>
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
              contentContainerStyle={{ padding: 16, paddingBottom: 400 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <View style={{ marginBottom: 16 }}>
                <Input
                  label="Title"
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter area title"
                  multiline
                  variant="borderless"
                />
              </View>

              {/* Icon/Emoji */}
              <View style={{ marginBottom: 16 }}>
                <Input
                  label="Icon (Emoji)"
                  value={editIcon}
                  onChangeText={setEditIcon}
                  placeholder="Enter emoji (e.g. 🚀)"
                  variant="borderless"
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add Action Modal */}
        <AddActionModal
          visible={showAddActionModal}
          onClose={() => setShowAddActionModal(false)}
          onSave={handleAddAction}
        />
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
  emojiContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  areaEmoji: {
    fontSize: 150,
  },
  dreamTitle: {
    fontSize: 14,
    color: theme.colors.grey[600],
    textAlign: 'left',
    marginBottom: theme.spacing.xs,
  },
  areaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginBottom: theme.spacing.lg,
  },
  progressContainer: {
    marginBottom: theme.spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressText: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[500],
  },
  progressPercentage: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[500],
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.grey[300],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[600],
    borderRadius: 4,
  },
  actionsContainer: {
    flex: 1,
  },
});

export default AreaPage;
