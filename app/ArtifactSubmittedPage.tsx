import React, { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '../components/Button'
import { AIRatingRing } from '../components'
import { theme } from '../utils/theme'
import { BOTTOM_NAV_PADDING } from '../utils/bottomNavigation'
import { useData } from '../contexts/DataContext'
import { supabaseClient } from '../lib/supabaseClient'
import type { Artifact } from '../frontend-services/backend-bridge'

export default function ArtifactSubmittedPage() {
  const navigation = useNavigation<any>()
  const route = useRoute()
  const { checkDreamCompletion } = useData()
  const [isDreamComplete, setIsDreamComplete] = useState(false)
  const [dreamId, setDreamId] = useState<string | null>(null)
  
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

  // Helper function to derive category from rating
  const getCategoryFromRating = (rating: number): 'okay' | 'good' | 'very_good' | 'excellent' => {
    if (rating >= 90) return 'excellent';
    if (rating >= 75) return 'very_good';
    if (rating >= 50) return 'good';
    return 'okay';
  };

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return theme.colors.difficulty.easy
      case 'medium': return theme.colors.difficulty.medium
      case 'hard': return theme.colors.difficulty.hard
      default: return theme.colors.difficulty.easy
    }
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
                <Ionicons name="time-outline" size={16} color={theme.colors.grey[600]} />
                <Text style={styles.detailValue}>1 hr</Text>
              </View>
              <View style={styles.detailItem}>
                <DifficultyBars difficulty="medium" />
                <Text style={styles.detailValue}>Medium</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="refresh-outline" size={16} color={theme.colors.grey[600]} />
                <Text style={styles.detailValue}>3 days</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Review Section */}
        {params.aiRating !== null && params.aiRating !== undefined ? (
          <View style={styles.aiReviewSection}>
            <Text style={styles.sectionTitle}>AI Review</Text>
            <View style={styles.aiReviewContent}>
              <AIRatingRing 
                rating={params.aiRating} 
                category={getCategoryFromRating(params.aiRating)} 
                size={80} 
                strokeWidth={6} 
              />
              {params.aiFeedback && (
                <Text style={styles.aiFeedback}>{params.aiFeedback}</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.aiReviewSection}>
            <Text style={styles.sectionTitle}>AI Review & Potential Improvements</Text>
            <View style={styles.aiReviewContent}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>Okay</Text>
              </View>
              <View style={styles.improvementsList}>
                <Text style={styles.improvementItem}>1. 100-200 words</Text>
                <Text style={styles.improvementItem}>2. Key CTA</Text>
                <Text style={styles.improvementItem}>3. Something else</Text>
              </View>
            </View>
          </View>
        )}

        {/* Submitted Content */}
        {(params.artifacts && params.artifacts.length > 0) || params.note ? (
          <View style={styles.submittedContent}>
            <Text style={styles.sectionTitle}>What You Submitted</Text>
            
            {params.note && (
              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>Note:</Text>
                <Text style={styles.noteText}>{params.note}</Text>
              </View>
            )}

            {params.artifacts && params.artifacts.length > 0 && (
              <View style={styles.photosSection}>
                <Text style={styles.photosLabel}>Photos ({params.artifacts.length}):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                  {params.artifacts.map((artifact) => (
                    <Image
                      key={artifact.id}
                      source={{ uri: artifact.signed_url }}
                      style={styles.submittedPhoto}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
      
      {/* Sticky bottom button */}
      <View style={styles.bottomButton}>
        <Button 
          title="Done" 
          variant="black"
          onPress={handleDone}
          style={{ borderRadius: theme.radius.xl }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom button
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
    color: theme.colors.grey[600],
    textAlign: 'left',
    marginBottom: 4,
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.grey[700],
    textAlign: 'left',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginBottom: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.grey[900],
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
    color: theme.colors.grey[600],
  },
  aiReviewSection: {
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: 16,
  },
  aiReviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  aiFeedback: {
    fontSize: 14,
    color: theme.colors.black,
    textAlign: 'left',
    lineHeight: 20,
    flex: 1,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: theme.colors.disabled.inactive,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.card,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.grey[600],
    fontWeight: '600',
  },
  improvementsList: {
    flex: 1,
  },
  improvementItem: {
    fontSize: 16,
    color: theme.colors.grey[700],
    marginBottom: 4,
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
    color: theme.colors.grey[900],
    marginBottom: 8,
  },
  noteText: {
    fontSize: 16,
    color: theme.colors.grey[700],
    lineHeight: 22,
  },
  photosSection: {
    marginBottom: 16,
  },
  photosLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.grey[900],
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: BOTTOM_NAV_PADDING,
    backgroundColor: theme.colors.pageBackground,
  },
})
