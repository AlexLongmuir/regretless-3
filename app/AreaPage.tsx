import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, KeyboardAvoidingView, Platform, Keyboard, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { ActionChipsList } from '../components/ActionChipsList';
import { OptionsPopover } from '../components/OptionsPopover';
import { Input } from '../components/Input';
import { AddActionModal } from '../components/ActionChipsList';
import { useData } from '../contexts/DataContext';
import { supabaseClient } from '../lib/supabaseClient';
import { upsertActions } from '../frontend-services/backend-bridge';
import type { Dream, Action, ActionOccurrence, Area } from '../backend/database/types';
import { SheetHeader } from '../components/SheetHeader';
import { BOTTOM_NAV_PADDING } from '../utils/bottomNavigation';
import { sanitizeErrorMessage } from '../utils/errorSanitizer';

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
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  // Calculate emoji dimensions
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const emojiHeight = screenHeight * 0.45;
  // Calculate emoji width to extend to screen edges (accounting for content padding)
  const emojiWidth = screenWidth + (theme.spacing.md * 2);
  
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
            
            // Normalize acceptance_criteria: convert string arrays to object arrays
            let normalizedCriteria: { title: string; description: string }[] = []
            if (action.acceptance_criteria) {
              if (Array.isArray(action.acceptance_criteria)) {
                normalizedCriteria = action.acceptance_criteria.map((criterion: any) => {
                  if (typeof criterion === 'string') {
                    // Convert string to object with title and empty description
                    return { title: criterion, description: '' }
                  } else if (criterion && typeof criterion === 'object' && 'title' in criterion) {
                    // Already in object format
                    return { title: criterion.title || '', description: criterion.description || '' }
                  }
                  return { title: '', description: '' }
                })
              }
            }
            
            return {
              id: occurrence.id,
              title: action.title,
              est_minutes: action.est_minutes || 30,
              difficulty: action.difficulty,
              repeat_every_days: action.repeat_every_days,
              slice_count_target: action.slice_count_target,
              acceptance_criteria: normalizedCriteria,
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
    // TODO: Update action occurrence in database
  };

  const handleRemoveAction = (id: string) => {
    // TODO: Remove action occurrence from database
  };

  const handleAddAction = async (action: any) => {
    if (!dreamId || !areaId) {
      Alert.alert('Error', 'Missing dream ID or area ID');
      return;
    }

    try {
      // Get user session
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      // Get existing actions for this area to determine position and include them in the request
      const dreamData = state.dreamDetail[dreamId];
      const areaActions = dreamData?.actions?.filter((a: Action) => a.area_id === areaId) || [];
      const nextPosition = areaActions.length;

      // Prepare the new action
      const newAction = {
        user_id: session.user.id,
        dream_id: dreamId,
        area_id: areaId,
        title: action.title,
        est_minutes: action.est_minutes,
        difficulty: action.difficulty,
        repeat_every_days: action.repeat_every_days,
        slice_count_target: action.slice_count_target,
        acceptance_criteria: action.acceptance_criteria || [],
        acceptance_intro: (action as any).acceptance_intro,
        acceptance_outro: (action as any).acceptance_outro,
        position: nextPosition,
        is_active: true
      } as Omit<Action, 'id' | 'created_at' | 'updated_at'>;

      // Include all existing actions for this area + the new one
      // This prevents the API from deleting existing actions
      const allActions = [
        ...areaActions.map((a: Action) => ({
          id: a.id,
          user_id: a.user_id,
          dream_id: a.dream_id,
          area_id: a.area_id,
          title: a.title,
          est_minutes: a.est_minutes,
          difficulty: a.difficulty,
          repeat_every_days: a.repeat_every_days,
          slice_count_target: a.slice_count_target,
          acceptance_criteria: a.acceptance_criteria,
          acceptance_intro: (a as any).acceptance_intro,
          acceptance_outro: (a as any).acceptance_outro,
          position: a.position,
          is_active: a.is_active
        })),
        newAction
      ];

      const actionData = {
        dream_id: dreamId,
        actions: allActions
      };

      // Call API to create action using backend-bridge
      const result = await upsertActions(actionData as any, session.access_token);
      
      // Identify the newly created action by excluding pre-existing action IDs
      const existingActionIds = new Set(areaActions.map((a: Action) => a.id));
      const newlyCreatedCandidates = (result.actions as Action[])
        .filter((a: Action) => a.area_id === (areaId as string) && !existingActionIds.has(a.id));
      // Prefer the one with highest position among new candidates
      const createdAction = newlyCreatedCandidates.sort((a, b) => (b.position || 0) - (a.position || 0))[0];

      if (!createdAction) {
        throw new Error('Failed to find the newly created action');
      }

      // Check if an occurrence already exists for this action
      const { data: existingOccurrence } = await supabaseClient
        .from('action_occurrences')
        .select('id')
        .eq('action_id', createdAction.id)
        .eq('occurrence_no', 1)
        .single();

      // Create occurrences based on action type
      if (action.slice_count_target && action.slice_count_target > 0) {
        // Finite series: create N occurrences with initial planned/due date
        // Skip single-occurrence creation; insert full series instead
        const { data: existingAny } = await supabaseClient
          .from('action_occurrences')
          .select('id')
          .eq('action_id', createdAction.id)
          .limit(1);

        if (!existingAny || existingAny.length === 0) {
          const occurrences = Array.from({ length: action.slice_count_target }, (_, idx) => ({
            action_id: createdAction.id,
            dream_id: dreamId as string,
            area_id: areaId as string,
            user_id: session.user.id,
            occurrence_no: idx + 1,
            planned_due_on: action.due_on,
            due_on: action.due_on,
            defer_count: 0,
            note: null
          }));

          const { error: seriesInsertError } = await supabaseClient
            .from('action_occurrences')
            .insert(occurrences);

          if (seriesInsertError) {
            throw new Error(`Failed to create series occurrences: ${seriesInsertError.message}`);
          }
        }
      } else {
        // One-off or repeating: only ensure first occurrence exists
        if (!existingOccurrence) {
          const { error: occurrenceError } = await supabaseClient
            .from('action_occurrences')
            .insert({
              action_id: createdAction.id,
              dream_id: dreamId,
              area_id: areaId,
              user_id: session.user.id,
              occurrence_no: 1,
              planned_due_on: action.due_on,
              due_on: action.due_on,
              defer_count: 0
            });

          if (occurrenceError) {
            throw new Error(`Failed to create occurrence: ${occurrenceError.message}`);
          }
        }
      }

      // Refresh dream detail to show the new action
      await getDreamDetail(dreamId, { force: true });

      Alert.alert('Success', 'Action created successfully!');
    } catch (error) {
      console.error('Error adding action:', error);
      Alert.alert('Error', sanitizeErrorMessage(error, 'Failed to create action. Please try again.'));
    }
  };

  const handleReorderActions = (reorderedActions: any[]) => {
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

        {/* ScrollView with Emoji and Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Area Emoji - scrolls with content */}
          <View style={[styles.emojiBackground, { height: emojiHeight, width: emojiWidth }]}>
            <Text style={styles.areaEmoji}>{areaEmoji}</Text>
          </View>

          {/* Dream Title */}
          <Pressable onPress={() => navigation?.navigate?.('Dream', { dreamId })}>
            <Text style={styles.dreamTitle}>{dreamTitle}</Text>
          </Pressable>

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
              dreamEndDate={currentArea?.dream_id && state.dreamDetail[currentArea.dream_id]?.dream?.end_date}
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
            style={{ flex: 1, backgroundColor: theme.colors.background.page }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Header */}
            <SheetHeader
              title="Edit Area"
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
      </View>
    </>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
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
  emojiBackground: {
    overflow: 'hidden',
    marginLeft: -theme.spacing.md,
    marginRight: -theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.page,
  },
  areaEmoji: {
    fontSize: 200,
    textAlign: 'center',
  },
  dreamTitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'left',
    marginBottom: theme.spacing.xs,
  },
  areaTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
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
    color: theme.colors.text.tertiary,
  },
  progressPercentage: {
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.tertiary,
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
