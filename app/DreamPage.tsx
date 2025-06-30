import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { OptionsPopover } from '../components/OptionsPopover';
import { FilterTabs } from '../components/FilterTabs';
import { ActionCard } from '../components/ActionCard';
import { ListRow } from '../components/ListRow';
import { AITip } from '../components/AITip';

interface DreamPageProps {
  route?: {
    params?: {
      dreamId?: string;
      title?: string;
      progressPercentage?: number;
      streakCount?: number;
      daysRemaining?: number;
      currentDay?: number;
      totalDays?: number;
      backgroundImages?: string[];
      recentPhotos?: string[];
      completedActions?: number;
      totalActions?: number;
      recentCompletedActions?: Array<{
        id: string;
        title: string;
        completedDate: string;
      }>;
      actions?: Array<{
        id: string;
        title: string;
        description?: string;
        dueDate?: string;
        estimatedTime?: number;
        status: 'todo' | 'done' | 'skipped';
      }>;
      nextMilestone?: {
        title: string;
        dueDate: string;
      };
    };
  };
  navigation?: {
    goBack?: () => void;
    navigate?: (screen: string, params?: any) => void;
  };
}

const DreamPage: React.FC<DreamPageProps> = ({ route, navigation }) => {
  const params = route?.params || {};
  const { 
    title = 'Sample Dream',
    progressPercentage = 45,
    streakCount = 12,
    currentDay = 45,
    totalDays = 90,
    backgroundImages = []
  } = params;

  const defaultActions: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: string;
    estimatedTime: number;
    status: 'todo' | 'done' | 'skipped';
  }> = [
    { id: '1', title: 'Practice Chopin Etude No. 1', description: 'Focus on finger technique and tempo control', dueDate: '2025-01-07', estimatedTime: 45, status: 'done' },
    { id: '2', title: 'Learn new chord progression', description: 'Practice C-Am-F-G progression with different rhythms', dueDate: '2025-01-08', estimatedTime: 30, status: 'done' },
    { id: '3', title: 'Record practice session', description: 'Record yourself playing the current piece for review', dueDate: '2025-01-09', estimatedTime: 20, status: 'todo' },
    { id: '4', title: 'Watch advanced technique video', description: 'Study hand positioning and dynamics', dueDate: '2025-01-10', estimatedTime: 25, status: 'todo' },
    { id: '5', title: 'Practice scales and arpeggios', description: 'Work on major and minor scales with proper fingering', dueDate: '2025-01-11', estimatedTime: 35, status: 'todo' }
  ];

  const [actions, setActions] = useState(defaultActions);
  
  console.log('DreamPage actions:', actions.map(a => ({ id: a.id, title: a.title, status: a.status })));
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleTakePhoto = () => {
    console.log('Take photo pressed');
    // TODO: Implement camera functionality
  };

  const handlePhotoLibrary = () => {
    console.log('Photo library pressed');
    // TODO: Implement photo library functionality
  };

  const handleRemovePhotos = () => {
    console.log('Remove photos pressed');
    // TODO: Implement remove photos functionality
  };

  const handleAddAction = () => {
    console.log('Add action pressed');
  };

  const handleActionPress = (actionId: string) => {
    console.log('Action pressed:', actionId);
    // TODO: Navigate to ActionPage with action details
  };

  const handleStatusChange = (actionId: string, status: 'todo' | 'done' | 'skipped') => {
    console.log('Status change:', actionId, status);
    setActions(prev => prev.map(action => 
      action.id === actionId ? { ...action, status } : action
    ));
  };


  const getFilterCounts = () => {
    const todo = actions.filter(a => a.status === 'todo').length;
    const done = actions.filter(a => a.status === 'done').length;
    const all = actions.length;
    
    return [
      { key: 'all', label: 'All', count: all },
      { key: 'todo', label: 'To Do', count: todo },
      { key: 'done', label: 'Done', count: done }
    ];
  };

  const filteredActions = activeFilter === 'all' 
    ? actions 
    : actions.filter(action => action.status === activeFilter);

  const getPhotoOptions = () => {
    return [
      {
        id: 'take-photo',
        icon: 'camera-alt',
        title: 'Take Photo',
        onPress: handleTakePhoto,
      },
      {
        id: 'photo-library',
        icon: 'photo-library',
        title: 'Photo Library',
        onPress: handlePhotoLibrary,
      },
      {
        id: 'remove-photos',
        icon: 'delete',
        title: 'Remove Photos',
        onPress: handleRemovePhotos,
      },
    ];
  };

  const defaultImages = [
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
  ];

  const displayImages = backgroundImages.length > 0 ? backgroundImages.slice(0, 3) : defaultImages.slice(0, 3);


  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.topSafeArea} />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.header}>
          <IconButton
            icon="chevron_left"
            onPress={handleBack}
            variant="secondary"
            size="md"
            style={styles.backButton}
          />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.topSection}>
            <View style={styles.imagesSection}>
              <View style={styles.imageGrid}>
                {displayImages.map((image, index) => (
                  <Image 
                    key={index}
                    source={{ uri: image }} 
                    style={[
                      styles.inspirationImage,
                      displayImages.length === 1 && styles.singleImage,
                      displayImages.length === 2 && styles.twoImages,
                      displayImages.length >= 3 && styles.threeImages,
                    ]} 
                  />
                ))}
              </View>
            </View>

            <View style={styles.titleSection}>
              <Text style={styles.dayProgress}>DAY {currentDay} OF {totalDays}</Text>
              <Text style={styles.dreamTitle}>{title}</Text>
              
              <View style={styles.metaRow}>
                <Text style={styles.streakText}>🔥 {streakCount}D</Text>
                <Text style={styles.interpunct}>•</Text>
                
                <Text style={styles.progressText}>{progressPercentage}% complete</Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <ListRow
                title="Progress"
                leftIcon="analytics"
                onPress={() => navigation?.navigate?.('Progress')}
                rightElement="chevron"
                variant="dark"
                isFirst
                isLast
              />
            </View>

            <AITip 
              tip="Keep going strong - you're making real progress!"
              variant="dark"
              style={styles.aiTipContainer}
            />
          </View>

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
                dueDate={action.dueDate}
                estimatedTime={action.estimatedTime}
                onPress={handleActionPress}
                onStatusChange={handleStatusChange}
              />
            ))}
            
            {filteredActions.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No {activeFilter} actions
                </Text>
              </View>
            )}
          </View>

        </ScrollView>

        <OptionsPopover
          visible={showOptionsModal}
          onClose={() => setShowOptionsModal(false)}
          options={getPhotoOptions()}
        />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  topSafeArea: {
    flex: 0,
    backgroundColor: theme.colors.primary[600],
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface[100],
  },
  topSection: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    marginHorizontal: -theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  imagesSection: {
    marginBottom: theme.spacing.lg,
  },
  imageGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  inspirationImage: {
    aspectRatio: 1,
    borderRadius: theme.radius.md,
  },
  singleImage: {
    flex: 1,
  },
  twoImages: {
    flex: 1,
  },
  threeImages: {
    flex: 1,
  },
  titleSection: {
    marginBottom: theme.spacing.lg,
  },
  dayProgress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  dreamTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.surface[50],
    marginBottom: theme.spacing.sm,
    textAlign: 'left',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  streakText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.warning[300],
    fontWeight: theme.typography.fontWeight.bold as any,
  },
  interpunct: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.surface[200],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  progressText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.surface[200],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  progressSection: {
    backgroundColor: theme.colors.primary[700],
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
  aiTipContainer: {
    marginTop: theme.spacing.lg,
  },
});

export default DreamPage;