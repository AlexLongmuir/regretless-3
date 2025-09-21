# RevenueCat Setup Guide

This guide will help you set up RevenueCat for the onboarding flow in your Dreamer app.

## 1. RevenueCat Account Setup

1. **Create RevenueCat Account**
   - Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
   - Sign up for a free account
   - Create a new project for your Dreamer app

2. **Get API Keys**
   - Navigate to Project Settings → API Keys
   - Copy your **Public API Key** (starts with `pk_`)
   - Copy your **Secret API Key** (starts with `sk_`)

## 2. App Store Connect Setup

1. **Create Subscription Products**
   - Go to App Store Connect → Your App → Features → In-App Purchases
   - Create a monthly subscription product:
     - Product ID: `monthly_subscription`
     - Reference Name: "Monthly Pro Subscription"
     - Subscription Group: Create new group "Pro Features"
     - Duration: 1 Month
     - Price: $9.99
   
   - Create an annual subscription product:
     - Product ID: `annual_subscription`
     - Reference Name: "Annual Pro Subscription"
     - Same subscription group as monthly
     - Duration: 1 Year
     - Price: $79.99

2. **Create Entitlement**
   - In RevenueCat Dashboard → Entitlements
   - Create entitlement: `pro`
   - Attach both monthly and annual products to this entitlement

## 3. Configure RevenueCat in Your App

### 3.1 Initialize RevenueCat

Add this to your `App.tsx` or main entry point:

```typescript
import Purchases from 'react-native-purchases';

// Initialize RevenueCat
Purchases.configure({
  apiKey: 'pk_your_public_api_key_here', // Replace with your public key
});
```

### 3.2 Update Product IDs

In `/app/onboarding/paywall.tsx`, update the product identifiers to match your App Store Connect products:

```typescript
// Update these to match your App Store Connect product IDs
const pricingOptions: PricingOption[] = [
  {
    id: 'monthly_subscription', // Should match App Store Connect
    title: 'Monthly',
    // ...
  },
  {
    id: 'annual_subscription', // Should match App Store Connect
    title: 'Annual',
    // ...
  },
];
```

### 3.3 Configure Offerings

In RevenueCat Dashboard → Offerings:
1. Create a new offering called "default"
2. Add both monthly and annual packages
3. Set package identifiers to match your paywall screen:
   - Monthly package ID: `monthly`
   - Annual package ID: `annual`

## 4. Testing

### 4.1 Sandbox Testing
1. Create sandbox test accounts in App Store Connect
2. Sign out of App Store on your device
3. Use sandbox account for testing purchases
4. Test the complete flow: onboarding → paywall → purchase → authentication

### 4.2 Mock Implementation
The app includes a mock implementation that works without RevenueCat configuration:
- Automatically falls back to mock when RevenueCat is not available
- Simulates successful purchases for development
- Allows testing the complete onboarding flow

## 5. Production Checklist

Before releasing to production:

- [ ] RevenueCat API keys are configured
- [ ] Product IDs match App Store Connect
- [ ] Entitlements are properly configured
- [ ] Offerings are set up in RevenueCat dashboard
- [ ] Test purchases work in sandbox
- [ ] Subscription status is properly tracked
- [ ] User linking works after authentication

## 6. Troubleshooting

### Common Issues:

1. **"Product not found" errors**
   - Verify product IDs match App Store Connect exactly
   - Ensure products are approved and available

2. **"Offering not found" errors**
   - Check that offering "default" exists in RevenueCat dashboard
   - Verify package identifiers match your code

3. **Purchase failures**
   - Test with sandbox accounts
   - Check device is signed out of production App Store
   - Verify products are properly configured

4. **Entitlement not active after purchase**
   - Check entitlement configuration in RevenueCat
   - Verify products are attached to the entitlement
   - Check subscription status in RevenueCat dashboard

## 7. Mock Implementation Details

The mock implementation (`utils/revenueCatMock.ts`) provides:
- Simulated offerings with monthly/annual packages
- Mock purchase flow that activates "pro" entitlement
- User linking simulation
- Customer info with subscription status

This allows development and testing without RevenueCat configuration.

## 8. Next Steps

After RevenueCat is configured:
1. Test the complete onboarding flow
2. Verify subscription status persistence
3. Implement Supabase billing snapshot storage
4. Add analytics tracking for conversion rates
5. Set up push notifications for subscription events
