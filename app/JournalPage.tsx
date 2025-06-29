import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { JournalCard } from '../components/JournalCard';

const JournalPage = () => {
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [moodRating, setMoodRating] = useState(5);
  const [journalEntries, setJournalEntries] = useState([
    {
      id: '1',
      date: 'TODAY',
      title: 'Morning Reflection',
      content: 'Started the day with meditation and a good workout. Feeling energized and ready to tackle my goals.',
      moodRating: 8,
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'],
      completedActions: ['Morning workout', 'Meditation session', 'Healthy breakfast']
    }
  ]);

  const handleSaveEntry = () => {
    if (!journalTitle.trim() || !journalContent.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }

    const newEntry = {
      id: Date.now().toString(),
      date: 'TODAY',
      title: journalTitle,
      content: journalContent,
      moodRating,
      images: [],
      completedActions: []
    };

    setJournalEntries([newEntry, ...journalEntries]);
    setJournalTitle('');
    setJournalContent('');
    setMoodRating(5);
  };

  const handleEntryPress = (entryId: string) => {
    console.log('Entry pressed:', entryId);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Progress</Text>
              <Text style={styles.subtitle}>Track your daily journey and feelings</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.createEntrySection}>
          <Text style={styles.sectionTitle}>How are you feeling today?</Text>
          
          <View style={styles.moodSelector}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
              <Pressable
                key={rating}
                style={[
                  styles.moodButton,
                  moodRating === rating && styles.moodButtonSelected
                ]}
                onPress={() => setMoodRating(rating)}
              >
                <Text style={[
                  styles.moodButtonText,
                  moodRating === rating && styles.moodButtonTextSelected
                ]}>
                  {rating}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Entry title..."
            value={journalTitle}
            onChangeText={setJournalTitle}
            placeholderTextColor={theme.colors.grey[500]}
          />

          <TextInput
            style={styles.contentInput}
            placeholder="What's on your mind? How was your day?"
            value={journalContent}
            onChangeText={setJournalContent}
            multiline
            numberOfLines={4}
            placeholderTextColor={theme.colors.grey[500]}
          />

          <View style={styles.entryActions}>
            <Pressable style={styles.uploadButton}>
              <Icon name="photo-camera" size={20} color={theme.colors.grey[600]} />
              <Text style={styles.uploadButtonText}>Add Photos</Text>
            </Pressable>
            
            <Pressable style={styles.saveButton} onPress={handleSaveEntry}>
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>Your Journey</Text>
          {journalEntries.map((entry) => (
            <JournalCard
              key={entry.id}
              entry={entry}
              onPress={handleEntryPress}
            />
          ))}
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
  content: {
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.grey[600],
    lineHeight: 22,
    textAlign: 'left',
  },
  createEntrySection: {
    backgroundColor: theme.colors.surface[50],
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  feedSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
    textAlign: 'left',
  },
  moodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  moodButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface[100],
    borderWidth: 2,
    borderColor: theme.colors.grey[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodButtonSelected: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  moodButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.grey[600],
  },
  moodButtonTextSelected: {
    color: theme.colors.surface[50],
  },
  titleInput: {
    backgroundColor: theme.colors.surface[100],
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
  },
  contentInput: {
    backgroundColor: theme.colors.surface[100],
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
  },
  entryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface[100],
    borderWidth: 1,
    borderColor: theme.colors.grey[300],
  },
  uploadButtonText: {
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.grey[600],
  },
  saveButton: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.surface[50],
  },
});

export default JournalPage;