import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { ActionChipsList } from '../components/ActionChipsList';
import { OptionsPopover } from '../components/OptionsPopover';
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
  const { areaId, areaTitle = 'Area', areaEmoji = '🚀', dreamId, dreamTitle = 'Dream' } = params;
  
  const { state, getDreamDetail, completeOccurrence, deferOccurrence } = useData();
  const [actions, setActions] = useState<any[]>([]);
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);
  const [optionsTriggerPosition, setOptionsTriggerPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();

  useEffect(() => {
    if (dreamId) {
      getDreamDetail(dreamId, { force: true });
    }
  }, [dreamId, getDreamDetail]);

  // Re-fetch data when user navigates back to this screen
  useFocusEffect(
    React.useCallback(() => {
      if (dreamId) {
        getDreamDetail(dreamId, { force: true });
      }
    }, [dreamId, getDreamDetail])
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

  const handleOptionsPress = (event: any) => {
    event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
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

  const optionsPopoverItems = [
    {
      id: 'edit',
      icon: 'edit',
      title: 'Edit Area',
      onPress: () => {
        // TODO: Implement edit functionality
        console.log('Edit area');
      }
    },
    {
      id: 'archive',
      icon: 'archive',
      title: 'Archive Area',
      onPress: () => {
        // TODO: Implement archive functionality
        console.log('Archive area');
      }
    },
    {
      id: 'delete',
      icon: 'delete',
      title: 'Delete Area',
      destructive: true,
      onPress: () => {
        // TODO: Implement delete functionality
        console.log('Delete area');
      }
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
          <Pressable onPress={handleOptionsPress}>
            <IconButton
              icon="more_horiz"
              onPress={() => {}} // Handled by Pressable wrapper
              variant="secondary"
              size="md"
            />
          </Pressable>
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
