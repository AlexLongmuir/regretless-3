/**
 * Trial Continuation Step - Trial continuation with timeline and pricing
 * 
 * Shows timeline progression and subscription options
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { theme } from '../../utils/theme';
import { Button } from '../../components/Button';
import { OnboardingHeader } from '../../components/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useEntitlementsContext } from '../../contexts/EntitlementsContext';
import { notificationService } from '../../lib/NotificationService';
import { useAuthContext } from '../../contexts/AuthContext';

// Import RevenueCat with fallback to mock
import Purchases, { isRevenueCatConfigured } from '../../lib/revenueCat';

// Try to get types from RevenueCat, fall back to mock types
let PurchasesOffering: any;

try {
  const RevenueCat = require('react-native-purchases');
  PurchasesOffering = RevenueCat.PurchasesOffering;
} catch (error) {
  console.log('RevenueCat types not available, using mock types');
  const MockRevenueCat = require('../../utils/revenueCatMock');
  PurchasesOffering = MockRevenueCat.MockPurchasesOffering;
}

const TrialContinuationStep: React.FC = () => {
  const navigation = useNavigation();
  const { hasProAccess, restorePurchases } = useEntitlementsContext();
  const { user } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState('$rc_annual');
  const [showOneTimeOffer, setShowOneTimeOffer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [offering, setOffering] = useState<any | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    fetchOfferings();
  }, []);

  const fetchOfferings = async (retryCount = 0) => {
    try {
      setOfferingsLoading(true);
      
      // Check if RevenueCat is properly configured
      if (!isRevenueCatConfigured()) {
        console.log('RevenueCat not configured, using mock offerings');
        // Set mock offering for development
        setOffering({
          identifier: 'mock-offering',
          availablePackages: [
            {
              identifier: '$rc_annual',
              product: { identifier: 'annual_dreamer', priceString: '£39.99' }
            },
            {
              identifier: '$rc_monthly', 
              product: { identifier: 'monthly_dreamer', priceString: '£14.99' }
            }
          ]
        });
        setOfferingsLoading(false);
        return;
      }
      
      console.log('Fetching RevenueCat offerings... (attempt', retryCount + 1, ')');
      const offerings = await Purchases.getOfferings();
      console.log('Offerings response:', offerings);
      
      if (offerings.current) {
        console.log('Current offering found:', offerings.current);
        setOffering(offerings.current);
      } else {
        console.log('No current offering available');
        console.log('Available offerings:', Object.keys(offerings.all));
        
        // Use the first available offering if current is null
        const availableOfferings = Object.values(offerings.all);
        if (availableOfferings.length > 0) {
          console.log('Using first available offering:', availableOfferings[0]);
          setOffering(availableOfferings[0] as any);
        } else {
          // Retry once if no offerings found
          if (retryCount === 0) {
            console.log('Retrying fetch offerings...');
            setTimeout(() => fetchOfferings(1), 1000);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
      
      // Retry once on error
      if (retryCount === 0) {
        console.log('Retrying fetch offerings after error...');
        setTimeout(() => fetchOfferings(1), 1000);
        return;
      }
    } finally {
      setOfferingsLoading(false);
    }
  };

  const handleStartTrial = async () => {
    // Check if RevenueCat is properly configured
    if (!isRevenueCatConfigured()) {
      console.log('RevenueCat not configured, simulating mock purchase');
      setLoading(true);
      
      // Simulate purchase delay
      setTimeout(() => {
        console.log('Mock purchase completed successfully');
        setLoading(false);
        // Navigate to PostPurchaseSignIn
        navigation.navigate('PostPurchaseSignIn' as never);
      }, 1000);
      return;
    }

    if (!offering) {
      Alert.alert('Error', 'Subscription options are still loading. Please wait a moment and try again.');
      return;
    }

    console.log('Starting trial with offering:', offering);
      console.log('Available packages:', offering.availablePackages?.map((pkg: any) => ({
        identifier: pkg.identifier,
        product: pkg.product?.identifier
      })));

    setLoading(true);
    try {
      // Find the selected package
      const packageToPurchase = offering.availablePackages.find(
        (pkg: any) => pkg.identifier === selectedPlan
      );

      if (!packageToPurchase) {
        console.log('Package not found for selectedPlan:', selectedPlan);
        console.log('Available package identifiers:', offering.availablePackages?.map((pkg: any) => pkg.identifier));
        Alert.alert('Error', 'Selected subscription plan not available. Please try a different plan.');
        return;
      }

      console.log('Purchasing package:', packageToPurchase.identifier);

      // Make the purchase
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      console.log('Purchase completed, customer info:', {
        hasProAccess: customerInfo.entitlements?.active?.['pro'] || false,
        userId: customerInfo.originalAppUserId,
      });

      // Wait a moment for RevenueCat to fully process the purchase
      // Sometimes there's a delay between purchase completion and entitlement activation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh customer info to get the latest entitlement status
      const refreshedCustomerInfo = await Purchases.getCustomerInfo();
      
      console.log('Refreshed customer info after purchase:', {
        hasProAccess: refreshedCustomerInfo.entitlements?.active?.['pro'] || false,
        userId: refreshedCustomerInfo.originalAppUserId,
      });

      // Check if user has active entitlement
      if (refreshedCustomerInfo.entitlements?.active?.['pro']) {
        // Show success state briefly before navigating
        setPurchaseSuccess(true);
        
        // Schedule trial reminder notification (24 hours before trial expires)
        if (user?.id) {
          try {
            const proEntitlement = refreshedCustomerInfo.entitlements?.active?.pro;
            const expirationDate = proEntitlement?.expirationDate;
            
            if (expirationDate) {
              // Schedule reminder 24 hours before trial expires
              await notificationService.scheduleTrialReminder(user.id, expirationDate, 24);
              console.log('Trial reminder notification scheduled for 24 hours before expiration');
            }
          } catch (error) {
            console.error('Error scheduling trial reminder:', error);
            // Don't block the user flow if reminder scheduling fails
          }
        }
        
        setTimeout(() => {
          navigation.navigate('PostPurchaseSignIn' as never);
        }, 1500);
      } else {
        // Check if this is a trial subscription that hasn't activated yet
        const activeSubscriptions = refreshedCustomerInfo.activeSubscriptions;
        const hasActiveSubscription = activeSubscriptions && Object.keys(activeSubscriptions).length > 0;
        
        if (hasActiveSubscription) {
          // User has an active subscription but entitlement might not be active yet
          // This can happen with trial subscriptions
          console.log('Active subscription found but entitlement not yet active, proceeding anyway');
          setPurchaseSuccess(true);
          
          // Schedule trial reminder notification (24 hours before trial expires)
          if (user?.id) {
            try {
              const proEntitlement = refreshedCustomerInfo.entitlements?.active?.pro;
              const expirationDate = proEntitlement?.expirationDate;
              
              if (expirationDate) {
                // Schedule reminder 24 hours before trial expires
                await notificationService.scheduleTrialReminder(user.id, expirationDate, 24);
                console.log('Trial reminder notification scheduled for 24 hours before expiration');
              }
            } catch (error) {
              console.error('Error scheduling trial reminder:', error);
              // Don't block the user flow if reminder scheduling fails
            }
          }
          
          setTimeout(() => {
            navigation.navigate('PostPurchaseSignIn' as never);
          }, 1500);
        } else {
          Alert.alert('Purchase Failed', 'Please try again or contact support.');
        }
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      if (error.userCancelled) {
        // User cancelled, no action needed
        console.log('User cancelled purchase');
      } else {
        Alert.alert('Purchase Error', error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClaimOffer = () => {
    console.log('Claiming limited offer');
    setShowOneTimeOffer(false);
    // Navigate to payment or next step
  };

  const handleDismissOffer = () => {
    setShowOneTimeOffer(false);
  };

  const handleBack = () => {
    navigation.goBack();
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

  // Calculate billing date (3 days from now)
  const getBillingDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const timelineItems = [
    {
      id: 'today',
      title: 'Today',
      description: "Unlock all the app's features like personalized dream plans, daily action recommendations, and AI-powered insights.",
      icon: 'lock-closed',
      color: theme.colors.primary[500],
      isActive: true,
    },
    {
      id: 'reminder',
      title: 'In 2 Days - Reminder',
      description: "We'll send you a reminder that your trial is ending soon.",
      icon: 'notifications',
      color: theme.colors.primary[500],
      isActive: true,
    },
    {
      id: 'billing',
      title: 'In 3 Days - Billing Starts',
      description: `You'll be charged on ${getBillingDate()} unless you cancel anytime before.`,
      icon: 'diamond',
      color: theme.colors.grey[900],
      isActive: false,
    },
  ];

  const pricingPlans = [
    {
      id: '$rc_monthly',
      title: 'Monthly',
      price: '£14.99/mo',
      selected: selectedPlan === '$rc_monthly',
    },
    {
      id: '$rc_annual',
      title: 'Yearly',
      price: '£3.33/mo',
      badge: '3 DAYS FREE',
      selected: selectedPlan === '$rc_annual',
    },
  ];

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
        <View style={styles.topSection}>
          <Text style={styles.title}>Start your 3-day FREE trial to continue</Text>
          
          <View style={styles.timelineContainer}>
            {timelineItems.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineIconContainer,
                    item.isActive ? styles.activeIcon : styles.inactiveIcon
                  ]}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={20} 
                    color="#fff"
                  />
                  </View>
                  <View style={[
                    styles.timelineLine,
                    item.isActive ? styles.activeLine : styles.inactiveLine
                  ]} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineDescription}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.pricingContainer}>
            {pricingPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.pricingOption,
                plan.selected && styles.selectedPricingOption
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={1}
            >
                {plan.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
                <View style={styles.pricingContent}>
                  <View style={styles.pricingHeader}>
                    <Text style={[
                      styles.pricingTitle,
                      plan.selected && styles.selectedPricingTitle
                    ]}>
                      {plan.title}
                    </Text>
                  </View>
                  <Text style={[
                    styles.pricingPrice,
                    plan.selected && styles.selectedPricingPrice
                  ]}>
                    {plan.price}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.offerSection}>
          <Text style={styles.noPaymentText}>✓ No Payment Due Now</Text>
          <Button
            title={
              purchaseSuccess
                ? "✓ Purchase Successful!"
                : loading 
                  ? "Processing..." 
                  : offeringsLoading 
                    ? "Loading subscription options..." 
                    : (selectedPlan === '$rc_monthly' ? "Start Monthly Subscription" : "Start my 3-Day Free Trial")
            }
            onPress={handleStartTrial}
            variant={purchaseSuccess ? "success" : "black"}
            disabled={loading || offeringsLoading || purchaseSuccess}
            style={styles.trialButton}
          />
          <Text style={styles.pricingText}>
            {purchaseSuccess 
              ? "Redirecting to sign in..." 
              : selectedPlan === '$rc_monthly' 
                ? "£14.99 per month" 
                : "3 days free, then £39.99 per year (£3.33 / month)"
            }
          </Text>
        </View>
      </View>

      {/* One-Time Offer Modal - DISABLED */}
      {/* <Modal
        visible={showOneTimeOffer}
        transparent={true}
        animationType="none"
        onRequestClose={handleDismissOffer}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <View style={styles.offerCard}>
              <View style={styles.confettiContainer}>
                <View style={[styles.confetti, styles.confetti1]} />
                <View style={[styles.confetti, styles.confetti2]} />
                <View style={[styles.confetti, styles.confetti3]} />
                <View style={[styles.confetti, styles.confetti4]} />
                <View style={[styles.confetti, styles.confetti5]} />
              </View>
              
              <View style={styles.suitcaseIcon}>
                <Ionicons name="briefcase" size={40} color={theme.colors.primary[600]} />
              </View>
              
              <Text style={styles.offerTitle}>One Time Offer</Text>
              <Text style={styles.offerSubtitle}>You will never see this again</Text>
              <Text style={styles.offerPrice}>Here's a 80% off discount</Text>
              <Text style={styles.offerPriceAmount}>Only £1.66 / month</Text>
              <Text style={styles.offerSubtext}>Lowest price ever</Text>
              
              <View style={styles.offerButtons}>
                <Button
                  title="Claim your limited offer now!"
                  onPress={handleClaimOffer}
                  variant="black"
                  style={styles.claimButton}
                />
                <TouchableOpacity onPress={handleDismissOffer} style={styles.dismissButton}>
                  <Text style={styles.dismissText}>No thanks</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal> */}
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
  },
  title: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: 30,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: 36,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  timelineContainer: {
    marginBottom: theme.spacing.xl,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIcon: {
    backgroundColor: theme.colors.primary[500],
  },
  inactiveIcon: {
    backgroundColor: theme.colors.grey[900],
  },
  timelineLine: {
    width: 2,
    height: 60,
    marginTop: theme.spacing.sm,
  },
  activeLine: {
    backgroundColor: theme.colors.primary[500],
    height: 60,
  },
  inactiveLine: {
    backgroundColor: theme.colors.grey[900],
    height: 20,
  },
  timelineContent: {
    flex: 1,
    paddingTop: theme.spacing.sm,
  },
  timelineTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.xs,
  },
  timelineDescription: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    lineHeight: 18,
  },
  pricingContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing['2xl'],
  },
  pricingOption: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.grey[200],
    padding: theme.spacing.md,
    position: 'relative',
  },
  selectedPricingOption: {
    borderColor: theme.colors.grey[900],
    borderWidth: 2,
  },
  pricingContent: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  pricingTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[900],
    marginRight: theme.spacing.sm,
  },
  selectedPricingTitle: {
    color: theme.colors.grey[900],
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.grey[900],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
    zIndex: 1,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: '#fff',
  },
  pricingPrice: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[700],
    marginRight: theme.spacing.md,
  },
  selectedPricingPrice: {
    color: theme.colors.grey[900],
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.grey[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadioButton: {
    backgroundColor: theme.colors.grey[900],
    borderColor: theme.colors.grey[900],
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
  trialButton: {
    width: '100%',
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.xl,
  },
  pricingText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
  offerCard: {
    backgroundColor: theme.colors.grey[100],
    borderRadius: 16,
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confetti1: {
    backgroundColor: theme.colors.primary[400],
    top: '20%',
    left: '10%',
  },
  confetti2: {
    backgroundColor: theme.colors.secondary[400],
    top: '30%',
    right: '15%',
  },
  confetti3: {
    backgroundColor: theme.colors.success[400],
    top: '60%',
    left: '20%',
  },
  confetti4: {
    backgroundColor: theme.colors.warning[400],
    top: '70%',
    right: '25%',
  },
  confetti5: {
    backgroundColor: theme.colors.error[400],
    top: '40%',
    left: '50%',
  },
  suitcaseIcon: {
    marginBottom: theme.spacing.lg,
  },
  offerTitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  offerSubtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  offerPrice: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title2,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  offerPriceAmount: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.largeTitle,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.primary[600],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  offerSubtext: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.title3,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  offerButtons: {
    width: '100%',
    gap: theme.spacing.md,
  },
  claimButton: {
    width: '100%',
    borderRadius: theme.radius.xl,
  },
  dismissButton: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  dismissText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.grey[500],
  },
});

export default TrialContinuationStep;
