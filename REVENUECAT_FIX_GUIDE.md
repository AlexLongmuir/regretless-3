# RevenueCat Configuration Fix Guide

## Current Issue Analysis

Based on your logs, the main problem is:
```
⚠️ There's a problem with your configuration. No packages could be found for offering with identifier Default Offerings (Test 20/09/25)
```

## Root Causes

1. **Product IDs Mismatch**: Your code expects `monthly_dreamer`/`annual_dreamer` but RevenueCat dashboard likely has different IDs
2. **Offering Configuration**: The offering exists but has no packages configured
3. **API Key Type**: You're using a production SDK key (`appl_`) which requires proper App Store Connect setup

## Step-by-Step Fix

### Step 1: Configure Products in App Store Connect

1. **Go to App Store Connect** → Your App → Features → In-App Purchases
2. **Create Subscription Products**:
   - Product ID: `monthly_subscription`
   - Reference Name: "Monthly Pro Subscription"
   - Subscription Group: "Pro Features" (create new)
   - Duration: 1 Month
   - Price: $9.99

   - Product ID: `annual_subscription`
   - Reference Name: "Annual Pro Subscription"
   - Same subscription group as monthly
   - Duration: 1 Year
   - Price: $79.99

### Step 2: Configure RevenueCat Dashboard

1. **Go to [RevenueCat Dashboard](https://app.revenuecat.com/)**
2. **Navigate to Products**:
   - Add Product: `monthly_subscription`
   - Add Product: `annual_subscription`

3. **Navigate to Entitlements**:
   - Create/Update entitlement: `pro`
   - Attach both `monthly_subscription` and `annual_subscription` to this entitlement

4. **Navigate to Offerings**:
   - Find your "Default Offerings (Test 20/09/25)" offering
   - **Delete it** and create a new one called `default`
   - Add packages:
     - Package ID: `monthly` → Product: `monthly_subscription`
     - Package ID: `annual` → Product: `annual_subscription`

### Step 3: Update Your Code (Already Done)

✅ Updated product IDs from `monthly_dreamer`/`annual_dreamer` to `monthly_subscription`/`annual_subscription`

### Step 4: Test Configuration

1. **Restart your app** to clear RevenueCat cache
2. **Check logs** for successful offering fetch
3. **Test purchase flow** (use sandbox account)

## Alternative: Use Sandbox Key for Testing

If you want to test without App Store Connect setup:

1. **Get sandbox API key** from RevenueCat dashboard (starts with `rcb_`)
2. **Update .env.local**:
   ```
   EXPO_PUBLIC_REVENUECAT_API_KEY=rcb_your_sandbox_key_here
   ```
3. **Use sandbox products** (automatically available)

## Verification Checklist

After completing the setup, you should see in logs:
- ✅ `RevenueCat initialized successfully`
- ✅ `Offerings updated from network`
- ✅ No "No packages could be found" warnings
- ✅ Products are properly cached

## Common Issues & Solutions

### Issue: "Product not found"
- **Solution**: Verify product IDs match exactly between App Store Connect and RevenueCat

### Issue: "Offering not found"
- **Solution**: Create offering named `default` with packages

### Issue: "Entitlement not active"
- **Solution**: Ensure products are attached to `pro` entitlement

### Issue: Still getting mock mode
- **Solution**: Check API key format and restart app

## Testing Without App Store Connect

For development testing without full App Store Connect setup:

1. Use sandbox API key (`rcb_`)
2. RevenueCat provides test products automatically
3. Mock implementation will work for UI testing

## Production Checklist

Before going live:
- [ ] App Store Connect products are approved
- [ ] RevenueCat dashboard is configured
- [ ] Test purchases work in sandbox
- [ ] Production API key is used
- [ ] Subscription status persists after app restart
