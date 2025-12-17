/**
 * Trial Offer Step - Free trial offer with app preview
 * 
 * Shows app preview with iPhone frame and free trial offer
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { useEntitlementsContext } from '../../contexts/EntitlementsContext';
import { trackEvent } from '../../lib/mixpanel';
import { sanitizeErrorMessage } from '../../utils/errorSanitizer';

const TrialOfferStep: React.FC = () => {
  const navigation = useNavigation();
  const { restorePurchases } = useEntitlementsContext();
  const [loading, setLoading] = useState(false);

  // Track step view when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('onboarding_step_viewed', {
        step_name: 'trial_offer'
      });
    }, [])
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const handleTryFree = () => {
    navigation.navigate('TrialReminder' as never);
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        navigation.navigate('PostPurchaseSignIn' as never);
      } else {
        Alert.alert('No Purchases', result.error || 'No active subscriptions found.');
      }
    } catch (error: any) {
      Alert.alert('Restore Error', sanitizeErrorMessage(error, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Create Restore button for rightElement
  const restoreButton = (
    <TouchableOpacity 
      onPress={() => {
        console.warn('[TrialOffer] ===== RESTORE BUTTON PRESSED =====');
        handleRestore();
      }} 
      disabled={loading} 
      style={styles.restoreButton}
    >
      <Text style={styles.restoreText}>Restore</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <OnboardingHeader onBack={handleBack} rightElement={restoreButton} />
      
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>We want you to try Dreamer for free</Text>
          
          <Image 
            source={require('../../assets/images/onboarding/screenshots/WholeApp.png')} 
            style={styles.screenshot}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.offerSection}>
          <Text style={styles.noPaymentText}>✓ No Payment Due Now</Text>
          <Button
            title="Try for £0.00"
            onPress={handleTryFree}
            variant="black"
            style={styles.tryButton}
          />
          <Text style={styles.pricingText}>
            Just £39.99 per year (£3.33 / month)
          </Text>
        </View>
      </View>
    </View>
  );
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: theme.typography.lineHeight.largeTitle,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  screenshot: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  offerSection: {
    alignItems: 'center',
  },
  noPaymentText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.lg,
  },
  tryButton: {
    width: '100%',
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.xl,
  },
  pricingText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
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
});

export default TrialOfferStep;
