import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { useTheme } from '../contexts/ThemeContext'
import { Theme } from '../utils/theme'
import { useData } from '../contexts/DataContext'
import { supabaseClient } from '../lib/supabaseClient'
import type { Artifact } from '../frontend-services/backend-bridge'

export default function ArtifactSubmittedPage() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { theme, isDark } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { checkDreamCompletion } = useData()
  const [isDreamComplete, setIsDreamComplete] = useState(false)
  const [dreamId, setDreamId] = useState<string | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  
  const params = route.params as {
    occurrenceId?: string
    actionTitle?: string
    dreamTitle?: string
    areaName?: string
    areaEmoji?: string
    note?: string
    artifacts?: Artifact[]
    aiRating?: number
    aiFeedback?: string
  }

  // Initialize artifacts from params
  useEffect(() => {
    if (params.artifacts) {
      setArtifacts(params.artifacts)
    }
  }, [params.artifacts])

  // Remove photo upload handlers - no longer needed

  // Check if dream is complete when component mounts
  useEffect(() => {
    const checkCompletion = async () => {
      if (params.occurrenceId) {
        try {
          // Get dream ID from occurrence
          const { data: occurrenceData } = await supabaseClient
            .from('action_occurrences')
            .select(`
              dream_id,
              actions!inner(
                areas!inner(
                  dreams!inner(id, title, completed_at)
                )
              )
            `)
            .eq('id', params.occurrenceId)
            .single();
            
          if (occurrenceData?.actions?.[0]?.areas?.[0]?.dreams?.[0]) {
            const dream = occurrenceData.actions[0].areas[0].dreams[0];
            const dreamId = dream.id;
            setDreamId(dreamId);
            
            // Check if dream is complete
            const isComplete = await checkDreamCompletion(dreamId);
            setIsDreamComplete(isComplete);
          }
        } catch (error) {
          console.error('Error checking dream completion:', error);
        }
      }
    };
    
    checkCompletion();
  }, [params.occurrenceId, checkDreamCompletion]);

  const handleDone = () => {
    if (isDreamComplete && dreamId) {
      // Navigate to dream completion page
      navigation.navigate('DreamCompleted', {
        dreamId: dreamId,
        dreamTitle: params.dreamTitle,
        completedAt: new Date().toISOString(),
        // Note: We could fetch total actions/areas if needed
      });
    } else {
      // Navigate back to the action occurrence page
      navigation.goBack();
    }
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const DifficultyBars = ({ difficulty }: { difficulty: string }) => {
    const getBarCount = (diff: string) => {
      switch (diff) {
        case 'easy': return 1
        case 'medium': return 2
        case 'hard': return 3
        default: return 1
      }
    }

    const getBarColor = (diff: string) => {
      switch (diff) {
        case 'easy': return theme.colors.difficulty.easy
        case 'medium': return theme.colors.difficulty.medium
        case 'hard': return theme.colors.difficulty.hard
        default: return theme.colors.difficulty.easy
      }
    }

    const barCount = getBarCount(difficulty)
    const barColor = getBarColor(difficulty)

    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 12 }}>
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            style={{
              width: 3,
              height: bar * 2 + 4,
              backgroundColor: bar <= barCount ? barColor : theme.colors.disabled.inactive,
              borderRadius: 1.5
            }}
          />
        ))}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="close"
            onPress={() => navigation.goBack()}
            variant="secondary"
            size="md"
          />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Action Complete</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.dreamTitle}>{params.dreamTitle || 'My Dream'}</Text>
            <Text style={styles.areaTitle}>{params.areaName || 'Area'}</Text>
            <Text style={styles.actionTitle}>{params.actionTitle || 'Action'}</Text>
            
            {/* Due Date */}
            <Text style={styles.detailLabel}>Completed on {new Date().toLocaleDateString()}</Text>
            
            {/* Details Row */}
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={theme.colors.icon.default} />
                <Text style={styles.detailValue}>1 hr</Text>
              </View>
              <View style={styles.detailItem}>
                <DifficultyBars difficulty="medium" />
                <Text style={styles.detailValue}>Medium</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="refresh-outline" size={16} color={theme.colors.icon.default} />
                <Text style={styles.detailValue}>3 days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Submitted Content */}
        {((artifacts.length > 0) || params.note) && (
          <View style={styles.submittedContent}>
            <Text style={styles.sectionTitle}>What You Submitted</Text>
            
            {params.note && (
              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>Note:</Text>
                <Text style={styles.noteText}>{params.note}</Text>
              </View>
            )}

            {artifacts.length > 0 && (
              <View style={styles.photosSection}>
                <Text style={styles.photosLabel}>Photos ({artifacts.length}):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                  {artifacts.map((artifact) => (
                    <Image
                      key={artifact.id}
                      source={{ uri: artifact.signed_url }}
                      style={styles.submittedPhoto}
                      contentFit="cover"
                      transition={200}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
        </ScrollView>
        
        {/* Bottom button */}
        <View style={styles.bottomButton}>
          <Button 
            title="Done" 
            variant="black"
            onPress={handleDone}
            style={{ borderRadius: theme.radius.xl }}
          />
        </View>
      </SafeAreaView>
    </View>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  successIcon: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.status.completed,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 80,
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 100,
    color: theme.colors.text.inverse,
    fontWeight: 'bold',
  },
  heroSection: {
    padding: 24,
    marginBottom: 8,
  },
  heroContent: {
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  dreamTitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'left',
    marginBottom: 4,
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'left',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'left',
    marginBottom: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 16,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  submittedContent: {
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  noteSection: {
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  photosSection: {
    marginBottom: 16,
  },
  photosLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  photosScroll: {
    flexDirection: 'row',
  },
  submittedPhoto: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
  },
  bottomButton: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
})
