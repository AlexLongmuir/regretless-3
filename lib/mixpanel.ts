/**
 * Mixpanel Configuration and Initialization
 * 
 * This file handles the initialization of Mixpanel for analytics tracking.
 * It includes fallback to no-op implementation for development when no token is provided.
 */

// Import Mixpanel class from the SDK
import { Mixpanel } from 'mixpanel-react-native';

let mixpanelInstance: any = null;
let mixpanelToken: string | null = null;
let isConfigured = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize Mixpanel with your project token
 * 
 * @param token - Your Mixpanel project token
 * @param serverURL - Optional server URL. Defaults to US ('https://api.mixpanel.com').
 *                     Set to 'https://api-eu.mixpanel.com' for EU Data Residency
 */
export const initializeMixpanel = async (token?: string, serverURL?: string) => {
  // If already initializing, wait for that to complete
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      if (!token) {
        console.log('No Mixpanel token provided, using no-op implementation');
        isConfigured = false;
        return;
      }

      if (!Mixpanel) {
        console.log('Mixpanel SDK not available, using no-op implementation');
        isConfigured = false;
        return;
      }

      // Library Configuration
      const trackAutomaticEvents = false; // disable legacy autotrack mobile events
      const useNative = true;             // use Native Mode
      
      // Server URL configuration for data residency
      // Default to US servers, or use EU servers for EU Data Residency
      // US: 'https://api.mixpanel.com'
      // EU: 'https://api-eu.mixpanel.com'
      const mixpanelServerURL = serverURL || 'https://api.mixpanel.com';
      
      const optOutTrackingDefault = false;           // opt users into tracking by default
      const superProperties = {           // register super properties for the user
        'data_source': 'MP-React'
      };

      // Store token for Session Replay initialization
      mixpanelToken = token;
      
      // Create an instance of Mixpanel using your project token
      // Constructor accepts: token, trackAutomaticEvents, useNative (optional), storage (optional)
      mixpanelInstance = new Mixpanel(
        token,
        trackAutomaticEvents,
        useNative
      );
      
      // Initialize Mixpanel with configuration options
      // init() accepts: optOutTrackingDefault, superProperties, serverURL
      // serverURL routes data to Mixpanel's US or EU servers for data residency
      await mixpanelInstance.init(
        optOutTrackingDefault,
        superProperties,
        mixpanelServerURL
      );
      
      console.log(`[Mixpanel] 🌍 Using server: ${mixpanelServerURL}`);
      
      // Enable Mixpanel debugging and logging
      // This allows you to see debug output from the Mixpanel library in Xcode/Android Studio console
      mixpanelInstance.setLoggingEnabled(true);
      
      // Send a test event immediately to verify connection
      try {
        mixpanelInstance.track('App Initialized', {
          timestamp: new Date().toISOString(),
          platform: 'react-native',
        });
        mixpanelInstance.flush();
        console.log('✅ [Mixpanel] Initialized and test event sent');
      } catch (testError) {
        console.warn('⚠️ [Mixpanel] Initialized but test event failed:', testError);
      }
      
      isConfigured = true;
    } catch (error) {
      console.error('Error initializing Mixpanel:', error);
      isConfigured = false;
    }
  })();

  return initializationPromise;
};

/**
 * Check if Mixpanel is properly configured
 */
export const isMixpanelConfigured = (): boolean => {
  return isConfigured && mixpanelInstance !== null;
};

