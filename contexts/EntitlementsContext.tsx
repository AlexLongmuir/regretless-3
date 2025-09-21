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
  console.log('RevenueCat types not available, using mock types');
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
  // Clear error state
  clearError: () => void;
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
        console.log('RevenueCat not configured, skipping refresh');
        return;
      }
      
      // Double-check that Purchases is available and has the required methods
      if (!Purchases || typeof Purchases.getCustomerInfo !== 'function') {
        console.log('RevenueCat Purchases object not properly initialized for refresh');
        return;
      }
      
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      
      console.log('Customer info refreshed:', {
        hasProAccess: info.entitlements?.active?.['pro'] || false,
        userId: info.originalAppUserId,
      });
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
        console.log('RevenueCat not configured, skipping link');
        return { success: true }; // Return success for mock mode
      }
      
      // Double-check that Purchases is available and has the required methods
      if (!Purchases || typeof Purchases.logIn !== 'function' || typeof Purchases.getAppUserID !== 'function') {
        console.log('RevenueCat Purchases object not properly initialized for link');
        return { success: false, error: 'RevenueCat not properly initialized' };
      }
      
      // Get current RevenueCat user ID
      const currentRevenueCatUserId = await Purchases.getAppUserID();
      console.log('🔗 RevenueCat linking check:', {
        currentRevenueCatUserId,
        targetUserId: userId,
        isAnonymous: currentRevenueCatUserId?.startsWith('$RCAnonymousID'),
        userEmail: user?.email,
      });
      
      // Only link if currently anonymous
      if (!currentRevenueCatUserId?.startsWith('$RCAnonymousID')) {
        console.log('RevenueCat already linked to a named user, skipping link');
        return { success: true };
      }
      
      // Link the anonymous user with the authenticated user
      console.log('🔗 Linking anonymous RevenueCat user to authenticated user:', userId);
      const { customerInfo: linkedCustomerInfo } = await Purchases.logIn(userId);
      
      // Use the fresh customerInfo from logIn response, not cached data
      setCustomerInfo(linkedCustomerInfo);
      
      console.log('✅ Successfully linked RevenueCat user:', {
        userId,
        hasProAccess: linkedCustomerInfo.entitlements?.active?.['pro'] || false,
      });
      
      // Try to store billing snapshot (handles both active entitlements and trials)
      console.log('Attempting to store billing snapshot...');
      const storeResult = await storeBillingSnapshot(linkedCustomerInfo);
      if (storeResult.success) {
        console.log('✅ Billing snapshot stored successfully');
      } else {
        console.log('⚠️ Billing snapshot not stored:', storeResult.error);
        console.log('Will store when subscription becomes available');
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
   * Store billing snapshot in Supabase
   */
  const storeBillingSnapshot = async (customerInfo: any): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      // Extract subscription data from RevenueCat customer info
      const activeEntitlements = customerInfo.entitlements?.active || {};
      const allEntitlements = customerInfo.entitlements || {};
      
      // Look for pro entitlement in active or all entitlements (for trials)
      let proEntitlement = activeEntitlements['pro'];
      if (!proEntitlement) {
        // Check if there's a pro entitlement in trial or other states
        proEntitlement = allEntitlements['pro'];
      }
      
      // Also check activeSubscriptions for trial subscriptions
      const activeSubscriptions = customerInfo.activeSubscriptions || {};
      const hasActiveSubscription = Object.keys(activeSubscriptions).length > 0;
      
      console.log('🔍 Subscription analysis:', {
        hasActiveEntitlement: !!activeEntitlements['pro'],
        hasAnyProEntitlement: !!allEntitlements['pro'],
        hasActiveSubscriptions: hasActiveSubscription,
        activeSubscriptions: Object.keys(activeSubscriptions),
        allEntitlements: Object.keys(allEntitlements)
      });
      
      // Store if we have an active entitlement OR an active subscription (trial)
      if (!proEntitlement && !hasActiveSubscription) {
        return { success: false, error: 'No active pro subscription or trial found' };
      }

      // Prepare subscription data for Supabase
      // If we have a pro entitlement, use it; otherwise use the first active subscription
      const subscriptionInfo = proEntitlement || (hasActiveSubscription ? Object.values(activeSubscriptions)[0] : null);
      
      const subscriptionData = {
        user_id: user.id,
        rc_app_user_id: customerInfo.originalAppUserId,
        rc_original_app_user_id: customerInfo.originalAppUserId,
        entitlement: 'pro',
        product_id: subscriptionInfo?.productIdentifier || 'unknown',
        store: subscriptionInfo?.store || 'app_store',
        is_active: true,
        is_trial: subscriptionInfo?.periodType === 'trial' || (subscriptionInfo?.willRenew === false && subscriptionInfo?.periodType === 'trial'),
        will_renew: subscriptionInfo?.willRenew || false,
        current_period_end: subscriptionInfo?.expirationDate || new Date().toISOString(),
        original_purchase_at: subscriptionInfo?.originalPurchaseDate || new Date().toISOString(),
        rc_snapshot: customerInfo.rawData || {},
      };

      // Upsert subscription data
      const { error: upsertError } = await supabaseClient
        .from('user_subscriptions')
        .upsert(subscriptionData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error storing billing snapshot:', upsertError);
        return { success: false, error: upsertError.message };
      }

      console.log('Billing snapshot stored successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error storing billing snapshot:', err);
      return { success: false, error: err.message || 'Failed to store billing information' };
    }
  };

  /**
   * Restore purchases
   */
  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if RevenueCat is properly configured
      if (!isRevenueCatConfigured()) {
        console.log('RevenueCat not configured, skipping restore');
        return { success: false, error: 'RevenueCat not configured' };
      }
      
      // Double-check that Purchases is available and has the required methods
      if (!Purchases || typeof Purchases.restorePurchases !== 'function') {
        console.log('RevenueCat Purchases object not properly initialized for restore');
        return { success: false, error: 'RevenueCat not properly initialized' };
      }
      
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      
      if (info.entitlements?.active?.['pro']) {
        console.log('Purchases restored successfully');
        return { success: true };
      } else {
        return { success: false, error: 'No active subscriptions found' };
      }
    } catch (err: any) {
      console.error('Error restoring purchases:', err);
      const errorMessage = err.message || 'Failed to restore purchases';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
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
          console.log('RevenueCat not configured, using mock mode for entitlements');
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
          console.log('RevenueCat Purchases object not properly initialized');
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
            console.log('Initial customer info loaded:', {
              hasProAccess: info.entitlements?.active?.['pro'] || false,
              userId: info.originalAppUserId,
            });
          }
          
          // Set up listener for customer info changes
          if (typeof Purchases.addCustomerInfoUpdateListener === 'function') {
            Purchases.addCustomerInfoUpdateListener(async (info: any) => {
              if (isMounted) {
                setCustomerInfo(info);
                console.log('Customer info updated:', {
                  hasProAccess: info.entitlements?.active?.['pro'] || false,
                  userId: info.originalAppUserId,
                });
                
                // Auto-store billing snapshot when entitlement becomes active
                if (info.entitlements?.active?.['pro'] && user?.id) {
                  console.log('Entitlement became active, storing billing snapshot...');
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
    if (isAuthenticated && user && customerInfo && !linking) {
      // Check if we've already attempted linking for this user
      if (linkingAttempted.current === user.id) {
        return; // Already attempted linking for this user
      }
      
      const linkUser = async () => {
        try {
          // Only link if the RevenueCat user is anonymous
          if (customerInfo.originalAppUserId && customerInfo.originalAppUserId !== user.id) {
            console.log('Auto-linking RevenueCat user with authenticated user');
            linkingAttempted.current = user.id; // Mark as attempted
            await linkRevenueCatUser(user.id);
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
            await Purchases.logOut();
            console.log('✅ RevenueCat logged out - returned to anonymous user');
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
  }, [isAuthenticated, user?.id, customerInfo?.originalAppUserId, linking]);

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
    clearError,
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
