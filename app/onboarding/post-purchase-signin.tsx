/**
 * PostPurchaseSignIn Step - Authentication after successful purchase
 * 
 * This screen handles authentication after the user has successfully purchased
 * a subscription. It uses the existing LoginPage component but with a different
 * context and flow.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEntitlementsContext } from '../../contexts/EntitlementsContext';
import { updateSubscriptionStatus } from '../../utils/onboardingFlow';

const PostPurchaseSignInStep: React.FC = () => {
  const navigation = useNavigation();
  const { signInWithApple, signInWithGoogle, loading: authLoading, user } = useAuthContext();
  const { 
    customerInfo, 
    hasProAccess, 
    loading: entitlementsLoading, 
    linkRevenueCatUser, 
    storeBillingSnapshot,
    linking 
  } = useEntitlementsContext();

  const handleAppleSignIn = async () => {
    try {
      const result = await signInWithApple();
      
      if (result.success && user?.id) {
        // Link the RevenueCat user with the authenticated user
        const linkResult = await linkRevenueCatUser(user.id);
        
        if (linkResult.success && customerInfo) {
          // Store billing snapshot in Supabase
          const storeResult = await storeBillingSnapshot(customerInfo);
          
          if (storeResult.success) {
            // Update subscription status in AsyncStorage
            await updateSubscriptionStatus(true);
            
            // Navigate to main app
            navigation.navigate('Main' as never);
          } else {
            Alert.alert('Error', storeResult.error || 'Failed to save subscription data');
          }
        } else {
          Alert.alert('Error', linkResult.error || 'Failed to link subscription account');
        }
      } else {
        Alert.alert('Sign In Failed', result.error || 'Something went wrong');
      }
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message || 'Something went wrong');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      
      if (result.success && user?.id) {
        // Link the RevenueCat user with the authenticated user
        const linkResult = await linkRevenueCatUser(user.id);
        
        if (linkResult.success && customerInfo) {
          // Store billing snapshot in Supabase
          const storeResult = await storeBillingSnapshot(customerInfo);
          
          if (storeResult.success) {
            // Update subscription status in AsyncStorage
            await updateSubscriptionStatus(true);
            
            // Navigate to main app
            navigation.navigate('Main' as never);
          } else {
            Alert.alert('Error', storeResult.error || 'Failed to save subscription data');
          }
        } else {
          Alert.alert('Error', linkResult.error || 'Failed to link subscription account');
        }
      } else {
        Alert.alert('Sign In Failed', result.error || 'Something went wrong');
      }
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message || 'Something went wrong');
    }
  };


  const handleSkipForNow = async () => {
    // Update subscription status in AsyncStorage
    await updateSubscriptionStatus(true);
    
    // Navigate to main app as anonymous user
    navigation.navigate('Main' as never);
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        showProgress={false}
        showBackButton={true} // Allow going back to intro
        onBack={() => navigation.navigate('Intro' as never)}
      />
      
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
      </View>

      <View style={styles.footer}>
        <Button
          title="Sign in with Apple"
          icon="apple"
          onPress={handleAppleSignIn}
          variant="outline"
          disabled={authLoading || linking || entitlementsLoading}
          style={styles.button}
        />
        
        <Button
          title="Sign in with Google"
          icon="google"
          onPress={handleGoogleSignIn}
          variant="outline"
          disabled={authLoading || linking || entitlementsLoading}
          style={styles.button}
        />
        
        <Button
          title="Continue without signing in"
          onPress={handleSkipForNow}
          variant="outline"
          disabled={authLoading || linking || entitlementsLoading}
          style={styles.skipButton}
        />
        
        <Text style={styles.termsText}>
          You can always sign in later from your profile settings
        </Text>
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
    paddingTop: theme.spacing.xl,
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
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  skipButton: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  termsText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[500],
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PostPurchaseSignInStep;
