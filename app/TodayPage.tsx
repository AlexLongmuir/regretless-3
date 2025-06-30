import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { FilterTabs } from '../components/FilterTabs';
import { ActionCard } from '../components/ActionCard';

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'done' | 'skipped';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
}

const inspirationalQuotes = [
  "The journey of a thousand miles begins with one step.",
  "Today's accomplishments were yesterday's impossibilities.",
  "Progress, not perfection, is the goal.",
  "Every small step counts toward your bigger dreams.",
  "Focus on the process, and the results will follow.",
  "You are capable of more than you know.",
  "Consistency is the mother of mastery."
];

const mockActions: ActionItem[] = [
  {
    id: '1',
    title: 'Practice Piano',
    description: 'Focus on daily practice routine',
    status: 'todo',
    priority: 'high',
    dueDate: '2025-01-07'
  },
  {
    id: '2',
    title: 'Review technique',
    description: 'Study and improve current methods',
    status: 'todo',
    priority: 'high',
    dueDate: '2025-01-08'
  },
  {
    id: '3',
    title: 'Record progress',
    description: 'Document current achievements',
    status: 'done',
    priority: 'medium',
    dueDate: '2025-01-06'
  },
  {
    id: '4',
    title: 'Plan next steps',
    description: 'Outline upcoming goals and milestones',
    status: 'todo',
    priority: 'low',
    dueDate: '2025-01-09'
  }
];

const TodayPage = ({ navigation }: { navigation?: any }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('todo');
  const [actions, setActions] = useState<ActionItem[]>(mockActions);

  const getDayOfYear = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const getQuoteOfTheDay = () => {
    const dayOfYear = getDayOfYear(currentDate);
    return inspirationalQuotes[dayOfYear % inspirationalQuotes.length];
  };

  const getFormattedDate = () => {
    return currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getFilterCounts = () => {
    const todo = actions.filter(a => a.status === 'todo').length;
    const done = actions.filter(a => a.status === 'done').length;
    const skipped = actions.filter(a => a.status === 'skipped').length;
    
    return [
      { key: 'todo', label: 'To Do', count: todo },
      { key: 'done', label: 'Done', count: done },
      { key: 'skipped', label: 'Skipped', count: skipped }
    ];
  };

  const filteredActions = actions.filter(action => action.status === activeFilter);

  const handleActionPress = (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (action && navigation) {
      navigation.navigate('Action', {
        actionId: action.id,
        goalName: 'Learn Piano in 90 days', // This would come from the action's associated goal
        actionTitle: action.title,
        actionDescription: action.description || 'Complete this action to progress toward your goal.',
        aiTip: `Here's a tip for "${action.title}": Break this task into smaller 15-minute chunks to make it more manageable and build momentum.`,
        dueDate: 'Today',
        frequency: 'daily',
        estimatedTime: 30,
        inspirationImages: [
          'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop',
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
        ]
      });
    }
  };

  const handleStatusChange = (actionId: string, newStatus: 'todo' | 'done' | 'skipped') => {
    setActions(prev => prev.map(action => 
      action.id === actionId ? { ...action, status: newStatus } : action
    ));
  };

  const handleAddAction = () => {
    console.log('Add action pressed');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.dateRow}>
                <Text style={styles.date}>{getFormattedDate()}</Text>
                <View style={styles.navigationButtons}>
                  <IconButton
                    icon="chevron_left"
                    onPress={() => navigateDate('prev')}
                    variant="secondary"
                    size="md"
                  />
                  <IconButton
                    icon="chevron_right"
                    onPress={() => navigateDate('next')}
                    variant="secondary"
                    size="md"
                  />
                </View>
              </View>
              <View style={styles.streakContainer}>
                <Text style={styles.streakText}>🔥 7D</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.quote}>{getQuoteOfTheDay()}</Text>

        <View style={styles.filtersContainer}>
          <View style={styles.filtersWrapper}>
            <FilterTabs
              options={getFilterCounts()}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
          </View>
          <IconButton
            icon="add"
            onPress={handleAddAction}
            variant="secondary"
            size="md"
            style={styles.addButton}
          />
        </View>

        <View style={styles.actionsContainer}>
          {filteredActions.map((action) => (
            <ActionCard
              key={action.id}
              id={action.id}
              title={action.title}
              description={action.description}
              status={action.status}
              priority={action.priority}
              dueDate={action.dueDate}
              onPress={handleActionPress}
              onStatusChange={handleStatusChange}
            />
          ))}
          
          {filteredActions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No {activeFilter} items for today
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface[100],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  date: {
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  streakContainer: {
    backgroundColor: theme.colors.warning[800],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    alignSelf: 'flex-start',
  },
  streakText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.warning[500],
  },
  quote: {
    fontSize: 16,
    color: theme.colors.grey[600],
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  filtersWrapper: {
    flex: 1,
  },
  addButton: {
    height: 36,
    width: 36,
  },
  actionsContainer: {
    flex: 1,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.grey[200],
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.callout,
    color: theme.colors.grey[500],
    textAlign: 'center',
  },
});

export default TodayPage;