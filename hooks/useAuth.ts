/**
 * Custom hook for managing authentication state and operations.
 * 
 * This hook provides a simplified interface for:
 * - Managing user session state (user, loading, error)
 * - Sign up/in with email and password
 * - OAuth authentication with Apple and Google
 * - Sign out functionality
 * - Session persistence and restoration
 * 
 * Why this approach:
 * - Centralized auth logic in one place
 * - React hooks pattern for state management
 * - Automatic session restoration on app start
 * - Clean separation between auth logic and UI components
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabaseClient } from '../lib/supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';

// Define the shape of our auth state and operations
export interface AuthState {
  // Current authenticated user (null if not authenticated)
  user: User | null;
  // Loading state for async operations
  loading: boolean;
  // Error message from last failed operation
  error: string | null;
  // Computed boolean for convenience
  isAuthenticated: boolean;
  // Whether auth state is being initialized
  isInitializing: boolean;
}

export interface AuthOperations {
  // Sign up with email and password
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  // Sign in with email and password
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  // Sign in with magic link (passwordless email authentication)
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  // Sign in with native Apple Sign In (iOS only)
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  // Sign in with native Google Sign In
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  // Sign in with OAuth provider (Apple or Google) - web browser flow
  signInWithOAuth: (provider: 'apple' | 'google') => Promise<{ success: boolean; error?: string }>;
  // Handle authentication redirects from OAuth or magic links
  handleAuthRedirect: (url: string) => Promise<{ success: boolean; error?: string }>;
  // Sign out current user
  signOut: () => Promise<{ success: boolean; error?: string }>;
  // Clear any current error
  clearError: () => void;
}

// Combined type for the complete auth interface
export type AuthHook = AuthState & AuthOperations;

export const useAuth = (): AuthHook => {
  // State management for auth
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading=true for initial session check
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Helper function to handle auth errors consistently
   * Converts Supabase AuthError to user-friendly messages
   */
  const handleAuthError = (error: AuthError | Error): string => {
    // Common Supabase auth error codes and their user-friendly messages
    if ('code' in error) {
      switch (error.code) {
        case 'email_not_confirmed':
          return 'Please check your email and click the confirmation link';
        case 'invalid_credentials':
          return 'Invalid email or password';
        case 'user_not_found':
          return 'No account found with this email';
        case 'weak_password':
          return 'Password should be at least 6 characters';
        case 'email_already_exists':
          return 'An account with this email already exists';
        default:
          return error.message || 'An authentication error occurred';
      }
    }
    return error.message || 'An unexpected error occurred';
  };

  /**
   * Sign up a new user with email and password
   * Returns success status and error message if failed
   */
  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        const errorMessage = handleAuthError(signUpError);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Note: User won't be automatically signed in until they confirm their email
      // The user object will be returned but session will be null until confirmation
      console.log('Sign up successful:', data.user?.email);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign in existing user with email and password
   * Updates user state on success
   */
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const errorMessage = handleAuthError(signInError);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // User state will be updated by the auth state change listener
      console.log('Sign in successful:', data.user.email);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign in with magic link (passwordless email authentication)
   * 
   * Sends a magic link to the user's email. When clicked, it will redirect
   * to the app with authentication tokens that need to be handled by handleAuthRedirect.
   */
  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: magicLinkError } = await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          // Deep link that will open the app when magic link is clicked
          emailRedirectTo: 'dreamer://auth/callback',
        },
      });

      if (magicLinkError) {
        const errorMessage = handleAuthError(magicLinkError);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      console.log('Magic link sent successfully to:', email);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign in with native Apple Sign In (iOS only)
   * 
   * This uses the native iOS Sign in with Apple widget which provides
   * a much better user experience than the web browser flow.
   * 
   * How it works:
   * 1. Shows the native iOS Sign in with Apple dialog
   * 2. User authenticates with Face ID/Touch ID/passcode
   * 3. Apple returns an identity token
   * 4. We send this token to Supabase for authentication
   * 
   * Benefits over web flow:
   * - Native iOS UI (no browser)
   * - Better security (uses secure enclave)
   * - Faster authentication
   * - Consistent with iOS design guidelines
   * - Works offline for existing users
   */
  const signInWithApple = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if Apple authentication is available
      // This will be false on Android or in web browsers
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      
      console.log('Apple Sign In availability check:', isAvailable);
      console.log('Running on device:', !__DEV__ || Platform.OS === 'ios');
      
      if (!isAvailable) {
        console.log('Native Apple Sign In not available, falling back to OAuth...');
        // Fall back to OAuth flow if native is not available
        return await signInWithOAuth('apple');
      }

      console.log('Starting native Apple Sign In...');
      console.log('Bundle identifier:', Constants.expoConfig?.ios?.bundleIdentifier);
      console.log('iOS version:', Platform.Version);
      console.log('App version:', Constants.expoConfig?.version);

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('Apple Sign In successful, processing credential...');

      // Check if we got the required identity token
      if (!credential.identityToken) {
        const errorMessage = 'No identity token received from Apple';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Sign in to Supabase using the Apple identity token
      const { data, error: supabaseError } = await supabaseClient.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (supabaseError) {
        const errorMessage = handleAuthError(supabaseError);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (data?.user) {
        console.log('Apple Sign In completed successfully:', data.user.email);
        // User state will be updated by the auth state change listener
        return { success: true };
      } else {
        const errorMessage = 'No user data returned from Apple Sign In';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      // Handle user cancellation gracefully
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('Apple Sign In was cancelled by user');
        return { success: false, error: 'Sign in was cancelled' };
      }

      console.error('Apple Sign In error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error userInfo:', error.userInfo);
      
      // More specific error handling
      let errorMessage = 'Apple Sign In failed';
      if (error.code === 'ERR_REQUEST_CANCELED') {
        errorMessage = 'Sign in was canceled';
      } else if (error.code === 'ERR_REQUEST_NOT_HANDLED') {
        errorMessage = 'Apple Sign In not available on this device';
      } else if (error.code === 'ERR_REQUEST_NOT_INTERACTIVE') {
        errorMessage = 'Apple Sign In not available in this context';
      } else if (error.message?.includes('authorization attempt failed')) {
        errorMessage = 'Apple Sign In configuration issue - check Apple Developer Console';
      } else {
        errorMessage = error.message || 'Apple Sign In failed';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);


  /**
   * Handle authentication redirects from OAuth providers or magic links
   * 
   * This function processes the redirect URL that contains authentication tokens
   * and establishes a session with Supabase. It's called automatically by
   * signInWithOAuth and should also be called when handling deep links.
   */
  const handleAuthRedirect = useCallback(async (url: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Handling auth redirect:', url);
      console.log('URL includes auth/callback:', url.includes('auth/callback'));

      // Parse the URL to extract authentication parameters
      const parsedUrl = new URL(url);
      
      // Check if this is a hash-based redirect (OAuth) or query-based (magic link)
      let params: URLSearchParams;
      if (parsedUrl.hash) {
        // OAuth redirects use hash fragments (dreamer://auth/callback#access_token=...)
        params = new URLSearchParams(parsedUrl.hash.substring(1));
      } else {
        // Magic link redirects use query parameters (dreamer://auth/callback?access_token=...)
        params = new URLSearchParams(parsedUrl.search);
      }

      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const error_description = params.get('error_description');

      // Check for errors in the redirect
      if (error_description) {
        const errorMessage = `Authentication error: ${error_description}`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Validate that we have the required tokens
      if (!access_token || !refresh_token) {
        const errorMessage = 'Missing authentication tokens in redirect';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Establish the session with Supabase using the tokens
      const { data, error: sessionError } = await supabaseClient.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        const errorMessage = handleAuthError(sessionError);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (data?.user) {
        console.log('Authentication successful via redirect:', data.user.email);
        // User state will be updated by the auth state change listener
        return { success: true };
      } else {
        const errorMessage = 'No user data found in authentication response';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process authentication redirect';
      console.error('Error handling auth redirect:', error);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign in with OAuth provider (Apple or Google)
   * 
   * Opens the OAuth provider's authentication page in a browser,
   * handles the redirect, and processes the authentication tokens.
   * This is the complete OAuth flow for mobile apps.
   */
  const signInWithOAuth = useCallback(async (provider: 'apple' | 'google') => {
    try {
      setLoading(true);
      setError(null);

      // Generate proper redirect URI using Expo's AuthSession
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'dreamer' });

      // Step 1: Get the OAuth URL from Supabase
      const { data, error: oAuthError } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          // Use the properly generated redirect URI
          redirectTo,
          // Skip browser redirect for mobile apps - we'll handle it manually
          skipBrowserRedirect: true,
        },
      });

      if (oAuthError) {
        const errorMessage = handleAuthError(oAuthError);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (!data?.url) {
        const errorMessage = `No OAuth URL returned for ${provider}`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      console.log(`Opening ${provider} OAuth flow:`, data.url);

      // Step 2: Open the OAuth URL in a browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        'dreamer://auth/callback',
        {
          // Use ephemeral session for better security
          preferEphemeralSession: true,
          // Show the page in recent apps for better UX
          showInRecents: true,
        }
      );

      console.log(`${provider} OAuth session result:`, result);
      console.log('Result type:', result.type);
      console.log('Result URL:', 'url' in result ? result.url : 'No URL in result');

      // Step 3: Handle the result
      if (result.type === 'success' && result.url) {
        // The URL contains authentication tokens - process them
        const authResult = await handleAuthRedirect(result.url);
        return authResult;
      } else if (result.type === 'cancel') {
        // User cancelled the OAuth flow
        const errorMessage = `${provider} authentication was cancelled`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } else {
        // Some other error occurred
        const errorMessage = `${provider} authentication failed`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${provider} sign in failed`;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      // Ensure the browser session is properly closed
      WebBrowser.maybeCompleteAuthSession();
    }
  }, [handleAuthRedirect]);

  /**
   * Sign in with Google (Expo-compatible approach)
   * 
   * This uses the web browser OAuth flow which is compatible with Expo
   * managed workflow. While not as seamless as native, it provides
   * reliable Google authentication across all platforms.
   * 
   * How it works:
   * 1. Opens Google OAuth in a browser
   * 2. User authenticates with Google
   * 3. Browser redirects back to app with tokens
   * 4. We process the tokens with Supabase
   * 
   * Why we use this approach:
   * - Compatible with Expo managed workflow
   * - No native linking required
   * - Works on iOS, Android, and web
   * - Reliable and well-tested
   */
  const signInWithGoogle = useCallback(async () => {
    // Simply call the existing OAuth method with Google provider
    // This reuses all the browser-based OAuth logic we already have
    return await signInWithOAuth('google');
  }, [signInWithOAuth]);

  /**
   * Sign out the current user
   * Clears user state and redirects to appropriate screen
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: signOutError } = await supabaseClient.auth.signOut();

      if (signOutError) {
        const errorMessage = handleAuthError(signOutError);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // User state will be updated by the auth state change listener
      console.log('Sign out successful');
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear the current error state
   * Useful for dismissing error messages in UI
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Set up auth state listener and initial session restoration
   * This effect runs once when the hook is first used
   */
  useEffect(() => {
    console.log('Setting up auth state listener');

    // Listen for auth state changes (sign in, sign out, session refresh)
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'no user');
        
        // Update user state based on current session
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        
        // Always set loading to false after any auth state change
        setLoading(false);
      }
    );

    // Get initial session on app start
    // This handles cases where user was previously signed in
    const getInitialSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting initial session:', sessionError);
          setError('Failed to restore session');
        } else if (session?.user) {
          console.log('Restored session for:', session.user.email);
          setUser(session.user);
        } else {
          console.log('No existing session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setError('Failed to restore session');
      } finally {
        setLoading(false);
        setIsInitializing(false);
      }
    };

    // Check for initial session
    getInitialSession();

    // Cleanup subscription when hook is unmounted
    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  // Return the complete auth interface
  return {
    // State
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isInitializing,
    
    // Operations
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithApple,
    signInWithGoogle,
    signInWithOAuth,
    handleAuthRedirect,
    signOut,
    clearError,
  };
};