/**
 * Track an event
 * 
 * Note: By default, Mixpanel batches events and sends them every 60 seconds to preserve
 * battery life and bandwidth. Events are also sent when the app transitions to background.
 * This function calls flush() immediately to force sending, but in production you may
 * want to rely on the automatic batching for better performance.
 * 
 * @param eventName - Name of the event to track
 * @param properties - Optional properties to attach to the event
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>): void => {
  // Always log to console for debugging
  console.log('[Mixpanel] 📊 Tracking event:', eventName, properties || {});
  
  if (!isMixpanelConfigured()) {
    console.warn('[Mixpanel] ⚠️ Event not tracked (not configured):', eventName);
    console.warn('[Mixpanel] Configuration status:', {
      isConfigured,
      hasInstance: !!mixpanelInstance,
      hasMixpanelClass: !!Mixpanel
    });
    return;
  }

  try {
    // Track the event
    mixpanelInstance.track(eventName, properties);
    
    // Flush immediately to force sending (events normally batch every 60 seconds)
    // To preserve battery/bandwidth, you can remove this flush() call in production
    // and rely on automatic batching (events send every 60s or when app backgrounds)
    mixpanelInstance.flush();
    
    console.log('[Mixpanel] ✅ Event tracked successfully:', eventName);
  } catch (error) {
    console.error('[Mixpanel] ❌ Error tracking event:', error);
    console.error('[Mixpanel] Event details:', { eventName, properties });
  }
};

/**
 * Identify a user
 * 
 * @param userId - Unique identifier for the user
 */
export const identifyUser = (userId: string): void => {
  console.log('[Mixpanel] 👤 Identifying user:', userId);
  
  if (!isMixpanelConfigured()) {
    console.warn('[Mixpanel] ⚠️ User not identified (not configured):', userId);
    return;
  }

  try {
    mixpanelInstance.identify(userId);
    mixpanelInstance.flush(); // Flush to ensure identification is sent
    console.log('[Mixpanel] ✅ User identified successfully:', userId);
  } catch (error) {
    console.error('[Mixpanel] ❌ Error identifying user:', error);
  }
};

/**
 * Set user properties
 * 
 * @param properties - Properties to set for the current user
 */
export const setUserProperties = (properties: Record<string, any>): void => {
  if (!isMixpanelConfigured()) {
    console.log('[Mixpanel] Properties not set (not configured):', properties);
    return;
  }

  try {
    mixpanelInstance.getPeople().set(properties);
  } catch (error) {
    console.error('Error setting Mixpanel user properties:', error);
  }
};

/**
 * Reset user (call on logout)
 */
export const resetUser = (): void => {
  if (!isMixpanelConfigured()) {
    console.log('[Mixpanel] User not reset (not configured)');
    return;
  }

  try {
    mixpanelInstance.reset();
  } catch (error) {
    console.error('Error resetting Mixpanel user:', error);
  }
};

/**
 * Set super properties (properties sent with every event)
 * 
 * @param properties - Properties to set as super properties
 */
export const setSuperProperties = (properties: Record<string, any>): void => {
  if (!isMixpanelConfigured()) {
    console.log('[Mixpanel] Super properties not set (not configured):', properties);
    return;
  }

  try {
    mixpanelInstance.registerSuperProperties(properties);
  } catch (error) {
    console.error('Error setting Mixpanel super properties:', error);
  }
};

/**
 * Flush events to Mixpanel immediately
 * 
 * Note: By default, Mixpanel batches events and sends them every 60 seconds to preserve
 * battery life and bandwidth. Events are also automatically sent when the app transitions
 * to the background. This function forces an immediate flush, which is useful for:
 * - Testing to verify events are being sent
 * - Ensuring critical events are sent before app closes
 * - Debugging event delivery issues
 * 
 * In production, you typically don't need to call this manually as events will be
 * automatically sent every 60 seconds or when the app backgrounds.
 */
export const flushEvents = (): void => {
  if (!isMixpanelConfigured()) {
    console.log('[Mixpanel] Cannot flush (not configured)');
    return;
  }

  try {
    mixpanelInstance.flush();
    console.log('[Mixpanel] ✅ Events flushed');
  } catch (error) {
    console.error('[Mixpanel] Error flushing events:', error);
  }
};

/**
 * Check if user has opted out of tracking
 * If opted out, events won't be sent to Mixpanel
 */
export const isOptedOut = (): boolean => {
  if (!isMixpanelConfigured()) {
    return false;
  }

  try {
    return mixpanelInstance.hasOptedOutTracking() || false;
  } catch (error) {
    console.error('[Mixpanel] Error checking opt-out status:', error);
    return false;
  }
};

/**
 * Get Mixpanel status for debugging
 * Includes opt-out status to help diagnose why events might not be showing up
 */
