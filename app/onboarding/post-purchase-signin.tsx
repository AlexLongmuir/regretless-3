/**
 * PostPurchaseSignIn Step - Authentication after successful purchase
 * 
 * This screen handles authentication after the user has successfully purchased
 * a subscription. It uses the existing LoginPage component but with a different
 * context and flow.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEntitlementsContext } from '../../contexts/EntitlementsContext';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { updateSubscriptionStatus, getPendingOnboardingDream, clearPendingOnboardingDream } from '../../utils/onboardingFlow';
import { createDreamFromOnboardingData } from '../../utils/onboardingDreamCreation';
import { supabaseClient } from '../../lib/supabaseClient';
import { trackEvent } from '../../lib/mixpanel';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer';

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

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'post_purchase_signin'
      });
    }, [])
  );

  // Function to create dream from onboarding data (uses shared utility)
  const createDreamFromOnboarding = async (token: string) => {
    // Check if we have the required data from context
    if (!onboardingState.generatedAreas.length || !onboardingState.generatedActions.length) {
      console.log('⚠️ [ONBOARDING] No generated areas or actions found in context, skipping dream creation');
      return null;
    }

    if (!user?.id) {
      console.log('⚠️ [ONBOARDING] No user ID available, skipping dream creation');
      return null;
    }

    // Use shared creation function
    return await createDreamFromOnboardingData(
      {
        name: onboardingState.name,
        answers: onboardingState.answers,
        dreamImageUrl: onboardingState.dreamImageUrl,
        generatedAreas: onboardingState.generatedAreas,
        generatedActions: onboardingState.generatedActions,
      },
      token,
      user.id
    );
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
            if (session?.access_token && user?.id) {
              // Try to create from context first (immediate flow)
              let dreamId = await createDreamFromOnboarding(session.access_token);
              
              // If context doesn't have data, try AsyncStorage as fallback
              if (!dreamId) {
                console.log('🔍 [ONBOARDING] No data in context, checking AsyncStorage...');
                const pendingData = await getPendingOnboardingDream();
                if (pendingData && pendingData.generatedAreas.length > 0 && pendingData.generatedActions.length > 0) {
                  dreamId = await createDreamFromOnboardingData(
                    {
                      name: pendingData.name,
                      answers: pendingData.answers,
                      dreamImageUrl: pendingData.dreamImageUrl,
                      generatedAreas: pendingData.generatedAreas,
                      generatedActions: pendingData.generatedActions,
                    },
                    session.access_token,
                    user.id
                  );
                  if (dreamId) {
                    await clearPendingOnboardingDream();
                  }
                }
              }
              
              if (dreamId) {
                console.log('🎉 [ONBOARDING] Dream creation completed successfully!');
              } else {
                console.log('⚠️ [ONBOARDING] Dream creation skipped or failed');
              }
            } else {
              console.log('⚠️ [ONBOARDING] No auth token or user ID available for dream creation');
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
            if (session?.access_token && user?.id) {
              // Try to create from context first (immediate flow)
              let dreamId = await createDreamFromOnboarding(session.access_token);
              
              // If context doesn't have data, try AsyncStorage as fallback
              if (!dreamId) {
                console.log('🔍 [ONBOARDING] No data in context, checking AsyncStorage...');
                const pendingData = await getPendingOnboardingDream();
                if (pendingData && pendingData.generatedAreas.length > 0 && pendingData.generatedActions.length > 0) {
                  dreamId = await createDreamFromOnboardingData(
                    {
                      name: pendingData.name,
                      answers: pendingData.answers,
                      dreamImageUrl: pendingData.dreamImageUrl,
                      generatedAreas: pendingData.generatedAreas,
                      generatedActions: pendingData.generatedActions,
                    },
                    session.access_token,
                    user.id
                  );
                  if (dreamId) {
                    await clearPendingOnboardingDream();
                  }
                }
              }
              
              if (dreamId) {
                console.log('🎉 [ONBOARDING] Dream creation completed successfully!');
              } else {
                console.log('⚠️ [ONBOARDING] Dream creation skipped or failed');
              }
            } else {
              console.log('⚠️ [ONBOARDING] No auth token or user ID available for dream creation');
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
      Alert.alert('Sign In Error', sanitizeErrorMessage(error, 'Something went wrong. Please try again.'));
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
      Alert.alert('Restore Error', sanitizeErrorMessage(error, 'Something went wrong. Please try again.'));
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Create Restore button matching IconButton style
  const restoreButton = (
    <TouchableOpacity
      onPress={handleRestore}
      style={styles.restoreButtonWrapper}
    >
      <BlurView 
        intensity={100} 
        tint="light" 
        style={styles.restoreButton}
      >
        <Text style={styles.restoreText}>Restore</Text>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <OnboardingHeader onBack={handleBack} rightElement={restoreButton} />
      
      <View style={styles.content}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>
          Log in to save your progress and sync across devices
        </Text>

        <Button
          title="Continue with Apple"
          icon="apple"
          onPress={handleAppleSignIn}
          variant="secondary"
          disabled={authLoading || linking || entitlementsLoading || isCreatingDream}
          style={styles.button}
        />
        
        <Button
          title="Continue with Google"
          icon="google"
          onPress={handleGoogleSignIn}
          variant="secondary"
          disabled={authLoading || linking || entitlementsLoading || isCreatingDream}
          style={styles.button}
        />

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
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.subheadline,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.subheadline,
    color: theme.colors.grey[600],
    textAlign: 'left',
    marginBottom: theme.spacing.xl,
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
  restoreButtonWrapper: {
    width: 80,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  restoreButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    paddingHorizontal: theme.spacing.sm,
  },
  restoreText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[700],
  },
  button: {
    width: '100%',
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.xl,
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
