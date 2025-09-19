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

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Purchases from '../lib/revenueCat';
import { supabaseClient } from '../lib/supabaseClient';
import { useAuthContext } from './AuthContext';

// Try to get types from RevenueCat, fall back to mock types
let CustomerInfo: any;

try {
  const RevenueCat = require('react-native-purchases');
  CustomerInfo = RevenueCat.CustomerInfo;
} catch (error) {
  console.log('RevenueCat types not available, using mock types');
  const MockRevenueCat = require('../utils/revenueCatMock');
  CustomerInfo = MockRevenueCat.MockCustomerInfo;
}

export interface EntitlementsState {
  // Current customer info from RevenueCat
  customerInfo: CustomerInfo | null;
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
  storeBillingSnapshot: (customerInfo: CustomerInfo) => Promise<{ success: boolean; error?: string }>;
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
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  // Computed state
  const hasProAccess = customerInfo?.entitlements?.active?.['pro'] || false;

  /**
   * Refresh customer info from RevenueCat
   */
  const refreshCustomerInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
   */
  const linkRevenueCatUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLinking(true);
      setError(null);
      
      // Link the RevenueCat anonymous user with the authenticated user
      await Purchases.logIn(userId);
      console.log('Successfully linked RevenueCat user:', userId);
      
      // Refresh customer info after linking
      await refreshCustomerInfo();
      
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
  const storeBillingSnapshot = async (customerInfo: CustomerInfo): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      // Extract subscription data from RevenueCat customer info
      const activeEntitlements = customerInfo.entitlements?.active || {};
      const proEntitlement = activeEntitlements['pro'];
      
      if (!proEntitlement) {
        return { success: false, error: 'No active pro subscription found' };
      }

      // Prepare subscription data for Supabase
      const subscriptionData = {
        user_id: user.id,
        rc_app_user_id: customerInfo.originalAppUserId,
        rc_original_app_user_id: customerInfo.originalAppUserId,
        entitlement: 'pro',
        product_id: proEntitlement.productIdentifier || 'unknown',
        store: proEntitlement.store || 'app_store',
        is_active: true,
        is_trial: proEntitlement.willRenew === false && proEntitlement.periodType === 'trial',
        will_renew: proEntitlement.willRenew || false,
        current_period_end: proEntitlement.expirationDate || new Date().toISOString(),
        original_purchase_at: proEntitlement.originalPurchaseDate || new Date().toISOString(),
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
        
        // Get initial customer info
        const info = await Purchases.getCustomerInfo();
        if (isMounted) {
          setCustomerInfo(info);
        }
        
        // Set up listener for customer info changes
        Purchases.addCustomerInfoUpdateListener((info) => {
          if (isMounted) {
            setCustomerInfo(info);
            console.log('Customer info updated:', {
              hasProAccess: info.entitlements?.active?.['pro'] || false,
              userId: info.originalAppUserId,
            });
          }
        });
        
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
      const linkUser = async () => {
        try {
          // Only link if the RevenueCat user is anonymous
          if (customerInfo.originalAppUserId && customerInfo.originalAppUserId !== user.id) {
            console.log('Auto-linking RevenueCat user with authenticated user');
            await linkRevenueCatUser(user.id);
          }
        } catch (err) {
          console.error('Error auto-linking user:', err);
        }
      };

      linkUser();
    }
  }, [isAuthenticated, user, customerInfo, linking]);

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
