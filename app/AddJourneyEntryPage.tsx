import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { ImageGallery } from '../components/ImageGallery';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ListRow } from '../components/ListRow';

interface AddJourneyEntryPageProps {
  navigation?: {
    goBack?: () => void;
    navigate?: (screen: string, params?: any) => void;
  };
  route?: {
    params?: {
      editingEntry?: any;
    };
  };
}

interface MoodOption {
  value: number;
  emoji: string;
  label: string;
  color: string;
}

const moodOptions: MoodOption[] = [
  { value: 5, emoji: '😊', label: 'Great', color: theme.colors.success[500] },
  { value: 4, emoji: '🙂', label: 'Good', color: theme.colors.success[400] },
  { value: 3, emoji: '😐', label: 'Okay', color: theme.colors.primary[500] },
  { value: 2, emoji: '😕', label: 'Not good', color: theme.colors.warning[500] },
  { value: 1, emoji: '😢', label: 'Bad', color: theme.colors.error[500] },
];

const AddJourneyEntryPage: React.FC<AddJourneyEntryPageProps> = ({ navigation, route }) => {
  const editingEntry = route?.params?.editingEntry;
  const isEditing = !!editingEntry;
  
  const [title, setTitle] = useState(editingEntry?.title || '');
  const [content, setContent] = useState(editingEntry?.content || '');
  const [selectedMood, setSelectedMood] = useState<number | null>(editingEntry?.moodRating || null);
  const [images, setImages] = useState<string[]>(editingEntry?.images || []);
  const [imageDreamTags, setImageDreamTags] = useState<{ [key: number]: string }>({});

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleSubmit = () => {
    // Here you would save the journal entry
    console.log({
      title,
      content,
      moodRating: selectedMood,
      images,
      date: new Date().toISOString().split('T')[0],
    });

    // Navigate back to ProgressPage
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleDelete = () => {
    // Here you would delete the journal entry
    console.log('Deleting entry:', editingEntry.id);
    
    // Navigate back to ProgressPage
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const isSubmitDisabled = !title.trim() || !content.trim() || selectedMood === null;

  const handleMoodSelection = (mood: MoodOption) => {
    setSelectedMood(mood.value);
  };

  const handleImageDreamTagChange = (imageIndex: number, dreamId: string) => {
    setImageDreamTags(prev => ({
      ...prev,
      [imageIndex]: dreamId
    }));
  };

  // Sample dreams for testing
  const sampleDreams = [
    { id: '1', title: 'Lose Weight' },
    { id: '2', title: 'Build Muscle' },
    { id: '3', title: 'Run Marathon' },
    { id: '4', title: 'Learn Guitar' },
  ];

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
            />
            <Text style={styles.headerTitle}>{isEditing ? 'Edit Journal Entry' : 'Add Journal Entry'}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Input
                label="Entry Title"
                value={title}
                onChangeText={setTitle}
                placeholder="What happened today?"
                type="singleline"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Progress Photos</Text>
              <ImageGallery
                images={images}
                onImagesChange={setImages}
                maxImages={6}
                addButtonText="Add Photo"
                emptyStateTitle=""
                emptyStateDescription=""
                showDreamTagging={true}
                dreams={sampleDreams}
                imageDreamTags={imageDreamTags}
                onImageDreamTagChange={handleImageDreamTagChange}
              />
            </View>

            <View style={styles.section}>
              <Input
                label="Journal Entry"
                value={content}
                onChangeText={setContent}
                placeholder="Reflect on your day, progress, thoughts, and feelings..."
                multiline
              />
            </View>


            <View style={styles.section}>
              <Text style={styles.sectionLabel}>How are you feeling today?</Text>
              <View style={styles.moodGrid}>
                {moodOptions.map((mood) => (
                  <View
                    key={mood.value}
                    style={[
                      styles.moodOption,
                      selectedMood === mood.value && styles.selectedMoodOption,
                      selectedMood === mood.value && { borderColor: mood.color }
                    ]}
                    onTouchEnd={() => handleMoodSelection(mood)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={[
                      styles.moodLabel,
                      selectedMood === mood.value && { color: mood.color }
                    ]}>
                      {mood.label}
                    </Text>
                    <Text style={[
                      styles.moodValue,
                      selectedMood === mood.value && { color: mood.color }
                    ]}>
                      {mood.value}/5
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomSection}>
            <View style={styles.buttonRow}>
              {isEditing && (
                <IconButton
                  icon="delete"
                  onPress={handleDelete}
                  variant="ghost"
                  size="lg"
                  style={styles.deleteButton}
                  iconColor={theme.colors.error[500]}
                />
              )}
              <Button
                title="Save Entry"
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
                style={styles.submitButton}
              />
            </View>
          </View>
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
    backgroundColor: theme.colors.surface[100],
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.surface[50],
  },
  headerSpacer: {
    width: 44, // Same width as IconButton to center the title
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.grey[800],
    marginBottom: theme.spacing.md,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  moodOption: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.grey[200],
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xs,
  },
  selectedMoodOption: {
    backgroundColor: theme.colors.surface[50],
    borderWidth: 3,
    shadowColor: theme.colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  moodEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.grey[600],
    textAlign: 'center',
    lineHeight: 12,
  },
  moodValue: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.grey[500],
    marginTop: 1,
  },
  bottomSection: {
    backgroundColor: theme.colors.surface[50],
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.grey[200],
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  deleteButton: {
    backgroundColor: theme.colors.error[100],
  },
  submitButton: {
    flex: 1,
  },
});

export default AddJourneyEntryPage;