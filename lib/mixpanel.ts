/**
 * Mixpanel Configuration and Initialization
 * 
 * This file handles the initialization of Mixpanel for analytics tracking.
 * It includes fallback to no-op implementation for development when no token is provided.
 */

// Import Mixpanel class from the SDK
import { Mixpanel } from 'mixpanel-react-native';

let mixpanelInstance: any = null;
let isConfigured = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize Mixpanel with your project token
 * 
 * @param token - Your Mixpanel project token
 */
export const initializeMixpanel = async (token?: string) => {
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
      const serverURL = 'https://api.mixpanel.com';  // set the server URL to Mixpanel's US domain
      const optOutTrackingDefault = false;           // opt users into tracking by default
      const superProperties = {           // register super properties for the user
        'data_source': 'MP-React'
      };

      // Create an instance of Mixpanel using your project token
      // with the configuration options above
      mixpanelInstance = new Mixpanel(
        token,
        trackAutomaticEvents,
        useNative,
        serverURL,
        optOutTrackingDefault,
        superProperties
      );
      
      // Initialize Mixpanel
      await mixpanelInstance.init();
      
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
    
    // Flush immediately to ensure events are sent (especially important for testing)
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
 * Useful for testing or ensuring events are sent before app closes
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
 * Get Mixpanel status for debugging
 */
export const getMixpanelStatus = () => {
  return {
    isConfigured,
    hasInstance: !!mixpanelInstance,
    hasMixpanelClass: !!Mixpanel,
    instanceType: mixpanelInstance ? typeof mixpanelInstance : null,
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

export default mixpanelInstance;

