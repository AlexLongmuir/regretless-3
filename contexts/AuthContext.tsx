/**
 * AuthContext - Authentication Context Provider
 * 
 * This file creates a React Context for authentication state management.
 * It wraps the useAuth hook and provides authentication data to all child components.
 * 
 * Why use Context instead of just the hook directly?
 * 1. Single source of truth: One auth state shared across the entire app
 * 2. Performance: Prevents multiple auth listeners being created
 * 3. Convenience: Easy access to auth state from any component
 * 4. Type safety: Enforces proper usage with TypeScript
 * 
 * Usage:
 * 1. Wrap your app with <AuthProvider>
 * 2. Use useAuthContext() in any component to access auth state
 */

import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from 'react';
import { useAuth, AuthHook } from '../hooks/useAuth';
import { getPendingOnboardingDream, clearPendingOnboardingDream } from '../utils/onboardingFlow';
import { createDreamFromOnboardingData } from '../utils/onboardingDreamCreation';
import { supabaseClient } from '../lib/supabaseClient';
import { identifyUser, resetUser, setUserProperties } from '../lib/mixpanel';

/**
 * Extended AuthHook interface that includes onboarding dream creation state
 */
export interface ExtendedAuthHook extends AuthHook {
  isCreatingOnboardingDream: boolean;
  hasPendingOnboardingDream: boolean;
}

/**
 * Create the auth context with undefined as default
 * This forces components to use the context within an AuthProvider
 */
const AuthContext = createContext<ExtendedAuthHook | undefined>(undefined);

