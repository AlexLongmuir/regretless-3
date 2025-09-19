/**
 * RevenueCat Mock Implementation
 * 
 * This provides a mock implementation of RevenueCat for development and testing
 * when the real RevenueCat SDK is not available or configured.
 */

export interface MockCustomerInfo {
  entitlements: {
    active: Record<string, any>;
  };
}

export interface MockPurchasesOffering {
  identifier: string;
  availablePackages: MockPackage[];
}

export interface MockPackage {
  identifier: string;
  product: {
    identifier: string;
    priceString: string;
  };
}

class MockPurchasesClass {
  private mockCustomerInfo: MockCustomerInfo = {
    entitlements: {
      active: {} // Start with no active entitlements
    }
  };

  async getOfferings(): Promise<{ current: MockPurchasesOffering | null }> {
    // Mock offering data
    return {
      current: {
        identifier: 'default',
        availablePackages: [
          {
            identifier: 'monthly',
            product: {
              identifier: 'monthly_subscription',
              priceString: '$9.99'
            }
          },
          {
            identifier: 'annual',
            product: {
              identifier: 'annual_subscription', 
              priceString: '$79.99'
            }
          }
        ]
      }
    };
  }

  async getCustomerInfo(): Promise<MockCustomerInfo> {
    return this.mockCustomerInfo;
  }

  async purchasePackage(packageToPurchase: MockPackage): Promise<{ customerInfo: MockCustomerInfo }> {
    // Simulate successful purchase
    this.mockCustomerInfo = {
      entitlements: {
        active: {
          'pro': {
            isActive: true,
            willRenew: true
          }
        }
      }
    };
    
    return { customerInfo: this.mockCustomerInfo };
  }

  async restorePurchases(): Promise<MockCustomerInfo> {
    // Simulate restore - return current state
    return this.mockCustomerInfo;
  }

  async logIn(userId: string): Promise<MockCustomerInfo> {
    // Simulate linking user
    console.log(`Mock: Linking user ${userId}`);
    return this.mockCustomerInfo;
  }

  // Helper method to simulate subscription activation
  activateSubscription() {
    this.mockCustomerInfo = {
      entitlements: {
        active: {
          'pro': {
            isActive: true,
            willRenew: true
          }
        }
      }
    };
  }

  // Helper method to simulate subscription deactivation
  deactivateSubscription() {
    this.mockCustomerInfo = {
      entitlements: {
        active: {}
      }
    };
  }
}

export const MockPurchases = new MockPurchasesClass();
