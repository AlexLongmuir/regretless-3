import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Pressable, Image } from 'react-native';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { AITip } from '../components/AITip';
import { AIQuestions } from '../components/AIQuestions';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { OptionsPopover } from '../components/OptionsPopover';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ActionPageProps {
  route?: {
    params?: {
      actionId?: string;
      goalName?: string;
      actionTitle?: string;
      actionDescription?: string;
      aiTip?: string;
      dueDate?: string;
      frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
      repeatInterval?: number;
      estimatedTime?: number;
      inspirationImages?: string[];
    };
  };
  navigation?: {
    goBack?: () => void;
    navigate?: (screen: string, params?: any) => void;
  };
}

const ActionPage: React.FC<ActionPageProps> = ({ route, navigation }) => {
  const params = route?.params || {};
  const { 
    goalName = 'Sample Goal', 
    actionTitle = 'Sample Action', 
    actionDescription = 'Sample description', 
    aiTip,
    dueDate = 'Today',
    frequency = 'once',
    repeatInterval,
    estimatedTime = 30,
    inspirationImages = []
  } = params;
  const [inputText, setInputText] = useState('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [hasPhotos, setHasPhotos] = useState(false); // This would track if there are photos
  const [photoButtonPosition, setPhotoButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const photoButtonRef = useRef<View>(null);

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

  const handleMarkDone = () => {
    // TODO: Implement mark as done functionality
    console.log('Mark as done pressed');
  };

  const getFrequencyText = () => {
    if (frequency === 'once') return 'One time';
    if (frequency === 'daily') return 'Daily';
    if (frequency === 'weekly') {
      return repeatInterval ? `Every ${repeatInterval} week${repeatInterval > 1 ? 's' : ''}` : 'Weekly';
    }
    if (frequency === 'monthly') {
      return repeatInterval ? `Every ${repeatInterval} month${repeatInterval > 1 ? 's' : ''}` : 'Monthly';
    }
    return 'One time';
  };

  const getFrequencyIcon = () => {
    if (frequency === 'once') return 'today';
    return 'repeat';
  };

  const formatEstimatedTime = () => {
    if (!estimatedTime) return '5min';
    if (estimatedTime < 60) return `${estimatedTime}min`;
    const hours = Math.floor(estimatedTime / 60);
    const minutes = estimatedTime % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

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

  const dreamExamples = [
    {
      title: 'Learn Piano in 90 days',
      images: [
        'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop'
      ]
    },
    {
      title: 'Run a Marathon in 90 days',
      images: [
        'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
      ]
    },
    {
      title: 'Master Japanese Conversation in 200 days',
      images: [
        'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop'
      ]
    },
    {
      title: 'Build a Mobile App in 60 days',
      images: ['https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop']
    }
  ];

  const selectedDream = dreamExamples[Math.floor(Math.random() * dreamExamples.length)];
  const defaultImages = selectedDream.images;

  const backgroundImages = inspirationImages.length > 0 ? inspirationImages : defaultImages;
  const displayImages = backgroundImages.slice(0, 3);

  const defaultTip = `To maximize your success with "${actionTitle}", try breaking it down into smaller 15-minute chunks. This makes the task feel less overwhelming and helps build momentum. Remember to celebrate small wins along the way!`;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
            <Text style={styles.goalName}>{goalName}</Text>
            <Text style={styles.actionTitle}>{actionTitle}</Text>
            
            <View style={styles.metaRow}>
              <Text style={styles.dueDate}>{dueDate}</Text>
              <Text style={styles.interpunct}>•</Text>
              
              <View style={styles.frequencyContainer}>
                <Icon name={getFrequencyIcon()} size={16} color={theme.colors.grey[600]} />
                <Text style={styles.frequencyText}>{getFrequencyText()}</Text>
              </View>
              
              <Text style={styles.interpunct}>•</Text>
              
              <View style={styles.timeContainer}>
                <Icon name="schedule" size={16} color={theme.colors.grey[600]} />
                <Text style={styles.timeText}>{formatEstimatedTime()}</Text>
              </View>
            </View>
            
            <Text style={styles.actionDescription}>{actionDescription}</Text>
          </View>

          <AITip tip={aiTip || defaultTip} />
          
          <AIQuestions 
            context={`Goal: ${goalName}. Action: ${actionTitle}. Description: ${actionDescription}. Due: ${dueDate}. Frequency: ${getFrequencyText()}. Estimated time: ${formatEstimatedTime()}.`}
            actionTitle={actionTitle}
            actionDescription={actionDescription}
          />
        </ScrollView>

        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <Input
              value={inputText}
              onChangeText={setInputText}
              placeholder="Add notes about your progress..."
              style={styles.textInput}
            />
            <Pressable
              ref={photoButtonRef}
              style={styles.photoButton}
              onPress={handleAddPhoto}
            >
              <Icon name="photo-camera" size={24} color={theme.colors.grey[800]} />
            </Pressable>
          </View>
          
          <View style={styles.buttonRow}>
            <Button
              title="Mark as Done"
              onPress={handleMarkDone}
              style={styles.doneButton}
            />
          </View>
        </View>

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
    backgroundColor: theme.colors.pageBackground,
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
  goalName: {
    fontSize: 16,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  actionTitle: {
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
  dueDate: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.grey[600],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  interpunct: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.grey[400],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  frequencyText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.grey[600],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  timeText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    color: theme.colors.grey[600],
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  actionDescription: {
    fontSize: 16,
    color: theme.colors.grey[900],
    lineHeight: 22,
    textAlign: 'left',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  inputArea: {
    backgroundColor: theme.colors.surface[50],
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  textInput: {
    flex: 1,
    marginBottom: 0,
  },
  photoButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.defaultGrey,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    alignItems: 'stretch',
  },
  doneButton: {
    width: '100%',
  },
});

export default ActionPage;