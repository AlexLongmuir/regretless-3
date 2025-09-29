/**
 * RevenueCat Configuration and Initialization
 * 
 * This file handles the initialization of RevenueCat for subscription management.
 * It includes fallback to mock implementation for development.
 */

// Try to import RevenueCat, fall back to mock if not available
let Purchases: any;
let isConfigured = false;
let initializationPromise: Promise<void> | null = null;

try {
  Purchases = require('react-native-purchases').default;
} catch (error) {
  console.log('RevenueCat not available, using mock implementation');
  const MockRevenueCat = require('../utils/revenueCatMock');
  Purchases = MockRevenueCat.MockPurchases;
}

/**
 * Initialize RevenueCat with your API key
 * 
 * @param apiKey - Your RevenueCat public API key (starts with 'pk_')
 */
export const initializeRevenueCat = async (apiKey?: string) => {
  // If already initializing, wait for that to complete
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      if (!apiKey) {
        console.log('No RevenueCat API key provided, using mock implementation');
        isConfigured = false; // Mark as not configured when using mock
        return;
      }

      // Check if this is a test/production key
      const isTestKey = apiKey.startsWith('rcb_') || apiKey.includes('test') || apiKey.includes('sandbox');
      const isProductionKey = apiKey.startsWith('appl_') || apiKey.startsWith('goog_');
      
      // Check if running in Expo Go (browser mode)
      const isExpoGo = typeof window !== 'undefined' && window.location?.hostname?.includes('expo');
      
      // Check if running on physical device (not simulator)
      // In React Native, window is undefined, and we're not in Expo Go
      const isPhysicalDevice = typeof window === 'undefined';
      
      console.log('API Key analysis:', {
        key: apiKey.substring(0, 10) + '...',
        isTestKey,
        isProductionKey,
        startsWithRcb: apiKey.startsWith('rcb_'),
        isExpoGo,
        isPhysicalDevice
      });
      
      // Only block SDK keys in Expo Go (browser mode)
      if (isProductionKey && isExpoGo) {
        console.log('Production API key detected in Expo Go. Using mock implementation for development safety.');
        console.log('For real testing, use a physical device with development build.');
        isConfigured = false; // Mark as not configured when using production key in Expo Go
        return;
      }
      
      // Allow SDK keys on physical devices and simulators for testing
      if (isProductionKey && !isExpoGo) {
        console.log('SDK API key detected on device/simulator. Using RevenueCat for testing.');
      }
      
      if (isExpoGo) {
        console.log('Expo Go detected. RevenueCat sandbox keys don\'t work in browser mode.');
        console.log('Using mock implementation for development. For real testing, use a physical device.');
        isConfigured = false; // Mark as not configured when using sandbox key in Expo Go
        return;
      }
      
      if (isTestKey) {
        console.log('Sandbox/Test API key detected. Using RevenueCat for testing.');
      }

      // Only configure if we have the real RevenueCat SDK
      if (Purchases && typeof Purchases.configure === 'function') {
        const config: any = {
          apiKey,
          // CRITICAL: Do NOT pass appUserID - start as anonymous
          // This allows purchases to be made anonymously and later linked to authenticated users
        };
        
        // Add sandbox configuration for test keys
        if (isTestKey) {
          config.usesStoreKit2 = false; // Use StoreKit 1 for sandbox testing
          console.log('Configuring RevenueCat for sandbox testing');
        }
        
        await Purchases.configure(config);
        console.log('RevenueCat initialized successfully as anonymous user');
        isConfigured = true; // Mark as configured when successfully initialized
      }
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
      isConfigured = false; // Mark as not configured on error
    }
  })();

  return initializationPromise;
};

/**
 * Check if RevenueCat is properly configured
 */
export const isRevenueCatConfigured = (): boolean => {
  return isConfigured && Purchases && typeof Purchases.configure === 'function';
};

/**
 * Wait for RevenueCat initialization to complete
 */
export const waitForRevenueCatInitialization = async (): Promise<boolean> => {
  if (initializationPromise) {
    await initializationPromise;
  }
  return isRevenueCatConfigured();
};

/**
 * Clear RevenueCat cache (useful for testing)
 */
export const clearRevenueCatCache = async (): Promise<void> => {
  try {
    if (Purchases && typeof Purchases.logOut === 'function') {
      // Check if user is not already anonymous before logging out
      const customerInfo = await Purchases.getCustomerInfo();
      if (customerInfo && customerInfo.originalAppUserId && !customerInfo.originalAppUserId.startsWith('$RCAnonymousID')) {
        await Purchases.logOut();
        console.log('RevenueCat cache cleared - returned to anonymous');
      } else {
        console.log('RevenueCat user is already anonymous, skipping logout');
      }
    }
  } catch (error) {
    console.error('Error clearing RevenueCat cache:', error);
  }
};

/**
 * Get current RevenueCat user ID (for debugging)
 */
export const getCurrentRevenueCatUserId = async (): Promise<string | null> => {
  try {
    if (Purchases && typeof Purchases.getAppUserID === 'function') {
      const userId = await Purchases.getAppUserID();
      console.log('Current RevenueCat user ID:', userId);
      return userId;
    }
    return null;
  } catch (error) {
    console.error('Error getting RevenueCat user ID:', error);
    return null;
  }
};

export default Purchases;
