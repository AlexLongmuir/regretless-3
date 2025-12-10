/**
 * EntitlementsContext - RevenueCat subscription state management
 * 
 * This context manages subscription state from RevenueCat and provides
 * a centralized way to check if the user has active entitlements.
 * 
 * Key features:
 * - Listens to RevenueCat customer info changes
 * - Provides subscription status across the app
 * - Handles linking RevenueCat users with Supabase auth
 * - Manages billing snapshot storage in Supabase
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import Purchases from '../lib/revenueCat';
import { supabaseClient } from '../lib/supabaseClient';
import { useAuthContext } from './AuthContext';
import { isRevenueCatConfigured, waitForRevenueCatInitialization } from '../lib/revenueCat';

// Try to get types from RevenueCat, fall back to mock types
let CustomerInfoType: any;

try {
  const RevenueCat = require('react-native-purchases');
  CustomerInfoType = RevenueCat.CustomerInfo;
} catch (error) {
// console.log('RevenueCat types not available, using mock types');
  const MockRevenueCat = require('../utils/revenueCatMock');
  CustomerInfoType = MockRevenueCat.MockCustomerInfo;
}

export interface EntitlementsState {
  // Current customer info from RevenueCat
  customerInfo: any | null;
  // Whether the user has active pro entitlement
  hasProAccess: boolean;
  // Loading state for subscription checks
  loading: boolean;
  // Error state
  error: string | null;
  // Whether we're currently linking accounts
  linking: boolean;
}

export interface EntitlementsOperations {
  // Refresh customer info from RevenueCat
  refreshCustomerInfo: () => Promise<void>;
  // Link RevenueCat user with Supabase auth user
  linkRevenueCatUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  // Store billing snapshot in Supabase
  storeBillingSnapshot: (customerInfo: any) => Promise<{ success: boolean; error?: string }>;
  // Restore purchases
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
  // Validate subscription with server
  validateSubscription: (forceRefresh?: boolean) => Promise<{ success: boolean; error?: string }>;
  // Clear error state
  clearError: () => void;
  // Debug function
  debugState: () => void;
}

export type EntitlementsHook = EntitlementsState & EntitlementsOperations;

const EntitlementsContext = createContext<EntitlementsHook | undefined>(undefined);

interface EntitlementsProviderProps {
  children: ReactNode;
}

export const EntitlementsProvider: React.FC<EntitlementsProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuthContext();
  const [customerInfo, setCustomerInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  
  // Track linking attempts to prevent loops
  const linkingAttempted = useRef<string | null>(null);

  // Computed state
  const hasProAccess = customerInfo?.entitlements?.active?.['pro'] || false;

  /**
   * Refresh customer info from RevenueCat
   */
  const refreshCustomerInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if RevenueCat is properly configured
      if (!isRevenueCatConfigured()) {
        // console.log('RevenueCat not configured, skipping refresh');
        return;
      }
      
      // Double-check that Purchases is available and has the required methods
      if (!Purchases || typeof Purchases.getCustomerInfo !== 'function') {
        // console.log('RevenueCat Purchases object not properly initialized for refresh');
        return;
      }
      
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      
      // console.log('Customer info refreshed:', {
      //   hasProAccess: info.entitlements?.active?.['pro'] || false,
      //   userId: info.originalAppUserId,
      // });
    } catch (err: any) {
      console.error('Error refreshing customer info:', err);
      setError(err.message || 'Failed to refresh subscription status');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Link RevenueCat user with Supabase auth user
   * Only links if RevenueCat is currently using an anonymous user ID
   */
  const linkRevenueCatUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLinking(true);
      setError(null);
      
      // Check if RevenueCat is properly configured
      if (!isRevenueCatConfigured()) {
        // console.log('RevenueCat not configured, skipping link');
        return { success: true }; // Return success for mock mode
      }
      
      // Double-check that Purchases is available and has the required methods
      if (!Purchases || typeof Purchases.logIn !== 'function' || typeof Purchases.getAppUserID !== 'function') {
        // console.log('RevenueCat Purchases object not properly initialized for link');
        return { success: false, error: 'RevenueCat not properly initialized' };
      }
      
      // Get current RevenueCat user ID
      const currentRevenueCatUserId = await Purchases.getAppUserID();
      // console.log('🔗 RevenueCat linking check:', {
      //   currentRevenueCatUserId,
      //   targetUserId: userId,
      //   isAnonymous: currentRevenueCatUserId?.startsWith('$RCAnonymousID'),
      //   userEmail: user?.email,
      // });
      
      // Only link if currently anonymous
      if (!currentRevenueCatUserId?.startsWith('$RCAnonymousID')) {
        // console.log('RevenueCat already linked to a named user, skipping link');
        return { success: true };
      }
      
      // Link the anonymous user with the authenticated user
      // console.log('🔗 Linking anonymous RevenueCat user to authenticated user:', userId);
      const { customerInfo: linkedCustomerInfo } = await Purchases.logIn(userId);
      
      // Use the fresh customerInfo from logIn response, not cached data
      setCustomerInfo(linkedCustomerInfo);
      
      // console.log('✅ Successfully linked RevenueCat user:', {
      //   userId,
      //   hasProAccess: linkedCustomerInfo.entitlements?.active?.['pro'] || false,
      // });
      
      // Try to store billing snapshot with retry mechanism
      // console.log('Attempting to store billing snapshot...');
      const storeResult = await storeBillingSnapshotWithRetry(linkedCustomerInfo);
      if (storeResult.success) {
        // console.log('✅ Billing snapshot stored successfully');
      } else {
        // console.log('⚠️ Billing snapshot not stored:', storeResult.error);
        // console.log('Will store when subscription becomes available');
        
        // Set up a fallback mechanism to check for subscription later
        setupSubscriptionFallback(userId);
      }
      
      return { success: true };
    } catch (err: any) {
      console.error('Error linking RevenueCat user:', err);
      const errorMessage = err.message || 'Failed to link subscription account';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLinking(false);
    }
  };

  /**
   * Set up fallback mechanism to check for subscription when it becomes available
   */
  const setupSubscriptionFallback = (userId: string) => {
    // console.log('🔄 Setting up subscription fallback check...');
    
    // Check every 5 seconds for up to 2 minutes
    const maxChecks = 24; // 24 * 5 seconds = 2 minutes
    let checkCount = 0;
    
    const checkInterval = setInterval(async () => {
      checkCount++;
      // console.log(`🔍 Fallback check ${checkCount}/${maxChecks} for subscription...`);
      
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const result = await storeBillingSnapshot(customerInfo);
        
        if (result.success) {
          // console.log('✅ Fallback: Billing snapshot stored successfully');
          clearInterval(checkInterval);
          return;
        }
        
        if (checkCount >= maxChecks) {
          // console.log('⚠️ Fallback: Max checks reached, subscription still not available');
          clearInterval(checkInterval);
        }
      } catch (error) {
        console.error('Error in fallback check:', error);
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
        }
      }
    }, 5000);
  };

  /**
   * Store billing snapshot with retry mechanism to handle race conditions
   */
  const storeBillingSnapshotWithRetry = async (customerInfo: any, maxRetries: number = 5, delayMs: number = 2000): Promise<{ success: boolean; error?: string }> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // console.log(`🔄 Billing snapshot attempt ${attempt}/${maxRetries}`);
      
      // Refresh customer info to get latest entitlements
      const freshCustomerInfo = await Purchases.getCustomerInfo();
      
      const result = await storeBillingSnapshot(freshCustomerInfo);
      if (result.success) {
        // console.log(`✅ Billing snapshot stored successfully on attempt ${attempt}`);
        return result;
      }
      
      // console.log(`⚠️ Attempt ${attempt} failed: ${result.error}`);
      
      // If this is the last attempt, return the error
      if (attempt === maxRetries) {
        return result;
      }
      
      // Wait before retrying
      // console.log(`⏳ Waiting ${delayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    return { success: false, error: 'Max retries exceeded' };
  };

  /**
   * Store billing snapshot in Supabase
   * Simplified and more accurate subscription data extraction
   */
  const storeBillingSnapshot = async (customerInfo: any): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      // console.log('🔍 Processing RevenueCat customer info:', {
      //   hasEntitlements: !!customerInfo.entitlements,
      //   hasActiveEntitlements: !!customerInfo.entitlements?.active,
      //   hasActiveSubscriptions: !!customerInfo.activeSubscriptions,
      //   hasPurchasedProducts: !!customerInfo.allPurchasedProductIdentifiers?.length
      // });

      // Extract subscription data using simplified, more reliable logic
      const subscriptionData = extractSubscriptionData(customerInfo);
      
      if (!subscriptionData) {
        return { success: false, error: 'No valid subscription data found' };
      }

      // Add user-specific data
      const finalSubscriptionData = {
        ...subscriptionData,
        user_id: user.id,
        rc_app_user_id: customerInfo.originalAppUserId,
        rc_original_app_user_id: customerInfo.originalAppUserId,
        rc_snapshot: customerInfo.rawData || customerInfo,
      };

      // console.log('📊 Final subscription data:', {
      //   product_id: finalSubscriptionData.product_id,
      //   is_active: finalSubscriptionData.is_active,
      //   is_trial: finalSubscriptionData.is_trial,
      //   will_renew: finalSubscriptionData.will_renew,
      //   current_period_end: finalSubscriptionData.current_period_end
      // });

      // Check if this RevenueCat user ID is already associated with a different user
      const { data: existingByRevenueCat, error: rcCheckError } = await supabaseClient
        .from('user_subscriptions')
        .select('id, user_id, is_active, is_trial')
        .eq('rc_app_user_id', finalSubscriptionData.rc_app_user_id)
        .single();

      if (rcCheckError && rcCheckError.code !== 'PGRST116') {
        console.error('Error checking existing RevenueCat subscription:', rcCheckError);
        return { success: false, error: rcCheckError.message };
      }

      // Check if there's already an active subscription for this user
      const { data: existingActiveSubscription, error: activeCheckError } = await supabaseClient
        .from('user_subscriptions')
        .select('id, user_id, rc_app_user_id, is_active')
        .eq('user_id', finalSubscriptionData.user_id)
        .eq('is_active', true)
        .maybeSingle();

      if (activeCheckError) {
        console.error('Error checking existing active subscription:', activeCheckError);
        return { success: false, error: activeCheckError.message };
      }

      if (existingByRevenueCat) {
        // This RevenueCat user ID is already associated with a different user
        if (existingByRevenueCat.user_id !== finalSubscriptionData.user_id) {
          // console.log('⚠️ Subscription already redeemed by another account:', existingByRevenueCat.user_id);
          return { 
            success: false, 
            error: 'This subscription is already linked to another account. Please sign in with the original account or use a different device/Apple ID to purchase a new subscription.' 
          };
        } else {
          // Same user - update the existing subscription
          // console.log('✅ Updating existing subscription with same RevenueCat user ID');
          const { error: updateError } = await supabaseClient
            .from('user_subscriptions')
            .update(finalSubscriptionData)
            .eq('id', existingByRevenueCat.id);

          if (updateError) {
            console.error('Error updating subscription:', updateError);
            return { success: false, error: updateError.message };
          }
          // console.log('✅ Updated existing subscription entry');
        }
      } else if (existingActiveSubscription) {
        // There's an active subscription for this user but with different RevenueCat ID
        // This can happen if user purchased on a different device or there was a previous attempt
        // console.log('⚠️ Found existing active subscription with different RevenueCat ID, updating it');
        
        // Re-check if the new RevenueCat ID exists (to catch race conditions with webhooks)
        const { data: recheckByRevenueCat, error: recheckError } = await supabaseClient
          .from('user_subscriptions')
          .select('id, user_id, is_active')
          .eq('rc_app_user_id', finalSubscriptionData.rc_app_user_id)
          .maybeSingle();

        if (recheckError && recheckError.code !== 'PGRST116') {
          console.error('Error re-checking RevenueCat subscription:', recheckError);
          return { success: false, error: recheckError.message };
        }

        if (recheckByRevenueCat) {
          // The new RevenueCat ID now exists (possibly inserted by webhook)
          if (recheckByRevenueCat.user_id !== finalSubscriptionData.user_id) {
            // Belongs to a different user - this is an error
            // console.log('⚠️ New RevenueCat ID already linked to another account:', recheckByRevenueCat.user_id);
            return { 
              success: false, 
              error: 'This subscription is already linked to another account. Please sign in with the original account or use a different device/Apple ID to purchase a new subscription.' 
            };
          } else {
            // Belongs to the same user - update that record and deactivate the old one
            // console.log('✅ New RevenueCat ID exists for same user, updating that record and deactivating old one');
            
            // Update the record with the new RevenueCat ID
            const { error: updateNewError } = await supabaseClient
              .from('user_subscriptions')
              .update(finalSubscriptionData)
              .eq('id', recheckByRevenueCat.id);

            if (updateNewError) {
              console.error('Error updating subscription with new RevenueCat ID:', updateNewError);
              return { success: false, error: updateNewError.message };
            }

            // Deactivate the old subscription
            const { error: deactivateError } = await supabaseClient
              .from('user_subscriptions')
              .update({ is_active: false })
              .eq('id', existingActiveSubscription.id);

            if (deactivateError) {
              console.error('Error deactivating old subscription:', deactivateError);
              // Don't fail the whole operation if deactivation fails
            } else {
              // console.log('✅ Deactivated old subscription entry');
            }

            // console.log('✅ Updated subscription with new RevenueCat ID');
          }
        } else {
          // New RevenueCat ID doesn't exist - safe to update the old subscription
          const { error: updateError } = await supabaseClient
            .from('user_subscriptions')
            .update(finalSubscriptionData)
            .eq('id', existingActiveSubscription.id);

          if (updateError) {
            // Check if this is a unique constraint violation
            if (updateError.code === '23505') {
              // console.log('⚠️ Unique constraint violation detected, re-checking for race condition...');
              
              // Re-check if the new ID was inserted between our check and update
              const { data: finalCheck, error: finalCheckError } = await supabaseClient
                .from('user_subscriptions')
                .select('id, user_id, is_active')
                .eq('rc_app_user_id', finalSubscriptionData.rc_app_user_id)
                .maybeSingle();

              if (finalCheckError && finalCheckError.code !== 'PGRST116') {
                console.error('Error in final check after constraint violation:', finalCheckError);
                return { success: false, error: finalCheckError.message };
              }

              if (finalCheck) {
                // The new ID now exists - handle it
                if (finalCheck.user_id !== finalSubscriptionData.user_id) {
                  // console.log('⚠️ New RevenueCat ID now linked to another account:', finalCheck.user_id);
                  return { 
                    success: false, 
                    error: 'This subscription is already linked to another account. Please sign in with the original account or use a different device/Apple ID to purchase a new subscription.' 
                  };
                } else {
                  // Same user - update that record and deactivate old one
                  // console.log('✅ New RevenueCat ID now exists for same user, updating that record');
                  
                  const { error: updateNewError } = await supabaseClient
                    .from('user_subscriptions')
                    .update(finalSubscriptionData)
                    .eq('id', finalCheck.id);

                  if (updateNewError) {
                    console.error('Error updating subscription with new RevenueCat ID:', updateNewError);
                    return { success: false, error: updateNewError.message };
                  }

                  // Deactivate the old subscription
                  const { error: deactivateError } = await supabaseClient
                    .from('user_subscriptions')
                    .update({ is_active: false })
                    .eq('id', existingActiveSubscription.id);

                  if (deactivateError) {
                    console.error('Error deactivating old subscription:', deactivateError);
                  } else {
                    // console.log('✅ Deactivated old subscription entry');
                  }

                  // console.log('✅ Updated subscription with new RevenueCat ID after constraint violation');
                }
              } else {
                // Still doesn't exist - this is unexpected, return the original error
                console.error('Error updating existing active subscription:', updateError);
                return { success: false, error: updateError.message };
              }
            } else {
              // Not a unique constraint violation - return the error
              console.error('Error updating existing active subscription:', updateError);
              return { success: false, error: updateError.message };
            }
          } else {
            // console.log('✅ Updated existing active subscription entry');
          }
        }
      } else {
        // No existing subscription, create new one
        const { error: insertError } = await supabaseClient
          .from('user_subscriptions')
          .insert(finalSubscriptionData);

        if (insertError) {
          console.error('Error inserting new subscription:', insertError);
          return { success: false, error: insertError.message };
        }
        // console.log('✅ Created new subscription entry');
      }


      // console.log('✅ Billing snapshot stored successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error storing billing snapshot:', err);
      return { success: false, error: err.message || 'Failed to store billing information' };
    }
  };

  /**
   * Extract subscription data from RevenueCat customer info
   * Enhanced logic with better trial detection
   */
  const extractSubscriptionData = (customerInfo: any) => {
    // console.log('🔍 Full customerInfo for trial detection:', JSON.stringify(customerInfo, null, 2));
    
    // Priority 1: Active entitlements (most reliable)
    const activeEntitlements = customerInfo.entitlements?.active || {};
    const proEntitlement = activeEntitlements['pro'];
    
    if (proEntitlement) {
      // console.log('✅ Using active pro entitlement data');
      // console.log('🔍 Pro entitlement details:', JSON.stringify(proEntitlement, null, 2));
      
      // Enhanced trial detection - check multiple sources
      let isTrial = false;
      
      // 1. Check RevenueCat's built-in trial indicators
      if (proEntitlement.periodType === 'trial' || proEntitlement.isInTrialPeriod) {
        isTrial = true;
        // console.log('🔄 Detected trial from RevenueCat indicators');
      }
      
      // 2. Check if this is a trial based on product identifier
      if (!isTrial && proEntitlement.productIdentifier) {
        const productId = proEntitlement.productIdentifier.toLowerCase();
        if (productId.includes('trial') || productId.includes('free')) {
          isTrial = true;
          // console.log('🔄 Detected trial from product identifier:', productId);
        }
      }
      
      // 3. Check active subscriptions for trial indicators
      if (!isTrial && customerInfo.activeSubscriptions) {
        const activeSubs = customerInfo.activeSubscriptions;
        for (const [productId, subscription] of Object.entries(activeSubs)) {
          const sub = subscription as any;
          if (sub.isTrialPeriod || sub.periodType === 'trial' || sub.isInTrialPeriod) {
            isTrial = true;
            // console.log('🔄 Detected trial from active subscription:', productId);
            break;
          }
        }
      }
      
      // 4. Check if expiration date suggests a trial (short period)
      if (!isTrial && proEntitlement.expirationDate) {
        const expirationDate = new Date(proEntitlement.expirationDate);
        const purchaseDate = new Date(proEntitlement.originalPurchaseDate || proEntitlement.purchaseDate);
        const daysDifference = Math.ceil((expirationDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDifference <= 7) {
          isTrial = true;
          // console.log('🔄 Detected trial from short expiration period:', daysDifference, 'days');
        }
      }
      
      // 5. Check if this is a new subscription (likely trial if very recent)
      if (!isTrial && proEntitlement.originalPurchaseDate) {
        const purchaseDate = new Date(proEntitlement.originalPurchaseDate);
        const now = new Date();
        const hoursSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);
        
        // If purchased within last 2 hours and no explicit trial indicators, assume trial
        if (hoursSincePurchase <= 2) {
          isTrial = true;
          // console.log('🔄 Detected trial from recent purchase (within 2 hours)');
        }
      }
      
      // console.log('🎯 Final trial detection result:', isTrial);
      
      return {
        entitlement: 'pro',
        product_id: proEntitlement.productIdentifier || 'unknown',
        store: proEntitlement.store || 'app_store',
        is_active: true,
        is_trial: isTrial,
        will_renew: proEntitlement.willRenew || false,
        current_period_end: proEntitlement.expirationDate || new Date().toISOString(),
        original_purchase_at: proEntitlement.originalPurchaseDate || new Date().toISOString(),
      };
    }

    // Priority 2: All entitlements (for inactive but valid subscriptions)
    const allEntitlements = customerInfo.entitlements || {};
    const anyProEntitlement = allEntitlements['pro'];
    
    if (anyProEntitlement) {
      // console.log('✅ Using pro entitlement from all entitlements');
      return {
        entitlement: 'pro',
        product_id: anyProEntitlement.productIdentifier || 'unknown',
        store: anyProEntitlement.store || 'app_store',
        is_active: anyProEntitlement.isActive || false,
        is_trial: anyProEntitlement.periodType === 'trial' || anyProEntitlement.isInTrialPeriod || false,
        will_renew: anyProEntitlement.willRenew || false,
        current_period_end: anyProEntitlement.expirationDate || new Date().toISOString(),
        original_purchase_at: anyProEntitlement.originalPurchaseDate || new Date().toISOString(),
      };
    }

    // Priority 3: Active subscriptions (fallback)
    const activeSubscriptions = customerInfo.activeSubscriptions || {};
    const activeSubKeys = Object.keys(activeSubscriptions);
    
    if (activeSubKeys.length > 0) {
      const firstSubscription = activeSubscriptions[activeSubKeys[0]];
      // console.log('⚠️ Using active subscription fallback data');
      
      // Determine if this is a trial based on customer info
      const isTrial = customerInfo.entitlements?.active?.pro?.isInTrialPeriod || 
                     customerInfo.entitlements?.active?.pro?.periodType === 'trial' || 
                     false;
      
      return {
        entitlement: 'pro',
        product_id: typeof firstSubscription === 'string' ? firstSubscription : firstSubscription?.productIdentifier || 'unknown',
        store: 'app_store',
        is_active: true,
        is_trial: isTrial,
        will_renew: customerInfo.entitlements?.active?.pro?.willRenew || true,
        current_period_end: calculateExpirationDate(firstSubscription, isTrial),
        original_purchase_at: new Date().toISOString(),
      };
    }

    // Priority 4: Purchased products (last resort)
    const purchasedProducts = customerInfo.allPurchasedProductIdentifiers || [];
    const proProduct = purchasedProducts.find((id: string) => 
      id.includes('dreamer') || id.includes('pro') || id.includes('premium') || id.includes('subscription')
    );
    
    if (proProduct) {
      // console.log('⚠️ Using purchased product fallback data');
      
      // Enhanced trial detection for fallback
      let isTrial = false;
      
      // Check if this is a recent purchase (likely trial)
      if (customerInfo.originalPurchaseDate) {
        const purchaseDate = new Date(customerInfo.originalPurchaseDate);
        const now = new Date();
        const hoursSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSincePurchase <= 2) {
          isTrial = true;
          // console.log('🔄 Detected trial from recent purchase in fallback');
        }
      }
      
      // Check active subscriptions for trial indicators
      if (!isTrial && customerInfo.activeSubscriptions) {
        const activeSubs = customerInfo.activeSubscriptions;
        for (const [productId, subscription] of Object.entries(activeSubs)) {
          const sub = subscription as any;
          if (sub.isTrialPeriod || sub.periodType === 'trial' || sub.isInTrialPeriod) {
            isTrial = true;
            // console.log('🔄 Detected trial from active subscription in fallback:', productId);
            break;
          }
        }
      }
      
      return {
        entitlement: 'pro',
        product_id: proProduct,
        store: 'app_store',
        is_active: true,
        is_trial: isTrial,
        will_renew: !isTrial, // Assume renewing unless it's a trial
        current_period_end: calculateExpirationDate(proProduct, isTrial),
        original_purchase_at: new Date().toISOString(),
      };
    }

    // console.log('❌ No valid subscription data found');
    return null;
  };

  /**
   * Calculate expiration date based on product type and trial status
   */
  const calculateExpirationDate = (productId: string | any, isTrial: boolean): string => {
    const now = new Date();
    const expirationDate = new Date(now);
    
    if (isTrial) {
      // Trial periods are typically 3-7 days
      expirationDate.setDate(expirationDate.getDate() + 3);
    } else if (typeof productId === 'string') {
      if (productId.includes('annual') || productId.includes('yearly')) {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      } else if (productId.includes('monthly')) {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else {
        // Default to monthly
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      }
    } else {
      // Default to monthly
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    }
    
    return expirationDate.toISOString();
  };

  /**
   * Validate subscription with server
   */
  const validateSubscription = async (forceRefresh: boolean = false): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      // console.log('🔍 Validating subscription with server...');
      
      const response = await fetch(`https://cqzutvspbsspgtmcdqyp.supabase.co/functions/v1/subscription-validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          force_refresh: forceRefresh
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to validate subscription' };
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        // console.log('✅ Subscription validated:', data.data);
        
        // Update local state if validation shows different data
        if (data.data.needs_attention) {
          // console.warn('⚠️ Subscription needs attention:', data.data.issues);
        }
        
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error: any) {
      console.error('❌ Error validating subscription:', error);
      return { success: false, error: error.message || 'Failed to validate subscription' };
    }
  };

  /**
   * Restore purchases
   */
  /**
   * Restore purchases
   * 
   * Note: We don't set loading state here to prevent navigation resets.
   * Components handle their own loading state for UI feedback.
   */
  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      
      if (!isRevenueCatConfigured()) {
        return { success: false, error: 'RevenueCat not configured' };
      }
      
      if (!Purchases || typeof Purchases.restorePurchases !== 'function') {
        return { success: false, error: 'RevenueCat not properly initialized' };
      }
      
      const info = await Purchases.restorePurchases();
      
      // Only update customerInfo if we have active subscriptions
      // This prevents triggering navigation resets when there are no subscriptions
      if (info.entitlements?.active?.['pro']) {
        setCustomerInfo(info);
        return { success: true };
      } else {
        return { success: false, error: 'No active subscriptions found' };
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to restore purchases';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Debug function to check current state
   */
  const debugState = () => {
    // console.log('🔍 EntitlementsContext Debug State:', {
    //   isAuthenticated,
    //   userId: user?.id,
    //   customerInfo: customerInfo ? {
    //     hasProAccess: customerInfo.entitlements?.active?.['pro'] || false,
    //     userId: customerInfo.originalAppUserId,
    //     isAnonymous: customerInfo.originalAppUserId?.startsWith('$RCAnonymousID'),
    //   } : null,
    //   linking,
    //   linkingAttempted: linkingAttempted.current,
    //   isRevenueCatConfigured: isRevenueCatConfigured(),
    // });
  };

  // Set up RevenueCat listener and initial customer info fetch
  useEffect(() => {
    let isMounted = true;

    const setupEntitlements = async () => {
      try {
        setLoading(true);
        
        // Wait for RevenueCat initialization to complete
        const isConfigured = await waitForRevenueCatInitialization();
        
        if (!isConfigured) {
          // console.log('RevenueCat not configured, using mock mode for entitlements');
          if (isMounted) {
            // Set mock customer info for development
            setCustomerInfo({
              entitlements: { active: {} },
              originalAppUserId: '$RCAnonymousID:mock-user-id'
            });
            setLoading(false);
          }
          return;
        }
        
        // Double-check that Purchases is available and has the required methods
        if (!Purchases || typeof Purchases.getCustomerInfo !== 'function') {
          // console.log('RevenueCat Purchases object not properly initialized');
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
        
        // Get initial customer info
        try {
          const info = await Purchases.getCustomerInfo();
          if (isMounted) {
            setCustomerInfo(info);
            // console.log('Initial customer info loaded:', {
            //   hasProAccess: info.entitlements?.active?.['pro'] || false,
            //   userId: info.originalAppUserId,
            // });
          }
          
          // Set up listener for customer info changes
          if (typeof Purchases.addCustomerInfoUpdateListener === 'function') {
            Purchases.addCustomerInfoUpdateListener(async (info: any) => {
              if (isMounted) {
                setCustomerInfo(info);
                // console.log('Customer info updated:', {
                //   hasProAccess: info.entitlements?.active?.['pro'] || false,
                //   userId: info.originalAppUserId,
                // });
                
                // Auto-store billing snapshot when entitlement becomes active
                if (info.entitlements?.active?.['pro'] && user?.id) {
                  // console.log('Entitlement became active, storing billing snapshot...');
                  try {
                    await storeBillingSnapshot(info);
                  } catch (error) {
                    console.error('Error auto-storing billing snapshot:', error);
                  }
                }
              }
            });
          }
        } catch (purchasesError: any) {
          console.error('Error with RevenueCat operations:', purchasesError);
          if (isMounted) {
            setError('Failed to initialize subscription service');
          }
        }
        
      } catch (err: any) {
        console.error('Error setting up entitlements:', err);
        if (isMounted) {
          setError(err.message || 'Failed to initialize subscription status');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    setupEntitlements();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-link RevenueCat user when user authenticates
  useEffect(() => {
    if (isAuthenticated && user && !linking) {
      // Check if we've already attempted linking for this user
      if (linkingAttempted.current === user.id) {
        return; // Already attempted linking for this user
      }
      
      const linkUser = async () => {
        try {
          // console.log('🔗 Auto-linking triggered for authenticated user:', user.id);
          debugState(); // Debug current state
          
          // Get fresh customer info to check current state
          let currentCustomerInfo = customerInfo;
          if (!currentCustomerInfo && isRevenueCatConfigured()) {
            try {
              currentCustomerInfo = await Purchases.getCustomerInfo();
              // console.log('Fetched fresh customer info for linking:', {
              //   hasProAccess: currentCustomerInfo.entitlements?.active?.['pro'] || false,
              //   userId: currentCustomerInfo.originalAppUserId,
              // });
            } catch (err) {
              console.error('Error fetching customer info for linking:', err);
              return;
            }
          }
          
          // Only link if the RevenueCat user is anonymous (starts with $RCAnonymousID)
          if (currentCustomerInfo?.originalAppUserId && currentCustomerInfo.originalAppUserId.startsWith('$RCAnonymousID')) {
            // console.log('🔗 Auto-linking anonymous RevenueCat user with authenticated user:', user.id);
            linkingAttempted.current = user.id; // Mark as attempted
            const linkResult = await linkRevenueCatUser(user.id);
            
            if (linkResult.success) {
              // console.log('✅ Auto-linking successful, storing billing snapshot...');
              // Store billing snapshot after successful linking
              await storeBillingSnapshot(currentCustomerInfo);
            } else {
              console.error('❌ Auto-linking failed:', linkResult.error);
            }
          } else {
            // console.log('RevenueCat user already linked or not anonymous:', currentCustomerInfo?.originalAppUserId);
          }
        } catch (err) {
          console.error('Error auto-linking user:', err);
          linkingAttempted.current = null; // Reset on error to allow retry
        }
      };

      linkUser();
    } else if (!isAuthenticated && isRevenueCatConfigured()) {
      // User logged out - log out RevenueCat to return to anonymous
      const logoutRevenueCat = async () => {
        try {
          if (Purchases && typeof Purchases.logOut === 'function') {
            // Check if user is not already anonymous before logging out
            if (customerInfo && customerInfo.originalAppUserId && !customerInfo.originalAppUserId.startsWith('$RCAnonymousID')) {
              await Purchases.logOut();
              // console.log('✅ RevenueCat logged out - returned to anonymous user');
            } else {
              // console.log('RevenueCat user is already anonymous, skipping logout');
            }
            // Clear customer info to reflect anonymous state
            setCustomerInfo(null);
          }
          // Reset linking attempt tracking on logout
          linkingAttempted.current = null;
        } catch (err) {
          console.error('Error logging out RevenueCat:', err);
        }
      };
      
      logoutRevenueCat();
    }
  }, [isAuthenticated, user?.id, linking]);

  const value: EntitlementsHook = {
    // State
    customerInfo,
    hasProAccess,
    loading,
    error,
    linking,
    
    // Operations
    refreshCustomerInfo,
    linkRevenueCatUser,
    storeBillingSnapshot,
    restorePurchases,
    validateSubscription,
    clearError,
    debugState,
  };

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
};

export const useEntitlementsContext = (): EntitlementsHook => {
  const context = useContext(EntitlementsContext);
  
  if (context === undefined) {
    throw new Error(
      'useEntitlementsContext must be used within an EntitlementsProvider. ' +
      'Make sure to wrap your app with <EntitlementsProvider> before using this hook.'
    );
  }
  
  return context;
};
