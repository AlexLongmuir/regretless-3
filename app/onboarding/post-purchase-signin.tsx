/**
 * PostPurchaseSignIn Step - Authentication after successful purchase
 * 
 * This screen handles authentication after the user has successfully purchased
 * a subscription. It uses the existing LoginPage component but with a different
 * context and flow.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { OnboardingHeader } from '../../components/onboarding';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEntitlementsContext } from '../../contexts/EntitlementsContext';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { updateSubscriptionStatus } from '../../utils/onboardingFlow';
import { upsertDream, upsertAreas, upsertActions, activateDream } from '../../frontend-services/backend-bridge';
import { supabaseClient } from '../../lib/supabaseClient';
import { supabaseServerAuth } from '../../backend/lib/supabaseServer';

const PostPurchaseSignInStep: React.FC = () => {
  const navigation = useNavigation();
  const { signInWithApple, signInWithGoogle, signOut, loading: authLoading, user, isAuthenticated } = useAuthContext();
  const { state: onboardingState } = useOnboardingContext();
  const { 
    customerInfo, 
    hasProAccess, 
    loading: entitlementsLoading, 
    linkRevenueCatUser, 
    storeBillingSnapshot,
    restorePurchases,
    linking 
  } = useEntitlementsContext();

  const [isCreatingDream, setIsCreatingDream] = useState(false);

  // Function to create dream from onboarding data
  const createDreamFromOnboarding = async (token: string) => {
    try {
      console.log('🎯 [ONBOARDING] Starting dream creation from onboarding data...');
      
      // Check if we have the required data
      if (!onboardingState.generatedAreas.length || !onboardingState.generatedActions.length) {
        console.log('⚠️ [ONBOARDING] No generated areas or actions found, skipping dream creation');
        return null;
      }

      // Map onboarding answers to dream parameters
      const dreamTitle = onboardingState.answers[2] || 'My Dream'; // Main dream answer
      const dreamBaseline = onboardingState.answers[1] || ''; // Current life answer
      const dreamObstacles = onboardingState.answers[10] || ''; // Obstacles answer (ID 10)
      const dreamEnjoyment = onboardingState.answers[11] || ''; // Motivation answer (ID 11)
      const timeCommitment = onboardingState.answers[3] || ''; // Time commitment answer (ID 3)

      // Parse time commitment from "0h 30m" format to JSON
      let timeCommitmentJson = null;
      if (timeCommitment) {
        const match = timeCommitment.match(/(\d+)h?\s*(\d+)?m?/);
        if (match) {
          const hours = parseInt(match[1]) || 0;
          const minutes = parseInt(match[2]) || 0;
          timeCommitmentJson = { hours, minutes };
        }
      }

      // Create the dream
      console.log('🎯 [ONBOARDING] Creating dream:', dreamTitle);
      const dreamResponse = await upsertDream({
        title: dreamTitle,
        image_url: onboardingState.dreamImageUrl,
        baseline: dreamBaseline,
        obstacles: dreamObstacles,
        enjoyment: dreamEnjoyment,
        time_commitment: timeCommitmentJson,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 3 months from now
      }, token);

      console.log('✅ [ONBOARDING] Dream created with ID:', dreamResponse.id);

      // Save user's name to profile
      if (onboardingState.name) {
        console.log('🎯 [ONBOARDING] Saving user name to profile...');
        try {
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session?.access_token) {
            const sb = supabaseServerAuth(session.access_token);
            const { error: profileError } = await sb
              .from('profiles')
              .update({ name: onboardingState.name })
              .eq('user_id', user?.id);
            
            if (profileError) {
              console.error('❌ [ONBOARDING] Failed to save name to profile:', profileError);
            } else {
              console.log('✅ [ONBOARDING] User name saved to profile');
            }
          }
        } catch (error) {
          console.error('❌ [ONBOARDING] Error saving name to profile:', error);
        }
      }

      // Save onboarding responses
      console.log('🎯 [ONBOARDING] Saving onboarding responses...');
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.access_token) {
          const sb = supabaseServerAuth(session.access_token);
          
          // Prepare responses for insertion
          const responses = Object.entries(onboardingState.answers)
            .filter(([_, answer]) => answer && answer.trim()) // Only non-empty answers
            .map(([questionId, answer]) => ({
              user_id: user?.id,
              question_id: parseInt(questionId),
              answer: answer.trim()
            }));

          if (responses.length > 0) {
            const { error: responsesError } = await sb
              .from('onboarding_responses')
              .upsert(responses, { 
                onConflict: 'user_id,question_id',
                ignoreDuplicates: false 
              });
            
            if (responsesError) {
              console.error('❌ [ONBOARDING] Failed to save onboarding responses:', responsesError);
            } else {
              console.log('✅ [ONBOARDING] Onboarding responses saved:', responses.length);
            }
          }
        }
      } catch (error) {
        console.error('❌ [ONBOARDING] Error saving onboarding responses:', error);
      }

      // Save areas
      console.log('🎯 [ONBOARDING] Saving areas...');
      const areasResponse = await upsertAreas({
        dream_id: dreamResponse.id,
        areas: onboardingState.generatedAreas
      }, token);

      console.log('✅ [ONBOARDING] Areas saved:', areasResponse.areas.length);

      // Save actions
      console.log('🎯 [ONBOARDING] Saving actions...');
      const actionsResponse = await upsertActions({
        dream_id: dreamResponse.id,
        actions: onboardingState.generatedActions
      }, token);

      console.log('✅ [ONBOARDING] Actions saved:', actionsResponse.actions.length);

      // Activate dream and schedule actions
      console.log('🎯 [ONBOARDING] Activating dream and scheduling actions...');
      const activationResponse = await activateDream({
        dream_id: dreamResponse.id
      }, token);

      if (activationResponse.success) {
        console.log('✅ [ONBOARDING] Dream activated and actions scheduled successfully!');
        return dreamResponse.id;
      } else {
        console.error('❌ [ONBOARDING] Dream activation failed:', activationResponse.error);
        return dreamResponse.id; // Still return dream ID even if scheduling failed
      }

    } catch (error) {
      console.error('❌ [ONBOARDING] Failed to create dream from onboarding data:', error);
      return null;
    }
  };

  // Test Apple Sign In availability on component mount
  useEffect(() => {
    const testAppleSignIn = async () => {
      try {
        const AppleAuth = await import('expo-apple-authentication');
        const AppleAuthentication = AppleAuth.default;
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        console.log('Apple Sign In availability test:', isAvailable);
        
        // Additional diagnostic info
        console.log('=== Apple Sign In Diagnostics ===');
        console.log('Bundle ID:', Constants.expoConfig?.ios?.bundleIdentifier);
        console.log('App Name:', Constants.expoConfig?.name);
        console.log('Platform:', Platform.OS);
        console.log('Platform Version:', Platform.Version);
        console.log('Is Device:', Platform.OS === 'ios');
        console.log('Expo Config:', JSON.stringify(Constants.expoConfig?.ios, null, 2));
        console.log('================================');
      } catch (error) {
        console.log('Apple Sign In not available:', error);
      }
    };
    testAppleSignIn();
  }, []);

  // Auto-navigate when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('User authenticated in PostPurchaseSignIn, starting robust linking...');
      
      const handleRobustLinking = async () => {
        try {
          // Wait a moment for EntitlementsContext to potentially handle linking
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if linking already happened
          if (customerInfo && !customerInfo.originalAppUserId?.startsWith('$RCAnonymousID')) {
            console.log('✅ RevenueCat already linked, proceeding...');
          } else {
            console.log('🔗 Manual linking fallback triggered...');
            // Manual linking as fallback
            const linkResult = await linkRevenueCatUser(user.id);
            
            if (linkResult.success && customerInfo) {
              console.log('✅ Manual linking successful, storing billing snapshot...');
              const storeResult = await storeBillingSnapshot(customerInfo);
              
              if (!storeResult.success) {
                console.error('❌ Failed to store billing snapshot:', storeResult.error);
                Alert.alert(
                  'Subscription Already Redeemed',
                  storeResult.error || 'This subscription has already been redeemed by another account.',
                  [
                    {
                      text: 'Sign Out',
                      onPress: () => {
                        // Sign out and go back to login
                        signOut();
                      }
                    },
                    {
                      text: 'OK',
                      style: 'default'
                    }
                  ]
                );
                return; // Don't proceed to main app
              }
            } else {
              console.log('⚠️ Manual linking failed, but proceeding anyway...');
            }
          }
          
          // Update subscription status in AsyncStorage
          await updateSubscriptionStatus(true);
          
          // Create dream from onboarding data
          setIsCreatingDream(true);
          try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.access_token) {
              const dreamId = await createDreamFromOnboarding(session.access_token);
              if (dreamId) {
                console.log('🎉 [ONBOARDING] Dream creation completed successfully!');
              } else {
                console.log('⚠️ [ONBOARDING] Dream creation skipped or failed');
              }
            } else {
              console.log('⚠️ [ONBOARDING] No auth token available for dream creation');
            }
          } catch (error) {
            console.error('❌ [ONBOARDING] Error during dream creation:', error);
          } finally {
            setIsCreatingDream(false);
          }
          
          // Navigate to main app
          navigation.navigate('Main' as never);
        } catch (error) {
          console.error('Error in robust linking:', error);
          // Still navigate even if linking fails
          await updateSubscriptionStatus(true);
          
          // Create dream from onboarding data even if linking failed
          setIsCreatingDream(true);
          try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.access_token) {
              const dreamId = await createDreamFromOnboarding(session.access_token);
              if (dreamId) {
                console.log('🎉 [ONBOARDING] Dream creation completed successfully!');
              } else {
                console.log('⚠️ [ONBOARDING] Dream creation skipped or failed');
              }
            } else {
              console.log('⚠️ [ONBOARDING] No auth token available for dream creation');
            }
          } catch (dreamError) {
            console.error('❌ [ONBOARDING] Error during dream creation:', dreamError);
          } finally {
            setIsCreatingDream(false);
          }
          
          navigation.navigate('Main' as never);
        }
      };
      
      handleRobustLinking();
    }
  }, [isAuthenticated, user?.id, navigation, linkRevenueCatUser, storeBillingSnapshot, customerInfo]);

  const handleAppleSignIn = async () => {
    try {
      const result = await signInWithApple();
      
      if (result.success) {
        console.log('Apple Sign In successful');
        // The linking will be handled by the useEffect when user.id becomes available
        // No need to do anything here - the auth state change will trigger the linking
      } else {
        // Only show error if sign-in actually failed
        const errorMessage = result.error || 'Apple Sign In failed. Please try again or use Google Sign In.';
        Alert.alert('Sign In Failed', errorMessage);
      }
    } catch (error: any) {
      console.error('Apple Sign In error:', error);
      
      // Check if this is a configuration issue
      if (error.message?.includes('authorization attempt failed')) {
        Alert.alert(
          'Apple Sign In Not Available', 
          'Apple Sign In is not properly configured. Please use Google Sign In instead.',
          [
            { text: 'Try Google Sign In', onPress: handleGoogleSignIn },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Sign In Error', 'Apple Sign In is not available. Please try Google Sign In instead.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        console.log('Google Sign In successful');
        // The linking will be handled by the useEffect when user.id becomes available
        // No need to do anything here - the auth state change will trigger the linking
      } else {
        // Only show error if sign-in actually failed
        const errorMessage = result.error || 'Google Sign In failed. Please try again or use Apple Sign In.';
        Alert.alert('Sign In Failed', errorMessage);
      }
    } catch (error: any) {
      console.error('Google Sign In error:', error);
      Alert.alert('Sign In Error', error.message || 'Something went wrong');
    }
  };



  const handleRestore = async () => {
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        // User already has pro access, navigate to main app
        navigation.navigate('Main' as never);
      } else {
        Alert.alert('No Purchases', result.error || 'No active subscriptions found.');
      }
    } catch (error: any) {
      Alert.alert('Restore Error', error.message || 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow_left"
          onPress={() => navigation.navigate('Intro' as never)}
          variant="ghost"
          size="md"
          style={styles.backButton}
        />
        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Almost There!</Text>
        <Text style={styles.subtitle}>
          Sign in to save your progress and sync across devices
        </Text>
        
        <View style={styles.benefitsContainer}>
          <View style={styles.benefit}>
            <Text style={styles.benefitText}>✓ Sync your dreams across devices</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitText}>✓ Backup your progress automatically</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitText}>✓ Access premium features</Text>
          </View>
        </View>

        {hasProAccess && (
          <View style={styles.subscriptionStatus}>
            <Text style={styles.statusText}>
              ✓ Pro subscription active
            </Text>
          </View>
        )}

        {isCreatingDream && (
          <View style={styles.dreamCreationStatus}>
            <Text style={styles.dreamCreationText}>
              🎯 Creating your personalized dream plan...
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleAppleSignIn}
          disabled={authLoading || linking || entitlementsLoading || isCreatingDream}
          style={[styles.appleButton, (authLoading || linking || entitlementsLoading || isCreatingDream) && styles.buttonDisabled]}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleGoogleSignIn}
          disabled={authLoading || linking || entitlementsLoading || isCreatingDream}
          style={[styles.googleButton, (authLoading || linking || entitlementsLoading || isCreatingDream) && styles.buttonDisabled]}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground, // Grey background like create flow
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 100 + theme.spacing.xl, // Add top padding to account for fixed header
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  benefitsContainer: {
    marginBottom: theme.spacing.xl,
    width: '100%',
  },
  benefit: {
    marginBottom: theme.spacing.sm,
  },
  benefitText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[700],
    textAlign: 'center',
  },
  subscriptionStatus: {
    backgroundColor: theme.colors.success[50],
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xl,
  },
  statusText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.success[700],
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing['3xl'],
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  restoreButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  restoreText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[500],
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  appleButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#000000',
    borderRadius: 8,
    marginBottom: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  googleButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DADCE0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.system,
  },
  googleButtonText: {
    color: '#3C4043',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.system,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dreamCreationStatus: {
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
  },
  dreamCreationText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.primary[700],
    textAlign: 'center',
  },
});

export default PostPurchaseSignInStep;
