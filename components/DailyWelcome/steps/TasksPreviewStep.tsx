import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useData } from '../../../contexts/DataContext';
import { Button } from '../../Button';
import { useTheme } from '../../../contexts/ThemeContext';
import { Theme } from '../../../utils/theme';
import { Icon } from '../../Icon';

interface TasksPreviewStepProps {
  onComplete: () => void;
}

export const TasksPreviewStep: React.FC<TasksPreviewStepProps> = ({ onComplete }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { state } = useData();
  const occurrences = state.today?.occurrences || [];
  
  // Get top 3 pending tasks
  const tasks = occurrences
    .filter(o => !o.completed_at)
    .slice(0, 3);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Your Day Ahead</Text>

        {tasks.length > 0 ? (
          <View style={styles.listContainer}>
            <Text style={styles.subHeader}>Top priorities for today:</Text>
            {tasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <View style={styles.iconContainer}>
                   <Icon name="check_circle" size={20} color={theme.colors.text.tertiary} />
                </View>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.actions?.title || 'Untitled Task'}
                </Text>
              </View>
            ))}
            {occurrences.length > 3 && (
              <Text style={styles.moreCount}>+ {occurrences.length - 3} more tasks</Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
             <Icon name="auto_awesome" size={48} color={theme.colors.primary[300]} />
            <Text style={styles.emptyText}>You're all caught up!</Text>
            <Text style={styles.emptySubtext}>Enjoy your free time today.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button 
          title="Let's Go" 
          onPress={onComplete}
          style={[styles.button, { backgroundColor: theme.colors.primary[400] }]}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  header: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 24,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  buttonContainer: {
    width: '100%',
    paddingTop: 10,
  },
  listContainer: {
    width: '100%',
    marginBottom: 32,
  },
  subHeader: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 16,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  iconContainer: {
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    color: theme.colors.text.primary,
    flex: 1,
  },
  moreCount: {
    textAlign: 'center',
    color: theme.colors.text.tertiary,
    marginTop: 8,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    flex: 1,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    width: '100%',
  },
});
