import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { theme } from '../utils/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { JournalCard } from '../components/JournalCard';
import { IconButton } from '../components/IconButton';

const JournalPage = ({ navigation }: { navigation?: any }) => {
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


  const handleEntryPress = (entryId: string) => {
    if (navigation?.navigate) {
      const entry = journalEntries.find(e => e.id === entryId);
      navigation.navigate('AddJourneyEntryPage', {
        editingEntry: entry
      });
    }
  };

  const handleEditEntry = (entryId: string) => {
    if (navigation?.navigate) {
      const entry = journalEntries.find(e => e.id === entryId);
      navigation.navigate('AddJourneyEntryPage', {
        editingEntry: entry
      });
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setJournalEntries(entries => entries.filter(entry => entry.id !== entryId));
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Journal</Text>
              <Text style={styles.subtitle}>Track your daily journey and feelings</Text>
            </View>
            <IconButton
              icon="add"
              onPress={() => navigation?.navigate && navigation.navigate('AddJourneyEntryPage')}
              variant="secondary"
              size="md"
            />
          </View>
        </View>

        <View style={styles.feedSection}>
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
});

export default JournalPage;