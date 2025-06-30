import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Action {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  estimatedTime?: number;
  status: 'todo' | 'done' | 'skipped';
}

interface CompletedAction {
  id: string;
  title: string;
  completedDate: string;
}

interface ActionsPreviewCardProps {
  actions: Action[];
  recentCompletedActions?: CompletedAction[];
  onActionPress?: (actionId: string) => void;
  style?: any;
}

export const ActionsPreviewCard: React.FC<ActionsPreviewCardProps> = ({
  actions,
  recentCompletedActions = [],
  onActionPress,
  style,
}) => {
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  
  // Filter to get upcoming/todo actions
  const upcomingActions = actions.filter(action => action.status === 'todo');
  const currentAction = upcomingActions[currentActionIndex] || null;
  
  const handlePrevious = () => {
    if (currentActionIndex > 0) {
      setCurrentActionIndex(currentActionIndex - 1);
    }
  };
  
  const handleNext = () => {
    if (currentActionIndex < upcomingActions.length - 1) {
      setCurrentActionIndex(currentActionIndex + 1);
    }
  };
  
  const formatEstimatedTime = (estimatedTime?: number) => {
    if (!estimatedTime) return '5min';
    if (estimatedTime < 60) return `${estimatedTime}min`;
    const hours = Math.floor(estimatedTime / 60);
    const minutes = estimatedTime % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  if (!currentAction) {
    return (
      <View style={[styles.cardContainer, style]}>
        <View style={styles.card}>
          <View style={styles.topSection}>
            <View style={styles.gradientOverlay}>
              <Text style={styles.noActionsTitle}>All Actions Complete!</Text>
              <Text style={styles.noActionsText}>Great job! You've completed all your actions for this dream.</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.cardContainer, style]}>
      <Pressable
        style={styles.card}
        onPress={() => onActionPress?.(currentAction.id)}
      >
        <View style={styles.topSection}>
          <View style={styles.gradientOverlay}>
            {/* Header row with "Next Action" text and navigation controls */}
            <View style={styles.headerRow}>
              <Text style={styles.nextActionLabel}>Next Action</Text>
              <View style={styles.navigationContainer}>
                <Pressable
                  style={[styles.navButton, currentActionIndex === 0 && styles.navButtonDisabled]}
                  onPress={handlePrevious}
                  disabled={currentActionIndex === 0}
                >
                  <Icon 
                    name="chevron-left" 
                    size={24} 
                    color={currentActionIndex === 0 ? theme.colors.surface[200] : theme.colors.surface[50]} 
                  />
                </Pressable>
                
                <View style={styles.actionCounter}>
                  <Text style={styles.actionCounterText}>
                    {currentActionIndex + 1} of {upcomingActions.length}
                  </Text>
                </View>
                
                <Pressable
                  style={[styles.navButton, currentActionIndex === upcomingActions.length - 1 && styles.navButtonDisabled]}
                  onPress={handleNext}
                  disabled={currentActionIndex === upcomingActions.length - 1}
                >
                  <Icon 
                    name="chevron-right" 
                    size={24} 
                    color={currentActionIndex === upcomingActions.length - 1 ? theme.colors.surface[200] : theme.colors.surface[50]} 
                  />
                </Pressable>
              </View>
            </View>
            
            <Text style={styles.actionTitle} numberOfLines={2}>
              {currentAction.title}
            </Text>
            
            {currentAction.description && (
              <Text style={styles.actionDescription} numberOfLines={3}>
                {currentAction.description}
              </Text>
            )}
            
            <View style={styles.metaContainer}>
              {currentAction.dueDate && (
                <View style={styles.metaItem}>
                  <Icon name="schedule" size={16} color={theme.colors.surface[200]} />
                  <Text style={styles.metaText}>{currentAction.dueDate}</Text>
                </View>
              )}
              
              <View style={styles.metaItem}>
                <Icon name="timer" size={16} color={theme.colors.surface[200]} />
                <Text style={styles.metaText}>{formatEstimatedTime(currentAction.estimatedTime)}</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
      
      {/* Recent completed actions section */}
      {recentCompletedActions.length > 0 && (
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsLabel}>Recent Completed Actions</Text>
          {recentCompletedActions.slice(0, 3).map((action, index) => (
            <View key={action.id || index} style={styles.actionItem}>
              <Icon name="check-circle" size={16} color={theme.colors.success[500]} />
              <Text style={styles.actionText} numberOfLines={1}>
                {action.title}
              </Text>
            </View>
          ))}
          {recentCompletedActions.length > 3 && (
            <Text style={styles.moreActionsText}>
              +{recentCompletedActions.length - 3} more actions
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: theme.colors.primary[900],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  card: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  topSection: {
    backgroundColor: theme.colors.primary[600],
    position: 'relative',
    minHeight: 120,
  },
  gradientOverlay: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  nextActionLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.primary[200],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    backgroundColor: `${theme.colors.primary[700]}80`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: `${theme.colors.primary[700]}30`,
  },
  actionCounter: {
    backgroundColor: `${theme.colors.primary[700]}80`,
    paddingHorizontal: theme.spacing.sm,
    height: 32, // Match the height of nav buttons
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCounterText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.surface[50],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.sm,
    marginTop: 0,
  },
  actionDescription: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.surface[50],
    opacity: 0.9,
    marginBottom: theme.spacing.md,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    color: theme.colors.surface[200],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  noActionsTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.title2,
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  noActionsText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.surface[50],
    opacity: 0.9,
    textAlign: 'center',
  },
  actionsContainer: {
    backgroundColor: theme.colors.primary[800],
    padding: theme.spacing.md,
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  actionsLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.primary[200],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  actionText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.medium as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.surface[50],
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  moreActionsText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    lineHeight: theme.typography.lineHeight.caption1,
    color: theme.colors.primary[200],
    marginTop: theme.spacing.xs,
  },
});