/**
 * Props for the AuthProvider component
 * Simple interface - just needs children to wrap
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 * 
 * This component wraps your app and provides authentication state to all children.
 * It uses the useAuth hook internally and shares that state via React Context.
 * 
 * Why this pattern:
 * - Centralizes auth state management
 * - Prevents multiple auth hooks from running simultaneously
 * - Provides a clean API for accessing auth throughout the app
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize the auth hook once at the top level
  const auth = useAuth();
  const hasProcessedPendingDream = useRef(false);
  const [isCreatingOnboardingDream, setIsCreatingOnboardingDream] = useState(false);
  const [hasPendingOnboardingDream, setHasPendingOnboardingDream] = useState(false);

  // Log auth state changes for debugging (remove in production)
  React.useEffect(() => {
    console.log('AuthProvider - Auth state updated:', {
      isAuthenticated: auth.isAuthenticated,
      loading: auth.loading,
      userEmail: auth.user?.email || 'none',
      error: auth.error,
    });

    // Mixpanel Identification
    if (auth.isAuthenticated && auth.user?.id) {
      identifyUser(auth.user.id);
      if (auth.user.email) {
        setUserProperties({
          $email: auth.user.email,
          $name: auth.user.email, // Using email as name for now
        });
      }
    }
  }, [auth.isAuthenticated, auth.loading, auth.user?.email, auth.error, auth.user?.id]);

  // Check for pending onboarding data on authentication
  useEffect(() => {
    const checkPendingData = async () => {
      if (!auth.isAuthenticated || !auth.user?.id || auth.loading) {
        setHasPendingOnboardingDream(false);
        return;
      }

      const pendingData = await getPendingOnboardingDream();
      setHasPendingOnboardingDream(!!pendingData && 
        pendingData.generatedAreas.length > 0 && 
        pendingData.generatedActions.length > 0
      );
    };

    checkPendingData();
  }, [auth.isAuthenticated, auth.user?.id, auth.loading]);

  // Check for and create pending onboarding dream when user becomes authenticated
  useEffect(() => {
    const processPendingOnboardingDream = async () => {
      // Only process if user is authenticated, has a user ID, and we haven't processed yet
      if (!auth.isAuthenticated || !auth.user?.id || hasProcessedPendingDream.current || auth.loading) {
        return;
      }

      // Mark as processing to prevent duplicate processing
      hasProcessedPendingDream.current = true;

      try {
        console.log('🔍 [ONBOARDING] Checking for pending onboarding dream...');
        
        // Get pending onboarding data
        const pendingData = await getPendingOnboardingDream();
        
        if (!pendingData) {
          console.log('✅ [ONBOARDING] No pending onboarding dream found');
          setHasPendingOnboardingDream(false);
          return;
        }

        // Check if we have the required data
        if (!pendingData.generatedAreas.length || !pendingData.generatedActions.length) {
          console.log('⚠️ [ONBOARDING] Pending data incomplete, clearing...');
          await clearPendingOnboardingDream();
          setHasPendingOnboardingDream(false);
          return;
        }

        // Update state to indicate we're creating
        setIsCreatingOnboardingDream(true);
        setHasPendingOnboardingDream(true);

        // Get auth token
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.access_token) {
          console.log('⚠️ [ONBOARDING] No auth token available, will retry later');
          setIsCreatingOnboardingDream(false);
          hasProcessedPendingDream.current = false; // Reset so we can retry
          return;
        }

        // Note: Duplicate dream check is disabled - if a dream already exists,
        // the backend will handle it appropriately. We proceed with creation.

        // Create the dream from pending data
        console.log('🎯 [ONBOARDING] Creating dream from pending onboarding data...');
        const dreamId = await createDreamFromOnboardingData(
          {
            name: pendingData.name,
            answers: pendingData.answers,
            dreamImageUrl: pendingData.dreamImageUrl,
            generatedAreas: pendingData.generatedAreas,
            generatedActions: pendingData.generatedActions,
          },
          session.access_token,
          auth.user.id
        );

        if (dreamId) {
          console.log('✅ [ONBOARDING] Dream created successfully from pending data, clearing...');
          await clearPendingOnboardingDream();
          setHasPendingOnboardingDream(false);
          
        // Note: DreamsPage will automatically refresh when it detects the state change
        } else {
          console.log('⚠️ [ONBOARDING] Dream creation failed, keeping pending data for retry');
          setIsCreatingOnboardingDream(false);
          hasProcessedPendingDream.current = false; // Reset so we can retry
        }
      } catch (error) {
        console.error('❌ [ONBOARDING] Error processing pending onboarding dream:', error);
        setIsCreatingOnboardingDream(false);
        // Clear pending data even on error to prevent retry loops
        await clearPendingOnboardingDream();
        setHasPendingOnboardingDream(false);
      } finally {
        setIsCreatingOnboardingDream(false);
      }
    };

    processPendingOnboardingDream();
  }, [auth.isAuthenticated, auth.user?.id, auth.loading]);


  // Reset processing flag when user logs out
  useEffect(() => {
    if (!auth.isAuthenticated) {
      hasProcessedPendingDream.current = false;
      setIsCreatingOnboardingDream(false);
      setHasPendingOnboardingDream(false);
      
      // Reset Mixpanel user on logout
      if (!auth.loading) {
        resetUser();
      }
    }
  }, [auth.isAuthenticated, auth.loading]);

  // Create extended context value
  const extendedAuth: ExtendedAuthHook = {
    ...auth,
    isCreatingOnboardingDream,
    hasPendingOnboardingDream,
  };

  return (
    <AuthContext.Provider value={extendedAuth}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access authentication context
 * 
 * This hook provides access to the auth state and operations from any component
 * that is wrapped by AuthProvider.
 * 
 * Why this pattern:
 * - Type safety: TypeScript will catch usage outside of AuthProvider
 * - Clear error messages: Helpful error if used incorrectly
 * - Clean API: Single hook to get all auth functionality
 * 
 * Example usage in a component:
 * ```
 * const { user, loading, signIn, signOut } = useAuthContext();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (user) return <AuthenticatedApp />;
 * return <LoginScreen />;
 * ```
 */
export const useAuthContext = (): ExtendedAuthHook => {
  const context = useContext(AuthContext);
  
  // Provide helpful error message if hook is used incorrectly
  if (context === undefined) {
    throw new Error(
      'useAuthContext must be used within an AuthProvider. ' +
      'Make sure to wrap your app with <AuthProvider> before using this hook.'
    );
  }
  
  return context;
};

/**
 * Type export for convenience
 * Other components can import this type if needed for prop typing
 */
export type { AuthHook as AuthContextType };