export const getMixpanelStatus = () => {
  return {
    isConfigured,
    hasInstance: !!mixpanelInstance,
    hasMixpanelClass: !!Mixpanel,
    instanceType: mixpanelInstance ? typeof mixpanelInstance : null,
    isOptedOut: isOptedOut(),
  };
};

/**
 * Test event to verify Mixpanel is working
 * Call this manually to test if events are being sent
 */
export const testEvent = (): void => {
  console.log('[Mixpanel] 🧪 Sending test event...');
  trackEvent('Mixpanel Test Event', {
    timestamp: new Date().toISOString(),
    test: true,
    platform: 'react-native',
  });
};

/**
 * Session Replay Functions
 * 
 * Note: Session Replay requires the @mixpanel/react-native-session-replay package
 * which is currently in private beta. Contact your Mixpanel Account Manager for access.
 * 
 * These functions will gracefully handle cases where the package is not available.
 */

let sessionReplayModule: any = null;
let isSessionReplayAvailable = false;

// Try to import Session Replay module (will fail gracefully if not available)
try {
  const srModule = require('@mixpanel/react-native-session-replay');
  sessionReplayModule = srModule;
  isSessionReplayAvailable = !!srModule?.MPSessionReplay;
  
  if (isSessionReplayAvailable) {
    console.log('[Mixpanel] ✅ Session Replay module available');
  }
} catch (error) {
  console.log('[Mixpanel] ℹ️ Session Replay module not available (private beta - contact Mixpanel for access)');
  isSessionReplayAvailable = false;
}

/**
 * Initialize Session Replay for onboarding flow
 * 
 * Note: Requires @mixpanel/react-native-session-replay package (private beta)
 * Contact your Mixpanel Account Manager for access.
 * 
 * @param distinctId - Unique identifier for the user (optional, defaults to anonymous)
 * @param options - Configuration options for Session Replay
 */
