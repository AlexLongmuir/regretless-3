/**
 * Subscription Lockout Page
 * 
 * Displayed when an authenticated user does not have an active subscription.
 * Allows the user to subscribe, restore purchases, or sign out.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as WebBrowser from 'expo-web-browser';
import { theme } from '../utils/theme';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useEntitlementsContext } from '../contexts/EntitlementsContext';
import { notificationService } from '../lib/NotificationService';
import { useAuthContext } from '../contexts/AuthContext';
import { trackEvent } from '../lib/mixpanel';
import { sanitizePurchaseErrorMessage, sanitizeErrorMessage } from '../utils/errorSanitizer';

// Import RevenueCat with fallback to mock
import Purchases, { isRevenueCatConfigured } from '../lib/revenueCat';

// Try to get types from RevenueCat, fall back to mock types
let PurchasesOffering: any;

try {
  const RevenueCat = require('react-native-purchases');
  PurchasesOffering = RevenueCat.PurchasesOffering;
} catch (error) {
// console.log('RevenueCat types not available, using mock types');
  const MockRevenueCat = require('../utils/revenueCatMock');
  PurchasesOffering = MockRevenueCat.MockPurchasesOffering;
}

const SubscriptionLockoutPage: React.FC = () => {
  const navigation = useNavigation();
  const { hasProAccess, restorePurchases, refreshCustomerInfo } = useEntitlementsContext();
  const { user, signOut } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState('$rc_annual');
  const [loading, setLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [offering, setOffering] = useState<any | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const hasTrackedViewRef = useRef(false);
  
  // Add a small delay before showing the lockout screen to prevent flashing
  // when the user is just transitioning/syncing subscription status
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingStatus(false);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, []);
  
  // Auto-navigate when hasProAccess becomes true after purchase
  // The AppNavigator should handle this automatically, but this ensures it happens
  useEffect(() => {
    if (hasProAccess && purchaseSuccess) {
      // Navigation will happen automatically via AppNavigator in navigation/index.tsx
      // which checks hasProAccess and routes to Main
      console.log('✅ Purchase successful, hasProAccess is true - navigation should happen automatically');
    } else if (purchaseSuccess && !hasProAccess) {
      // If purchase was successful but hasProAccess is still false after a delay,
      // try refreshing one more time
      const timeout = setTimeout(async () => {
        if (!hasProAccess) {
          console.log('⚠️ Purchase successful but hasProAccess still false, refreshing...');
          await refreshCustomerInfo(true);
        }
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [hasProAccess, purchaseSuccess, refreshCustomerInfo]);

  // Track page view - only once per focus session
  useFocusEffect(
    React.useCallback(() => {
      if (!hasTrackedViewRef.current) {
      trackEvent('subscription_lockout_viewed', {
          screen_name: 'subscription_lockout'
        });
        hasTrackedViewRef.current = true;
      }
      
      return () => {
        // Reset when screen loses focus
        hasTrackedViewRef.current = false;
      };
    }, [])
  );

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      // Check if user already has pro access on mount
      // This handles cases where the user lands here but actually has access
      if (hasProAccess) {
        console.log('✅ User already has pro access on SubscriptionLockoutPage - navigation should happen automatically');
        return;
      }
      
      // Fetch offerings
      if (isMounted) {
        await fetchOfferings();
      }
      
      // Only refresh customer info once on mount, not repeatedly
      if (isMounted && !hasProAccess) {
        try {
          await refreshCustomerInfo(true);
        } catch (error) {
          console.error('Error checking existing access:', error);
        }
      }
    };
    
    initialize();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOfferings = async (retryCount = 0) => {
    try {
      setOfferingsLoading(true);
      
      // Check if RevenueCat is properly configured
      if (!isRevenueCatConfigured()) {
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
      
      const offerings = await Purchases.getOfferings();
      
      // First try to get offering with identifier "default"
      if (offerings.all && offerings.all['default']) {
        setOffering(offerings.all['default']);
      } else if (offerings.current) {
        setOffering(offerings.current);
      } else {
        const availableOfferings = Object.values(offerings.all || {});
        if (availableOfferings.length > 0) {
          setOffering(availableOfferings[0] as any);
        } else {
          if (retryCount === 0) {
            setTimeout(() => fetchOfferings(1), 1000);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching offerings:', error);
      if (retryCount === 0) {
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
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        // In mock mode, we can't really "purchase", but user might be manually set as pro in context
        // Navigation will happen automatically if entitlements update
      }, 1000);
      return;
    }

    if (!offering) {
      Alert.alert('Error', 'Subscription options are still loading. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    try {
      const packageToPurchase = offering.availablePackages.find(
        (pkg: any) => pkg.identifier === selectedPlan
      );

      if (!packageToPurchase) {
        Alert.alert('Error', 'Selected subscription plan not available. Please try a different plan.');
        return;
      }

      // Make the purchase
      const { customerInfo: purchaseCustomerInfo } = await Purchases.purchasePackage(packageToPurchase);

      // Track purchase completion
        trackEvent('purchase_completed', {
          purchase_source: 'subscription_lockout',
        package_id: packageToPurchase.identifier,
        price: packageToPurchase.product.priceString
      });

      // Check if purchase immediately grants pro access
      const hasProFromPurchase = purchaseCustomerInfo.entitlements?.active?.['pro'] || false;
      
      if (hasProFromPurchase) {
        // Purchase grants immediate access
        // The RevenueCat listener should fire automatically, but we'll also refresh to ensure state updates
        // Wait a brief moment for the listener to potentially fire first
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Refresh customer info to update the context state
        // This will trigger the navigation in AppNavigator when hasProAccess becomes true
        await refreshCustomerInfo(true);
        
        setPurchaseSuccess(true);
        // Navigation logic will be handled by the AppNavigator listening to hasProAccess
      } else {
        // Check active subscriptions (for trials or delayed activation)
        const activeSubscriptions = purchaseCustomerInfo.activeSubscriptions;
        const hasActiveSubscription = activeSubscriptions && Object.keys(activeSubscriptions).length > 0;
        
        if (hasActiveSubscription) {
          // Has active subscription - refresh to get latest entitlement status
          await new Promise(resolve => setTimeout(resolve, 500));
          await refreshCustomerInfo(true);

          setPurchaseSuccess(true);
          // Navigation will happen when hasProAccess becomes true
        } else {
          Alert.alert('Purchase Failed', 'Please try again or contact support.');
        }
      }
    } catch (error: any) {
      const underlyingError = error.underlyingErrorMessage || error.message || '';
      const errorMessage = underlyingError.toLowerCase();
      
      // Check if error indicates user already has subscription
      const hasAlreadySubscribedError = 
        errorMessage.includes('already subscribed') ||
        errorMessage.includes('already purchased') ||
        errorMessage.includes('already owns') ||
        error.code === 'PURCHASE_NOT_ALLOWED' ||
        error.code === 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE';
      
      const hasNoAccountError = underlyingError.includes('No active account') || 
                                underlyingError.includes('ASDErrorDomain') ||
                                error.code === 'STORE_PROBLEM' ||
                                error.code === 'NETWORK_ERROR';
      
      if (error.userCancelled && !hasNoAccountError) {
        // User cancelled
      } else if (hasAlreadySubscribedError) {
        // User already has subscription - refresh customer info to check access
        console.log('⚠️ Purchase error indicates already subscribed, checking current access...');
        try {
          await refreshCustomerInfo(true);
          
          // Wait a moment for state to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if user now has pro access
          const currentCustomerInfo = await Purchases.getCustomerInfo();
          const hasPro = currentCustomerInfo.entitlements?.active?.['pro'] || false;
          
          if (hasPro) {
            // User has pro access - navigation will happen automatically
            console.log('✅ User already has pro access, navigation should happen automatically');
            setPurchaseSuccess(true);
          } else {
            // User doesn't have pro access - might need to restore purchases
            Alert.alert(
              'Already Subscribed',
              'You already have a subscription. Please use "Restore Purchases" to restore it.',
              [
                {
                  text: 'Restore Purchases',
                  onPress: handleRestore
                },
                {
                  text: 'OK',
                  style: 'cancel'
                }
              ]
            );
          }
        } catch (refreshError) {
          console.error('Error refreshing customer info:', refreshError);
          Alert.alert(
            'Already Subscribed',
            'You already have a subscription. Please use "Restore Purchases" to restore it.',
            [
              {
                text: 'Restore Purchases',
                onPress: handleRestore
              },
              {
                text: 'OK',
                style: 'cancel'
              }
            ]
          );
        }
      } else if (hasNoAccountError) {
        Alert.alert(
          'Sign In Required', 
          sanitizePurchaseErrorMessage(error, true)
        );
      } else {
        console.error('Purchase error:', error);
        Alert.alert('Purchase Error', sanitizePurchaseErrorMessage(error, false));
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
        // Refresh customer info to ensure hasProAccess updates
        await refreshCustomerInfo(true);
        
        // Wait a moment for state to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if user now has pro access
        const currentCustomerInfo = await Purchases.getCustomerInfo();
        const hasPro = currentCustomerInfo.entitlements?.active?.['pro'] || false;
        
        if (hasPro) {
          // User has pro access - navigation will happen automatically via AppNavigator
          console.log('✅ Purchases restored, user has pro access - navigation should happen automatically');
        setPurchaseSuccess(true);
          // Don't show alert - let navigation happen automatically
        } else {
          // Restore succeeded but no pro access - might be expired or cancelled
          Alert.alert(
            'No Active Subscription',
            'No active subscription found. Please subscribe to continue.'
          );
        }
      } else {
        Alert.alert('No Purchases', result.error || 'No active subscriptions found.');
      }
    } catch (error: any) {
      Alert.alert('Restore Error', sanitizeErrorMessage(error, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
        await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleOpenTerms = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/', {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: theme.colors.grey[900],
        enableBarCollapsing: false,
        showTitle: true,
      });
    } catch (error) {
      console.error('Error opening terms:', error);
    }
  };

  const handleOpenPrivacy = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://www.notion.so/dreamerapp/Dreamer-Support-2c54af3195c3801dafd7dd198a42d7d5', {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: theme.colors.grey[900],
        enableBarCollapsing: false,
        showTitle: true,
      });
    } catch (error) {
      console.error('Error opening privacy:', error);
    }
  };

  // Helper function to parse priceString and extract numeric value
  const parsePrice = (priceString: string): { numeric: number; currency: string } => {
    if (!priceString) return { numeric: 0, currency: '' };
    const cleaned = priceString.replace(/[£$€¥,]/g, '').trim();
    const numeric = parseFloat(cleaned) || 0;
    const currencyMatch = priceString.match(/[£$€¥]/);
    const currency = currencyMatch ? currencyMatch[0] : '';
    return { numeric, currency };
  };

  // Helper function to format monthly equivalent
  const formatMonthlyEquivalent = (annualPriceString: string): string => {
    const { numeric, currency } = parsePrice(annualPriceString);
    if (numeric === 0) return '';
    const monthly = numeric / 12;
    return `${currency}${monthly.toFixed(2)}`;
  };

  // Compute pricing plans from RevenueCat offerings
  const pricingPlans = useMemo(() => {
    if (!offering?.availablePackages || offering.availablePackages.length === 0) {
      return [
        {
          id: '$rc_monthly',
          title: 'Monthly',
          price: 'Loading...',
          priceSubtitle: undefined,
          selected: selectedPlan === '$rc_monthly',
        },
        {
          id: '$rc_annual',
          title: 'Yearly',
          price: 'Loading...',
          priceSubtitle: undefined,
          badge: 'BEST VALUE',
          selected: selectedPlan === '$rc_annual',
        },
      ];
    }

    const plans: any[] = [];
    
    for (const pkg of offering.availablePackages) {
      const priceString = pkg.product?.priceString || '';
      
      if (pkg.identifier === '$rc_monthly' || pkg.identifier.includes('monthly')) {
        plans.push({
          id: '$rc_monthly',
          title: 'Monthly',
          price: priceString ? `${priceString}/month` : 'Loading...',
          priceSubtitle: undefined,
          selected: selectedPlan === '$rc_monthly',
        });
      } else if (pkg.identifier === '$rc_annual' || pkg.identifier.includes('annual')) {
        const monthlyEquivalent = formatMonthlyEquivalent(priceString);
        plans.push({
          id: '$rc_annual',
          title: 'Yearly',
          price: priceString ? `${priceString} / year` : 'Loading...',
          priceSubtitle: monthlyEquivalent ? `${monthlyEquivalent} per month, billed annually` : undefined,
          badge: 'BEST VALUE',
          selected: selectedPlan === '$rc_annual',
        });
      }
    }

    // Ensure we have both plans, even if one is missing
    const hasMonthly = plans.some(p => p.id === '$rc_monthly');
    const hasAnnual = plans.some(p => p.id === '$rc_annual');

    if (!hasMonthly) {
      plans.unshift({
        id: '$rc_monthly',
        title: 'Monthly',
        price: 'Loading...',
        priceSubtitle: undefined,
        selected: selectedPlan === '$rc_monthly',
      });
    }

    if (!hasAnnual) {
      plans.push({
        id: '$rc_annual',
        title: 'Yearly',
        price: 'Loading...',
        priceSubtitle: undefined,
        badge: 'BEST VALUE',
        selected: selectedPlan === '$rc_annual',
      });
    }

    return plans;
  }, [offering, selectedPlan]);

  const timelineItems = [
    {
      id: 'features',
      title: 'Unlock Features',
      description: "Get unlimited dream tracking, AI insights, and personalized action plans.",
      icon: 'star',
      color: theme.colors.primary[500],
      isActive: true,
    },
    {
      id: 'progress',
      title: 'Track Your Progress',
      description: "See your growth over time with visual progress tracking and milestone celebrations.",
      icon: 'trending-up',
      color: theme.colors.primary[500],
      isActive: true,
    },
    {
      id: 'achievement',
      title: 'Achieve Your Dreams',
      description: "Turn your aspirations into reality with step-by-step guidance and consistent progress tracking.",
      icon: 'trophy',
      color: theme.colors.primary[500],
      isActive: true,
    },
  ];

  // Sign Out button for header (left side) - matching restore button style
  const signOutButton = (
    <TouchableOpacity
      onPress={handleSignOut}
      style={styles.restoreButtonWrapper}
    >
      <BlurView 
        intensity={100} 
        tint="light" 
        style={styles.restoreButton}
      >
        <Text style={styles.restoreText}>Sign Out</Text>
      </BlurView>
    </TouchableOpacity>
  );

  // Restore button for header (right side) - matching trial-continuation style
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

  // Show loading indicator during the initial debounce period
  // This prevents the lockout screen from flashing for users who have a subscription
  // but whose status is being synced
  if (isCheckingStatus) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={theme.colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {signOutButton}
        {restoreButton}
      </View>
      
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Keep Your Dreams Alive</Text>
          <Text style={styles.subtitle}>
            Reactivate your subscription to continue your journey & unlock all features
          </Text>
          
          <View style={styles.timelineContainer}>
            {timelineItems.map((item, index) => (
              <View key={item.id} style={[
                styles.timelineItem,
                index === 1 && styles.timelineItemReducedMargin
              ]}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineIconContainer,
                    styles.activeIcon
                  ]}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={20} 
                    color="#fff"
                  />
                  </View>
                  {index < timelineItems.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      styles.activeLine
                    ]} />
                  )}
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
                  {plan.priceSubtitle && (
                    <Text style={[
                      styles.pricingPriceSubtitle,
                      plan.selected && styles.selectedPricingPriceSubtitle
                    ]}>
                      {plan.priceSubtitle}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.offerSection}>
          <Button
            title={
              purchaseSuccess
                ? "✓ Purchase Successful!"
                : loading 
                  ? "Processing..." 
                  : offeringsLoading 
                    ? "Loading options..." 
                    : (selectedPlan === '$rc_monthly' ? "Subscribe Monthly" : "Subscribe Yearly")
            }
            onPress={handleStartTrial}
            variant={purchaseSuccess ? "success" : "black"}
            disabled={loading || offeringsLoading || purchaseSuccess}
            style={styles.trialButton}
          />

          <Text style={styles.pricingText}>
            {purchaseSuccess 
              ? "Updating access..." 
              : (() => {
                  if (!offering?.availablePackages) return "Loading pricing...";
                  
                  const selectedPackage = offering.availablePackages.find(
                    (pkg: any) => pkg.identifier === selectedPlan
                  );
                  
                  if (!selectedPackage?.product?.priceString) return "Loading pricing...";
                  
                  const priceString = selectedPackage.product.priceString;
                  
                  if (selectedPlan === '$rc_monthly') {
                    return `${priceString} per month, cancel anytime`;
                  } else {
                    const monthlyEquivalent = formatMonthlyEquivalent(priceString);
                    return `${priceString} per year${monthlyEquivalent ? ` (${monthlyEquivalent} / month)` : ''}`;
                  }
                })()
            }
          </Text>
          <Text style={styles.legalText}>
            Auto-renews unless cancelled in Apple ID settings.{'\n'}
            <Text style={styles.linkText} onPress={handleOpenPrivacy}>Privacy</Text>
            {' · '}
            <Text style={styles.linkText} onPress={handleOpenTerms}>Terms</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground,
  },
  header: {
    height: 52,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 30,
    marginTop: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold as any,
    lineHeight: 34,
    color: theme.colors.grey[900],
    textAlign: 'left',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.body,
    fontWeight: theme.typography.fontWeight.regular as any,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.grey[600],
    textAlign: 'left',
    marginBottom: theme.spacing.xl,
  },
  timelineContainer: {
    marginBottom: theme.spacing.xl,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  timelineItemReducedMargin: {
    marginBottom: theme.spacing.xs,
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
  timelineLine: {
    width: 2,
    height: 40,
    marginTop: theme.spacing.sm,
  },
  activeLine: {
    backgroundColor: theme.colors.primary[500],
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
  pricingPriceSubtitle: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[500],
    marginTop: theme.spacing.xs,
  },
  selectedPricingPriceSubtitle: {
    color: theme.colors.grey[600],
  },
  offerSection: {
    alignItems: 'center',
  },
  trialButton: {
    width: '100%',
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.xl,
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
  pricingText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  legalText: {
    fontFamily: theme.typography.fontFamily.system,
    fontSize: theme.typography.fontSize.caption2,
    fontWeight: theme.typography.fontWeight.regular as any,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  linkText: {
    color: theme.colors.grey[600],
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SubscriptionLockoutPage;
