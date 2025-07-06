
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Image, Pressable, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../utils/theme';
import { IconButton } from '../components/IconButton';
import { ProgressEntryCard } from '../components/ProgressEntryCard';
import { ProgressGalleryItem } from '../components/ProgressGalleryItem';

const { width: screenWidth } = Dimensions.get('window');

interface ProgressPageProps {
  route?: {
    params?: {
      dreamId?: string;
      title?: string;
      progressPercentage?: number;
      streakCount?: number;
      currentDay?: number;
      totalDays?: number;
      backgroundImages?: string[];
      startDate?: string;
      endDate?: string;
    };
  };
  navigation?: {
    goBack?: () => void;
    navigate?: (screen: string, params?: any) => void;
  };
}

interface ProgressEntry {
  date: string;
  images: string[];
  text: string;
}

const ProgressPage: React.FC<ProgressPageProps> = ({ route, navigation }) => {
  const params = route?.params || {};
  const { 
    title = 'Sample Dream',
    progressPercentage = 45,
    streakCount = 12,
    currentDay = 45,
    totalDays = 90,
    backgroundImages = [],
    startDate = '2024-10-01',
    endDate = '2024-12-30'
  } = params;

  const [selectedEntry, setSelectedEntry] = useState<ProgressEntry | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Mock progress entries data
  const [progressEntries, setProgressEntries] = useState<Record<string, ProgressEntry>>({
    '2024-12-25': {
      date: '2024-12-25',
      images: ['https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop'],
      text: 'Christmas practice session - worked on festive melodies.'
    },
    '2024-12-20': {
      date: '2024-12-20',
      images: [
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop'
      ],
      text: 'Great progress with finger positioning. Managed to play a simple melody!'
    },
    '2024-10-05': {
      date: '2024-10-05',
      images: ['https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=300&fit=crop'],
      text: 'Started learning basic chords today. Focused on C major and G major.'
    }
  });

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };


  // Generate grid of days (latest dates first)
  const generateDayGrid = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date();
    const actualEnd = current < end ? current : end;
    
    const days = [];
    const currentDate = new Date(start);
    
    while (currentDate <= actualEnd) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Reverse to show latest dates first
    return days.reverse();
  };

  const dayGrid = generateDayGrid();
  const gridItemWidth = (screenWidth - (theme.spacing.md * 2) - (theme.spacing.xs * 6)) / 7;

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };


  const handleDayPress = (date: Date, dayIndex: number) => {
    const dateString = formatDate(date);
    const entry = progressEntries[dateString];
    
    if (entry) {
      setSelectedEntry(entry);
      setSelectedDayIndex(dayIndex);
    } else {
      // Create new entry
      const newEntry: ProgressEntry = {
        date: dateString,
        images: [],
        text: ''
      };
      setSelectedEntry(newEntry);
      setSelectedDayIndex(dayIndex);
    }
  };

  const handleUpdateEntry = (updatedEntry: ProgressEntry) => {
    setProgressEntries(prev => ({
      ...prev,
      [updatedEntry.date]: updatedEntry
    }));
    setSelectedEntry(updatedEntry);
  };

  const handleDeleteEntry = (dateString: string) => {
    setProgressEntries(prev => {
      const updated = { ...prev };
      delete updated[dateString];
      return updated;
    });
    setSelectedEntry(null);
    setSelectedDayIndex(null);
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
            </View>

            <View style={styles.progressGallery}>
              <Text style={styles.galleryTitle}>Progress Gallery</Text>
              
              {(() => {
                const rows = [];
                const itemsPerRow = 7;
                
                for (let i = 0; i < dayGrid.length; i += itemsPerRow) {
                  const rowItems = dayGrid.slice(i, i + itemsPerRow);
                  const rowIndex = Math.floor(i / itemsPerRow);
                  
                  // Add the row
                  rows.push(
                    <View key={`row-${rowIndex}`} style={styles.dayGridRow}>
                      {rowItems.map((date, itemIndex) => {
                        const globalIndex = i + itemIndex;
                        const dateString = formatDate(date);
                        const entry = progressEntries[dateString];
                        const hasEntry = entry && entry.images.length > 0;
                        const isSelected = selectedDayIndex === globalIndex;
                        
                        return (
                          <ProgressGalleryItem
                            key={globalIndex}
                            date={date}
                            hasImage={hasEntry}
                            imageUri={hasEntry ? entry.images[0] : undefined}
                            isSelected={isSelected}
                            onPress={() => handleDayPress(date, globalIndex)}
                            size={gridItemWidth}
                          />
                        );
                      })}
                      
                      {/* Fill remaining slots in the row with empty space */}
                      {Array.from({ length: itemsPerRow - rowItems.length }).map((_, emptyIndex) => (
                        <View 
                          key={`empty-${emptyIndex}`} 
                          style={{ width: gridItemWidth, height: gridItemWidth }} 
                        />
                      ))}
                    </View>
                  );
                  
                  // Add the selected entry card after the row containing the selected item
                  if (selectedEntry && selectedDayIndex !== null) {
                    const selectedRowIndex = Math.floor(selectedDayIndex / itemsPerRow);
                    if (selectedRowIndex === rowIndex) {
                      rows.push(
                        <ProgressEntryCard
                          key={`entry-card-${rowIndex}`}
                          entry={selectedEntry}
                          onUpdate={handleUpdateEntry}
                          onDelete={handleDeleteEntry}
                          style={styles.selectedEntryCard}
                        />
                      );
                    }
                  }
                }
                
                return rows;
              })()}
            </View>
          </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    // No additional styles needed since it's positioned by flexDirection
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
    marginBottom: theme.spacing.md,
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
  progressGallery: {
    marginBottom: theme.spacing.lg,
  },
  galleryTitle: {
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[800],
    marginBottom: theme.spacing.md,
  },
  dayGridRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  selectedEntryCard: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
});

export default ProgressPage;