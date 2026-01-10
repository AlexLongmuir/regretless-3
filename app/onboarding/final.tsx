/**
 * Final Step - Congratulations, your custom plan is ready!
 * 
 * Shows final results with AreaChips and completion animation
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { savePendingOnboardingDream } from '../../utils/onboardingFlow';
import { trackEvent } from '../../lib/mixpanel';
import { useFocusEffect } from '@react-navigation/native';

const FinalStep: React.FC = () => {
  const navigation = useNavigation();
  const { state } = useOnboardingContext();

  // Save onboarding data when user reaches final step
  // This ensures the dream can be created even if user signs in from a different entry point
  useEffect(() => {
    const saveOnboardingData = async () => {
      // Only save if we have the required data
      if (state.generatedAreas.length > 0 && state.generatedActions.length > 0) {
        try {
          await savePendingOnboardingDream({
            name: state.name,
            answers: state.answers,
            dreamImageUrl: state.dreamImageUrl,
            generatedAreas: state.generatedAreas,
            generatedActions: state.generatedActions,
          });
          console.log('✅ [ONBOARDING] Saved onboarding data for future dream creation');
        } catch (error) {
          console.error('❌ [ONBOARDING] Failed to save onboarding data:', error);
        }
      }
    };

    saveOnboardingData();
  }, []); // Only run once on mount

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'review'
      });
    }, [])
  );

  const handleContinue = () => {
    trackEvent('onboarding_completed', {
      total_areas: state.generatedAreas.length,
      total_actions: state.generatedActions.length,
    });
    // Navigate to trial offer flow
    navigation.navigate('TrialOffer' as never);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Helper function to get action count for each area
  const getActionCountForArea = (areaId: string) => {
    return state.generatedActions.filter(action => action.area_id === areaId).length;
  };

  // Helper function to get the goal end date
  const getGoalEndDate = () => {
    // Calculate end date based on time commitment (default to 3 months from now)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    
    // Format as "Month Day, Year" (e.g., "March 15, 2024")
    return endDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };



  return (
    <View style={styles.container}>
      <OnboardingHeader onBack={handleBack} />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerContainer}>
          {/* Dream Image */}
          {state.dreamImageUrl && (
            <View style={styles.dreamImageContainer}>
              <Image 
                source={{ uri: state.dreamImageUrl }} 
                style={styles.dreamImage}
                contentFit="cover"
                transition={200}
              />
            </View>
          )}
          <Text style={styles.title}>Congratulations, your custom plan is ready!</Text>
        </View>

        <View style={styles.goalContainer}>
          <Text style={styles.goalLabel}>You're all set to achieve</Text>
          <Text style={styles.goalTextGold}>{state.answers[2] || 'Your Dream'}</Text>
          <Text style={styles.goalDateText}>by {getGoalEndDate()}</Text>
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Your Personalized Plan</Text>
          <Text style={styles.summarySubtitle}>
            We've created {state.generatedActions.length} actions across {state.generatedAreas.length} focus areas
          </Text>
          
          <View style={styles.areasList}>
            {state.generatedAreas.map((area, index) => {
              const actionCount = getActionCountForArea(area.id);
              return (
                <View key={area.id} style={styles.areaItem}>
                  <View style={styles.areaHeader}>
                    <Text style={styles.areaEmoji}>{area.icon}</Text>
                    <View style={styles.areaInfo}>
                      <Text style={styles.areaTitle}>{area.title}</Text>
                      <Text style={styles.areaActionCount}>
                        {actionCount} action{actionCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="black"
          style={styles.continueButton}
        />
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 30,
    fontWeight: theme.typography.fontWeight.semibold as any,
    lineHeight: 36,
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  dreamImageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  dreamImage: {
    width: 240,
    height: 240,
    borderRadius: 16,
    backgroundColor: theme.colors.grey[200],
  },
  goalContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  goalLabel: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 18,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.sm,
  },
  goalTextGold: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 20,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.gold,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  goalDateText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 16,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.footnote,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  areasList: {
    marginBottom: theme.spacing.lg,
  },
  areaItem: {
    marginBottom: theme.spacing.md,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  areaEmoji: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  areaInfo: {
    flex: 1,
  },
  areaTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    marginBottom: 2,
  },
  areaActionCount: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.footnote,
    color: theme.colors.grey[600],
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  continueButton: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
});

export default FinalStep;
