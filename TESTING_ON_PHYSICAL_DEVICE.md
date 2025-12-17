# Testing Purchases on Physical iPhone

## Why Physical Device?

iOS Simulators have known issues with StoreKit and in-app purchases:
- Error 509 "No active account" can persist even with sandbox accounts
- StoreKit behavior differs between simulator and real devices
- Physical devices are much more reliable for testing purchases

## Prerequisites

1. **Physical iPhone connected via USB**
2. **Xcode installed** (latest version)
3. **Apple Developer account** (free account works for device testing)
4. **Device registered in Xcode**: 
   - Open Xcode → Window → Devices and Simulators
   - Connect your iPhone via USB
   - Trust the computer on your iPhone when prompted
   - Device should appear in Xcode

## Method 1: Using Expo CLI (Recommended)

```bash
# 1. Start Metro bundler (in one terminal)
npm start

# 2. Build and run on your device (in another terminal)
npx expo run:ios --device

# Or if you want to select which device:
npx expo run:ios --device "Your iPhone Name"
```

This will:
- Build the iOS app
- Show you a list of available devices
- Install and launch on your iPhone

## Method 2: Using Xcode

```bash
# 1. Open the Xcode workspace
open ios/dreamer3.xcworkspace

# 2. In Xcode:
#    - Select your iPhone as the run destination (top toolbar)
#    - Click the Play button (or Cmd+R)
#    - First build may take a few minutes
```

## First Time Setup on Device

### Sign the App with Your Apple ID

1. **In Xcode**, go to the project settings:
   - Click on `dreamer3` project in the left sidebar
   - Select the `dreamer3` target
   - Go to "Signing & Capabilities" tab

2. **Select your Team**:
   - Under "Signing", check "Automatically manage signing"
   - Select your Apple ID from the Team dropdown
   - Xcode will create a provisioning profile automatically

3. **If you see errors**:
   - You may need to add your Apple ID in Xcode → Settings → Accounts
   - Free Apple ID works for testing (no paid developer account needed)

### Trust the Developer on iPhone

After first install:
1. On your iPhone: Settings → General → VPN & Device Management
2. Tap on your developer certificate
3. Tap "Trust [Your Name]"
4. Confirm "Trust"

## Testing Purchases on Physical Device

### Step 1: Sign Out of Production App Store

**IMPORTANT**: Before testing, sign out of your production Apple ID:

1. On iPhone: **Settings → [Your Name] → Media & Purchases**
2. Tap "Sign Out"
3. OR: **Settings → App Store → Sign Out**

### Step 2: Use Sandbox Account

When you initiate a purchase:
1. The system will prompt you to sign in
2. **Don't use your production Apple ID**
3. Use a **sandbox test account** from App Store Connect:
   - Create in: App Store Connect → Users and Access → Sandbox Testers
   - Use email like: `testuser@example.com` (doesn't need to be real)
   - Password: Any password (8+ characters)

### Step 3: Test Purchase Flow

1. Launch your app on the physical device
2. Navigate to the purchase screen
3. Tap to purchase
4. When prompted, sign in with sandbox account
5. Complete the purchase flow

## Troubleshooting

### "No Devices Available"

**Solution**: 
- Make sure iPhone is connected via USB
- Unlock your iPhone
- Trust the computer if prompted
- In Xcode: Window → Devices and Simulators → Check device appears

### "Failed to register bundle identifier"

**Solution**:
- In Xcode project settings, change the Bundle Identifier slightly (e.g., add `.dev` at the end)
- Or sign in to Xcode with your Apple ID

### "Unable to install"

**Solution**:
- Check iPhone has enough storage space
- Restart Xcode and try again
- Make sure you trusted the developer certificate (Settings → General → VPN & Device Management)

### Purchases Still Failing

**Check**:
1. ✅ Signed out of production App Store account
2. ✅ Using sandbox test account (created in App Store Connect)
3. ✅ Products configured in App Store Connect
4. ✅ Products linked in RevenueCat dashboard
5. ✅ Bundle ID matches in App Store Connect and Xcode

### Still Getting Error 509

**If you still get "No active account" on physical device**:

1. **Check App Store Connect Agreements**:
   - Log into App Store Connect
   - Go to Agreements, Tax, and Banking
   - Sign the "Paid Applications Agreement" if pending
   - Complete any required tax/banking info

2. **Verify Sandbox Account**:
   - Ensure sandbox tester is properly created
   - Try creating a new sandbox account

3. **Reset StoreKit Testing** (iOS 14.2+):
   - On iPhone: Settings → App Store
   - Scroll to bottom: "Reset StoreKit Testing"
   - Sign out and sign back in with sandbox account

## Quick Command Reference

```bash
# List available devices
xcrun xctrace list devices

# Build and run on device
npx expo run:ios --device

# Clean build (if issues)
cd ios && xcodebuild clean && cd ..
npx expo run:ios --device

# Check device connection
xcrun devicectl list devices
```

## Benefits of Physical Device Testing

✅ More reliable StoreKit behavior  
✅ Real purchase flow experience  
✅ Better performance testing  
✅ Actual network conditions  
✅ Production-like environment  
