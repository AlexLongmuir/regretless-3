import React, { useMemo, useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Button } from '../components/Button'
import { useTheme } from '../contexts/ThemeContext'
import { Theme } from '../utils/theme'
import { BOTTOM_NAV_PADDING } from '../utils/bottomNavigation'
import { AchievementUnlockedSheet } from '../components/AchievementUnlockedSheet'
import { AchievementsSheet } from '../components/AchievementsSheet'
import { checkNewAchievements, getAchievements } from '../frontend-services/backend-bridge'
import { supabaseClient } from '../lib/supabaseClient'
import type { AchievementUnlockResult, Achievement, UserAchievement } from '../backend/database/types'

export default function DreamCompletedPage() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<any>()
  const route = useRoute()
  const params = route.params as {
    dreamId?: string
    dreamTitle?: string
    completedAt?: string
    totalActions?: number
    totalAreas?: number
  }
  
  // Achievements state
  const [newAchievements, setNewAchievements] = useState<AchievementUnlockResult[]>([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [achievements, setAchievements] = useState<(Achievement & { user_progress?: UserAchievement | null })[]>([]);
  const [showAchievementsSheet, setShowAchievementsSheet] = useState(false);

  // Check for new achievements when dream is completed
  // TRIGGER: This modal is triggered when a user completes a dream (via DreamCompletedPage).
  // The modal appears above all other UI (as a Modal component with transparent overlay).
  // Achievements are checked automatically whenever checkNewAchievements() is called,
  // which can happen:
  // - When a dream is completed (this page)
  // - When explicitly called from other parts of the app (e.g., AccountPage for testing)
  // - The modal will appear whenever new achievements are found, regardless of where checkNewAchievements() is called
  useEffect(() => {
    const checkAchievements = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) return;
        
        const achievementsResponse = await checkNewAchievements(session.access_token);
        if (achievementsResponse.success && achievementsResponse.data.new_achievements.length > 0) {
          setNewAchievements(achievementsResponse.data.new_achievements);
          setShowAchievementModal(true);
        }
      } catch (error) {
        console.error('Error checking achievements:', error);
      }
    };
    
    checkAchievements();
  }, []);

  const handleDone = () => {
    // Navigate back to dreams list
    navigation.navigate('Tabs', { activeTab: 'Dreams' })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString()
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>🎉</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.dreamTitle}>{params.dreamTitle || 'Your Dream'}</Text>
          <Text style={styles.completionTitle}>Dream Completed!</Text>
          
          {/* Completion Date */}
          <Text style={styles.completionDate}>
            Completed on {formatDate(params.completedAt)}
          </Text>
          
          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{params.totalAreas || 0}</Text>
              <Text style={styles.statLabel}>Areas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{params.totalActions || 0}</Text>
              <Text style={styles.statLabel}>Actions</Text>
            </View>
          </View>
        </View>

        {/* Celebration Message */}
        <View style={styles.messageSection}>
          <Text style={styles.messageTitle}>Congratulations! 🎊</Text>
          <Text style={styles.messageText}>
            You've successfully completed your dream! This is a huge achievement that shows your dedication and commitment to your goals.
          </Text>
          <Text style={styles.messageText}>
            Take a moment to celebrate this milestone and consider what you've learned along the way.
          </Text>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsSection}>
          <Text style={styles.sectionTitle}>What's Next?</Text>
          <View style={styles.nextStepItem}>
            <Text style={styles.nextStepNumber}>1</Text>
            <Text style={styles.nextStepText}>Reflect on what you've accomplished</Text>
          </View>
          <View style={styles.nextStepItem}>
            <Text style={styles.nextStepNumber}>2</Text>
            <Text style={styles.nextStepText}>Share your success with others</Text>
          </View>
          <View style={styles.nextStepItem}>
            <Text style={styles.nextStepNumber}>3</Text>
            <Text style={styles.nextStepText}>Start planning your next dream</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Sticky bottom button */}
      <View style={styles.bottomButton}>
        <Button 
          title="View Dreams" 
          variant="black"
          onPress={handleDone}
          style={{ borderRadius: theme.radius.xl }}
        />
      </View>

      <AchievementUnlockedSheet
        visible={showAchievementModal}
        achievements={newAchievements}
        onClose={() => {
          setShowAchievementModal(false);
          setNewAchievements([]);
        }}
        onViewAchievements={async () => {
          setShowAchievementModal(false);
          setNewAchievements([]);
          // Load achievements and open achievements sheet
          try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.access_token) {
              const response = await getAchievements(session.access_token);
              if (response.success) {
                setAchievements(response.data.achievements);
                setShowAchievementsSheet(true);
              }
            }
          } catch (error) {
            console.error('Error loading achievements:', error);
          }
        }}
      />

      <AchievementsSheet
        visible={showAchievementsSheet}
        onClose={() => setShowAchievementsSheet(false)}
        achievements={achievements}
      />
    </View>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.page,
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
  },
  heroSection: {
    padding: 24,
    marginBottom: 8,
    alignItems: 'center',
  },
  dreamTitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  completionDate: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  messageSection: {
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  nextStepsSection: {
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[500],
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  nextStepText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  bottomButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: BOTTOM_NAV_PADDING,
    backgroundColor: theme.colors.background.page,
  },
})
