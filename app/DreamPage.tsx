import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Pressable, Image } from 'react-native';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { OptionsPopover } from '../components/OptionsPopover';
import { PhotoProgressCard } from '../components/PhotoProgressCard';
import { ActionsPreviewCard } from '../components/ActionsPreviewCard';
import { FilterTabs } from '../components/FilterTabs';
import { ActionCard } from '../components/ActionCard';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
    daysRemaining = 45,
    currentDay = 45,
    totalDays = 90,
    backgroundImages = [],
    recentPhotos = [],
    completedActions = 8,
    totalActions = 12,
    recentCompletedActions = [
      { id: '1', title: 'Practice scales for 30 minutes', completedDate: 'Today' },
      { id: '2', title: 'Learn new chord progression', completedDate: 'Yesterday' },
      { id: '3', title: 'Record practice session', completedDate: '2 days ago' },
      { id: '4', title: 'Watch piano tutorial video', completedDate: '3 days ago' }
    ],
    nextMilestone
  } = params;

  const defaultActions: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: string;
    estimatedTime: number;
    status: 'todo' | 'done' | 'skipped';
  }> = [
    { id: '1', title: 'Practice Chopin Etude No. 1', description: 'Focus on finger technique and tempo control', dueDate: '2025-01-07', estimatedTime: 45, status: 'todo' },
    { id: '2', title: 'Learn new chord progression', description: 'Practice C-Am-F-G progression with different rhythms', dueDate: '2025-01-08', estimatedTime: 30, status: 'todo' },
    { id: '3', title: 'Record practice session', description: 'Record yourself playing the current piece for review', dueDate: '2025-01-09', estimatedTime: 20, status: 'done' },
    { id: '4', title: 'Watch advanced technique video', description: 'Study hand positioning and dynamics', dueDate: '2025-01-10', estimatedTime: 25, status: 'todo' }
  ];

  const [actions, setActions] = useState(defaultActions);
  
  console.log('DreamPage actions:', actions.map(a => ({ id: a.id, title: a.title, status: a.status })));
  const [inputText, setInputText] = useState('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [hasPhotos, setHasPhotos] = useState(recentPhotos.length > 0);
  const [photoButtonPosition, setPhotoButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const photoButtonRef = useRef<View>(null);
  const [activeTab, setActiveTab] = useState('action');
  const [activeFilter, setActiveFilter] = useState('all');

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleAddPhoto = () => {
    if (photoButtonRef.current) {
      photoButtonRef.current.measure((_, __, width, height, pageX, pageY) => {
        setPhotoButtonPosition({ x: pageX, y: pageY, width, height });
        setShowOptionsModal(true);
      });
    } else {
      setShowOptionsModal(true);
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
    setHasPhotos(false);
    // TODO: Implement remove photos functionality
  };

  const handleAddProgress = () => {
    // TODO: Implement add progress functionality
    console.log('Add progress pressed');
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

  const getTabOptions = () => {
    return [
      { key: 'action', label: 'Action' },
      { key: 'progress', label: 'Progress' }
    ];
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
    const options = [
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
    ];

    if (hasPhotos) {
      options.push({
        id: 'remove-photos',
        icon: 'delete',
        title: 'Remove Photos',
        destructive: true,
        onPress: handleRemovePhotos,
      });
    }

    return options;
  };

  const defaultImages = [
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
  ];

  const displayImages = backgroundImages.length > 0 ? backgroundImages.slice(0, 3) : defaultImages.slice(0, 3);


  return (
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

          <View style={styles.tabsContainer}>
            <FilterTabs
              options={getTabOptions()}
              activeFilter={activeTab}
              onFilterChange={setActiveTab}
            />
          </View>

          {activeTab === 'action' && (
            <>
              <ActionsPreviewCard
                actions={actions}
                recentCompletedActions={recentCompletedActions}
                onActionPress={(actionId) => {
                  console.log('Action pressed:', actionId);
                  // TODO: Navigate to ActionPage with action details
                }}
              />

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
            </>
          )}

          {activeTab === 'progress' && (
            <PhotoProgressCard
              recentImages={recentPhotos}
              onAddPhoto={handleAddPhoto}
              onTakePhoto={handleTakePhoto}
              onPhotoLibrary={handlePhotoLibrary}
              onAddProgress={handleAddProgress}
              inputText={inputText}
              onInputChange={setInputText}
            />
          )}

        </ScrollView>

        <OptionsPopover
          visible={showOptionsModal}
          onClose={() => setShowOptionsModal(false)}
          options={getPhotoOptions()}
          triggerPosition={photoButtonPosition}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface[100],
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
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
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  dreamTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.sm,
    textAlign: 'left',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  streakText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.warning[500],
    fontWeight: theme.typography.fontWeight.bold as any,
  },
  interpunct: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.grey[400],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  progressText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.grey[600],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  tabsContainer: {
    marginBottom: theme.spacing.lg,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.lg,
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

export default DreamPage;