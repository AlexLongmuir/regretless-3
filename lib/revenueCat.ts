/**
 * RevenueCat Configuration and Initialization
 * 
 * This file handles the initialization of RevenueCat for subscription management.
 * It includes fallback to mock implementation for development.
 */

// Try to import RevenueCat, fall back to mock if not available
let Purchases: any;

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
  try {
    if (!apiKey) {
      console.log('No RevenueCat API key provided, using mock implementation');
      return;
    }

    // Only configure if we have the real RevenueCat SDK
    if (Purchases && typeof Purchases.configure === 'function') {
      await Purchases.configure({
        apiKey,
      });
      console.log('RevenueCat initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
  }
};

/**
 * Check if RevenueCat is properly configured
 */
export const isRevenueCatConfigured = (): boolean => {
  return Purchases && typeof Purchases.configure === 'function';
};

export default Purchases;
