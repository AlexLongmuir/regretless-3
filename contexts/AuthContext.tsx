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

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, AuthHook } from '../hooks/useAuth';

/**
 * Create the auth context with undefined as default
 * This forces components to use the context within an AuthProvider
 */
const AuthContext = createContext<AuthHook | undefined>(undefined);

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

  // Log auth state changes for debugging (remove in production)
  React.useEffect(() => {
    console.log('AuthProvider - Auth state updated:', {
      isAuthenticated: auth.isAuthenticated,
      loading: auth.loading,
      userEmail: auth.user?.email || 'none',
      error: auth.error,
    });
  }, [auth.isAuthenticated, auth.loading, auth.user?.email, auth.error]);

  return (
    <AuthContext.Provider value={auth}>
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
export const useAuthContext = (): AuthHook => {
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