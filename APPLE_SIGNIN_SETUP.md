# Apple Sign In Setup Guide

This guide will help you properly configure Apple Sign In for your iOS app.

## Current Issue
You're getting the error: "The authorization attempt failed for an unknown reason"

This typically happens when Apple Sign In is not properly configured in your Apple Developer account.

## Required Setup Steps

### 1. Apple Developer Account Configuration

1. **Go to Apple Developer Console**
   - Visit [developer.apple.com](https://developer.apple.com)
   - Sign in with your Apple ID

2. **Configure App ID**
   - Go to "Certificates, Identifiers & Profiles"
   - Select "Identifiers" → "App IDs"
   - Find your app ID: `com.dreamerapp.app`
   - Click "Edit"

3. **Enable Sign In with Apple**
   - Scroll down to "Sign In with Apple"
   - Check the box to enable it
   - Click "Save"

4. **Configure Service ID (for Supabase)**
   - Go to "Identifiers" → "Services IDs"
   - Click the "+" button to create a new Service ID
   - Identifier: `com.dreamerapp.app.signin` (or similar)
   - Description: "Dreamer App Sign In Service"
   - Check "Sign In with Apple"
   - Click "Configure"
   - Add your domain and redirect URLs:
     - Primary App ID: `com.dreamerapp.app`
     - Website URLs: Your Supabase URL
     - Return URLs: `https://your-supabase-project.supabase.co/auth/v1/callback`
   - Click "Save"

### 2. Supabase Configuration

1. **Go to Supabase Dashboard**
   - Visit your Supabase project dashboard
   - Go to Authentication → Providers
   - Find "Apple" provider

2. **Configure Apple Provider**
   - Enable Apple provider
   - Service ID: `com.dreamerapp.app.signin` (from step 1.4)
   - Secret Key: Get this from Apple Developer Console
   - Team ID: Your Apple Developer Team ID
   - Key ID: Your Apple Sign In Key ID
   - Private Key: Your Apple Sign In Private Key

### 3. Apple Sign In Key Setup

1. **Create Apple Sign In Key**
   - Go to Apple Developer Console
   - "Certificates, Identifiers & Profiles" → "Keys"
   - Click "+" to create a new key
   - Key Name: "Apple Sign In Key"
   - Check "Sign In with Apple"
   - Click "Configure"
   - Select your App ID: `com.dreamerapp.app`
   - Click "Save"
   - Download the key file (.p8)
   - Note the Key ID

2. **Get Team ID**
   - In Apple Developer Console, go to "Membership"
   - Copy your Team ID

### 4. Test the Configuration

After completing the above steps:

1. **Rebuild your iOS app**
   ```bash
   cd ios
   rm -rf build
   cd ..
   npx expo run:ios
   ```

2. **Test Apple Sign In**
   - Try the Apple Sign In flow
   - Check the console logs for any errors

## Troubleshooting

### Common Issues

1. **"Authorization attempt failed"**
   - Usually means Apple Sign In is not enabled in Apple Developer Console
   - Make sure you've completed step 1.3 above

2. **"Invalid client"**
   - Service ID configuration issue
   - Check step 1.4 and 2.2

3. **"Invalid key"**
   - Apple Sign In key configuration issue
   - Check step 3.1 and 2.2

### Debug Steps

1. **Check Apple Sign In availability**
   - The app will log: "Apple Sign In availability check: true/false"
   - If false, the issue is in the entitlements or app configuration

2. **Check entitlements**
   - Make sure `com.apple.developer.applesignin` is in your entitlements file
   - Make sure it's also in Info.plist

3. **Check bundle identifier**
   - Make sure your bundle ID matches exactly: `com.dreamerapp.app`

## Temporary Workaround

If Apple Sign In continues to fail, the app will now:
1. Show a helpful error message
2. Offer to try Google Sign In instead
3. Allow users to continue without signing in

This ensures users can still complete the purchase flow even if Apple Sign In isn't working.

## Next Steps

1. Complete the Apple Developer Console setup (steps 1-3)
2. Configure Supabase with the Apple provider settings (step 2)
3. Rebuild and test the app
4. If issues persist, check the console logs for more specific error messages

