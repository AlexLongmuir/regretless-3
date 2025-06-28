import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';
import { DreamCard } from '../components/DreamCard';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';

interface Dream {
  id: string;
  title: string;
  progressPercentage: number;
  streakCount: number;
  daysRemaining: number;
  currentDay: number;
  totalDays: number;
  backgroundImages: string[];
  recentPhotos: string[];
  nextMilestone?: {
    title: string;
    dueDate: string;
  };
}

const mockDreams: Dream[] = [
  {
    id: '1',
    title: 'Learn Piano in 90 days',
    progressPercentage: 75,
    streakCount: 12,
    daysRemaining: 45,
    currentDay: 45,
    totalDays: 90,
    backgroundImages: [
      'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop'
    ],
    recentPhotos: [
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop',
    ],
    nextMilestone: {
      title: 'Master Chopin Etude No. 1',
      dueDate: 'Jun 28',
    },
  },
  {
    id: '2',
    title: 'Run a Marathon in 90 days',
    progressPercentage: 45,
    streakCount: 8,
    daysRemaining: 82,
    currentDay: 8,
    totalDays: 90,
    backgroundImages: [
      'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=300&fit=crop'
    ],
    recentPhotos: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop',
    ],
    nextMilestone: {
      title: 'Complete 15-mile long run',
      dueDate: 'Jul 02',
    },
  },
  {
    id: '3',
    title: 'Master Japanese Conversation in 200 days',
    progressPercentage: 30,
    streakCount: 25,
    daysRemaining: 156,
    currentDay: 44,
    totalDays: 200,
    backgroundImages: [
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop'
    ],
    recentPhotos: [
      'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=100&h=100&fit=crop',
    ],
    nextMilestone: {
      title: 'Complete N4 practice test',
      dueDate: 'Jun 30',
    },
  },
  {
    id: '4',
    title: 'Build a Mobile App in 60 days',
    progressPercentage: 60,
    streakCount: 5,
    daysRemaining: 21,
    currentDay: 39,
    totalDays: 60,
    backgroundImages: ['https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop'],
    recentPhotos: [],
    nextMilestone: {
      title: 'Implement user authentication',
      dueDate: 'Jul 05',
    },
  },
];

const DreamsPage = () => {
  const handleDreamPress = (dreamId: string) => {
    console.log('Dream pressed:', dreamId);
  };

  const handleAddFirstDream = () => {
    console.log('Add first dream pressed');
  };

  if (mockDreams.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Start Your Journey</Text>
        <Text style={styles.emptySubtitle}>
          Add your first dream and begin tracking your progress toward achieving it.
        </Text>
        <Button
          title="Add Your First Dream"
          onPress={handleAddFirstDream}
          style={styles.addButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Your Dreams</Text>
              <Text style={styles.subtitle}>
                Keep pushing forward. Every step counts.
              </Text>
            </View>
            <IconButton
              icon="add"
              onPress={handleAddFirstDream}
              variant="primary"
              size="md"
            />
          </View>
        </View>

        {mockDreams.map((dream) => (
          <DreamCard
            key={dream.id}
            dream={dream}
            onPress={handleDreamPress}
          />
        ))}

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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.grey[600],
    lineHeight: 22,
  },
  footer: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface[100],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.grey[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  addButton: {
    minWidth: 200,
  },
});

export default DreamsPage;