export const startSessionReplay = async (
  distinctId?: string,
  options?: {
    recordingSessionsPercent?: number; // Percentage of sessions to record (0-100)
    autoStartRecording?: boolean;      // Automatically start recording
    autoMaskedViews?: any[];            // Views to automatically mask (text, images, etc.)
    enableLogging?: boolean;             // Enable logging for debugging
  }
): Promise<void> => {
  if (!isSessionReplayAvailable) {
    console.log('[Mixpanel] ⚠️ Session Replay not available - package not installed or not in beta');
    console.log('[Mixpanel] ℹ️ To enable: npm install @mixpanel/react-native-session-replay');
    console.log('[Mixpanel] ℹ️ Contact your Mixpanel Account Manager for beta access');
    return;
  }

  if (!isMixpanelConfigured()) {
    console.warn('[Mixpanel] ⚠️ Cannot start Session Replay - Mixpanel not configured');
    return;
  }

  if (!mixpanelToken) {
    console.warn('[Mixpanel] ⚠️ Cannot start Session Replay - Mixpanel token not available');
    return;
  }

  try {
    const { MPSessionReplay, MPSessionReplayConfig, MPSessionReplayMask } = sessionReplayModule;
    
    // Default configuration for onboarding
    // Record all onboarding sessions to understand user drop-off points
    // Configuration matches Mixpanel Session Replay documentation
    const config = new MPSessionReplayConfig({
      wifiOnly: false, // Allow recording over cellular networks
      recordingSessionsPercent: options?.recordingSessionsPercent ?? 100, // Record all onboarding sessions (0-100)
      autoStartRecording: options?.autoStartRecording ?? true, // Automatically start recording on initialization
      autoMaskedViews: options?.autoMaskedViews ?? [
        MPSessionReplayMask.Image, // Mask images for privacy (user-uploaded dream images)
        MPSessionReplayMask.Text    // Mask text inputs for privacy (user names, personal info)
      ],
      flushInterval: 5, // Flush every 5 seconds during onboarding for faster visibility (default: 10)
      enableLogging: options?.enableLogging ?? (typeof __DEV__ !== 'undefined' ? __DEV__ : false), // Enable logging in development
    });

    const userId = distinctId || 'anonymous';
    
    console.log('[Mixpanel] 🎥 Initializing Session Replay for onboarding...');
    
    // Initialize Session Replay with Mixpanel token and user ID
    // Using .catch() pattern as per Mixpanel documentation
    await MPSessionReplay.initialize(mixpanelToken, userId, config).catch((error: any) => {
      // Check if the error is about Session Replay not being enabled in the organization
      const errorMessage = error?.message || '';
      const errorDescription = error?.userInfo?.NSLocalizedDescription || '';
      
      if (
        errorMessage.includes('recording is not enabled') ||
        errorDescription.includes('recording is not enabled') ||
        error?.code === 'INITIALIZATION_FAILED'
      ) {
        // Session Replay is not enabled in the Mixpanel organization
        // This is expected if the feature hasn't been enabled by Mixpanel support
        console.log('[Mixpanel] ℹ️ Session Replay is not enabled in your Mixpanel organization');
        console.log('[Mixpanel] ℹ️ Contact your Mixpanel Account Manager to enable Session Replay');
        console.log('[Mixpanel] ℹ️ The app will continue normally without Session Replay');
        throw error; // Re-throw to prevent startRecording() from being called
      } else {
        // Other initialization errors
        console.error('[Mixpanel] ❌ Initialization error:', error);
        throw error;
      }
    });
    
    // Start recording explicitly (even though autoStartRecording is true, this ensures it's started)
    // If autoStartRecording is true, this is redundant but safe
    if (options?.autoStartRecording !== false) {
      await MPSessionReplay.startRecording();
    }
    
    console.log('[Mixpanel] ✅ Session Replay started for onboarding');
    
  } catch (error: any) {
    // Handle any errors that weren't caught in the .catch() above
    const errorMessage = error?.message || '';
    const errorDescription = error?.userInfo?.NSLocalizedDescription || '';
    
    if (
      errorMessage.includes('recording is not enabled') ||
      errorDescription.includes('recording is not enabled') ||
      error?.code === 'INITIALIZATION_FAILED'
    ) {
      // Already handled in .catch(), just log info
      console.log('[Mixpanel] ℹ️ Session Replay initialization skipped');
    } else {
      // Other errors should still be logged as warnings
      console.warn('[Mixpanel] ⚠️ Error starting Session Replay:', error);
    }
  }
};

/**
 * Stop Session Replay recording
 */
export const stopSessionReplay = async (): Promise<void> => {
  if (!isSessionReplayAvailable) {
    return;
  }

  try {
    const { MPSessionReplay } = sessionReplayModule;
    await MPSessionReplay.stopRecording();
    console.log('[Mixpanel] 🎥 Session Replay stopped');
  } catch (error) {
    console.error('[Mixpanel] ❌ Error stopping Session Replay:', error);
  }
};

/**
 * Check if Session Replay is currently recording
 */
export const isSessionReplayRecording = async (): Promise<boolean> => {
  if (!isSessionReplayAvailable) {
    return false;
  }

  try {
    const { MPSessionReplay } = sessionReplayModule;
    return await MPSessionReplay.isRecording();
  } catch (error) {
    console.error('[Mixpanel] ❌ Error checking Session Replay status:', error);
    return false;
  }
};

/**
 * Update the user identifier for the current recording session
 * 
 * Use this after user authentication to associate the session with the authenticated user
 * 
 * @param distinctId - New user identifier
 */
export const identifySessionReplay = async (distinctId: string): Promise<void> => {
  if (!isSessionReplayAvailable) {
    console.log('[Mixpanel] ⚠️ Session Replay not available - cannot identify user');
    return;
  }

  if (!distinctId || distinctId.trim() === '') {
    console.warn('[Mixpanel] ⚠️ Cannot identify Session Replay - distinctId is required');
    return;
  }

  try {
    const { MPSessionReplay } = sessionReplayModule;
    await MPSessionReplay.identify(distinctId);
    console.log('[Mixpanel] ✅ Session Replay user identified:', distinctId);
  } catch (error) {
    console.error('[Mixpanel] ❌ Error identifying Session Replay user:', error);
  }
};

export default mixpanelInstance;

