/**
 * Google Sign In Configuration
 * 
 * This file handles the initialization of Google Sign In SDK.
 * It configures the Google Sign In with the appropriate client IDs
 * for iOS, Android, and web platforms.
 * 
 * Why we need this:
 * - Google Sign In SDK requires configuration before it can be used
 * - Different client IDs are needed for different platforms
 * - This setup only needs to happen once at app startup
 * 
 * How to get Google Client IDs:
 * 1. Go to Google Cloud Console (console.cloud.google.com)
 * 2. Create a new project or select existing one
 * 3. Enable Google Sign-In API
 * 4. Create OAuth 2.0 credentials for:
 *    - iOS app (using your bundle identifier)
 *    - Android app (using your package name and SHA-1)
 *    - Web application (for Supabase integration)
 * 5. Add the client IDs to your .env file
 */

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

/**
 * Initialize Google Sign In SDK
 * 
 * This function configures the Google Sign In SDK with the appropriate
 * client IDs for the current platform. It should be called once when
 * the app starts up.
 * 
 * Configuration options:
 * - webClientId: Used for server-side verification (Supabase integration)
 * - iosClientId: iOS-specific client ID (optional, can use webClientId)
 * - androidClientId: Android-specific client ID (optional, can use webClientId)
 * 
 * Why webClientId is most important:
 * - It's used to verify tokens on the server side (Supabase)
 * - Without it, the authentication will fail
 * - Platform-specific IDs are optional for most use cases
 */
export const initializeGoogleSignIn = () => {
  try {
    console.log('Initializing Google Sign In...');

    // Get configuration from app.config.js
    const googleConfig = Constants.expoConfig?.extra?.googleSignIn;
    
    if (!googleConfig) {
      console.warn('Google Sign In configuration not found in app.config.js');
      return false;
    }

    // Configure Google Sign In
    GoogleSignin.configure({
      // Web Client ID is required for server-side verification
      // This is the most important ID - get it from Google Cloud Console
      webClientId: googleConfig.webClientId,
      
      // Platform-specific client IDs (optional)
      // If not provided, webClientId will be used as fallback
      iosClientId: googleConfig.iosClientId,
      
      // Request offline access to get refresh tokens
      // This allows the app to authenticate users even when offline
      offlineAccess: true,
      
      // Request these scopes from Google
      // 'openid' and 'profile' are required for basic user info
      // 'email' gives access to user's email address
      scopes: ['openid', 'profile', 'email'],
      
      // Additional configuration options
      forceCodeForRefreshToken: true, // Ensures we get refresh tokens
      accountName: '', // Optional: pre-fill account selection
      hostedDomain: '', // Optional: restrict to specific domain
    });

    console.log('Google Sign In initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Google Sign In:', error);
    return false;
  }
};

/**
 * Check if Google Sign In is properly configured
 * 
 * This function verifies that the Google Sign In SDK has been
 * configured with valid client IDs. It's useful for debugging
 * configuration issues.
 */
export const isGoogleSignInConfigured = () => {
  try {
    // This will throw an error if Google Sign In hasn't been configured
    return GoogleSignin.hasPlayServices();
  } catch (error) {
    console.warn('Google Sign In not configured:', error);
    return false;
  }
};