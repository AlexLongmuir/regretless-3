/**
 * Paywall Step - Subscription screen with RevenueCat integration
 * 
 * Offers monthly/annual subscriptions with 3-day free trial
 * Handles purchase flow and navigation to PostPurchaseSignIn
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { useEntitlementsContext } from '../../contexts/EntitlementsContext';

// Import RevenueCat with fallback to mock
import Purchases from '../../lib/revenueCat';

// Try to get types from RevenueCat, fall back to mock types
let CustomerInfo: any;
let PurchasesOffering: any;

try {
  const RevenueCat = require('react-native-purchases');
  CustomerInfo = RevenueCat.CustomerInfo;
  PurchasesOffering = RevenueCat.PurchasesOffering;
} catch (error) {
  console.log('RevenueCat types not available, using mock types');
  const MockRevenueCat = require('../../utils/revenueCatMock');
  CustomerInfo = MockRevenueCat.MockCustomerInfo;
  PurchasesOffering = MockRevenueCat.MockPurchasesOffering;
}

interface PricingOption {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  period: string;
  savings?: string;
  popular?: boolean;
}

const PaywallStep: React.FC = () => {
  const navigation = useNavigation();
  const { restorePurchases } = useEntitlementsContext();
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('annual');

  useEffect(() => {
    fetchOfferings();
  }, []);

  const fetchOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setOffering(offerings.current);
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
    }
  };

  const handlePurchase = async () => {
    if (!offering) return;

    setLoading(true);
    try {
      // Find the selected package
      const packageToPurchase = offering.availablePackages.find(
        pkg => pkg.identifier === selectedPlan
      );

      if (!packageToPurchase) {
        throw new Error('Package not found');
      }

      // Make the purchase
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      // Check if user has active entitlement
      if (customerInfo.entitlements.active['pro']) {
        // Navigate to PostPurchaseSignIn
        navigation.navigate('PostPurchaseSignIn' as never);
      } else {
        Alert.alert('Purchase Failed', 'Please try again or contact support.');
      }
    } catch (error: any) {
      if (error.userCancelled) {
        // User cancelled, no action needed
      } else {
        Alert.alert('Purchase Error', error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
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
      Alert.alert('Restore Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Mock pricing data - in real implementation, this would come from RevenueCat
  const pricingOptions: PricingOption[] = [
    {
      id: 'monthly',
      title: 'Monthly',
      subtitle: 'Perfect for trying out',
      price: '$9.99',
      period: '/month',
    },
    {
      id: 'annual',
      title: 'Annual',
      subtitle: 'Best value',
      price: '$79.99',
      period: '/year',
      savings: 'Save 33%',
      popular: true,
    },
  ];

  return (
    <View style={styles.container}>
      <OnboardingHeader 
        showProgress={true}
        showBackButton={false} // Can't go back from paywall
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Unlock Your Dreams</Text>
        <Text style={styles.subtitle}>Start your 3-day free trial</Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Text style={styles.featureText}>✓ Personalized dream tracking</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureText}>✓ AI-powered goal recommendations</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureText}>✓ Progress photos and journaling</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureText}>✓ Expert coaching and accountability</Text>
          </View>
        </View>

        <View style={styles.pricingContainer}>
          {pricingOptions.map((option) => (
            <Button
              key={option.id}
              title={`${option.title}${option.popular ? ' (Popular)' : ''}`}
              onPress={() => setSelectedPlan(option.id)}
              variant={selectedPlan === option.id ? "primary" : "outline"}
              style={[
                styles.pricingOption,
                selectedPlan === option.id && styles.selectedOption
              ]}
            >
              <View style={styles.pricingContent}>
                <Text style={styles.pricingTitle}>{option.title}</Text>
                <Text style={styles.pricingSubtitle}>{option.subtitle}</Text>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingPrice}>{option.price}</Text>
                  <Text style={styles.pricingPeriod}>{option.period}</Text>
                </View>
                {option.savings && (
                  <Text style={styles.pricingSavings}>{option.savings}</Text>
                )}
              </View>
            </Button>
          ))}
        </View>

        <Text style={styles.trialText}>
          Start with a 3-day free trial, then {selectedPlan === 'annual' ? '$79.99/year' : '$9.99/month'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          title={loading ? "Processing..." : "Start Free Trial"}
          onPress={handlePurchase}
          variant="black"
          disabled={loading}
          style={styles.button}
        />
        
        <Button
          title="Restore Purchases"
          onPress={handleRestore}
          variant="outline"
          disabled={loading}
          style={styles.restoreButton}
        />
        
        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy. 
          Cancel anytime in your device settings.
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
  featuresContainer: {
    marginBottom: theme.spacing.xl,
  },
  feature: {
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[700],
    textAlign: 'center',
  },
  pricingContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  pricingOption: {
    width: '100%',
    padding: theme.spacing.md,
  },
  selectedOption: {
    borderColor: theme.colors.primary[600],
    borderWidth: 2,
  },
  pricingContent: {
    alignItems: 'center',
  },
  pricingTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[800],
    marginBottom: theme.spacing.xs,
  },
  pricingSubtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing.sm,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing.xs,
  },
  pricingPrice: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.primary[600],
  },
  pricingPeriod: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    marginLeft: theme.spacing.xs,
  },
  pricingSavings: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.success[600],
  },
  trialText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption1,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[500],
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
  restoreButton: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  termsText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[500],
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PaywallStep;
