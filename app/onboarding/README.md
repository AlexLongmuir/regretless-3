# Onboarding Flow

This directory contains the complete onboarding flow for the Dreamer app, designed to guide new users through the app introduction, subscription purchase, and authentication process.

## Flow Overview

The onboarding flow consists of 6 screens that guide users from initial introduction to a fully authenticated, subscribed user:

1. **Welcome** - Introduction to the app
2. **Name** - User enters their name for personalization
3. **Questions** - User answers personal questions for tailored experience
4. **Understanding** - Explains how the app works
5. **Paywall** - Subscription options with RevenueCat integration
6. **PostPurchaseSignIn** - Authentication after successful purchase

## Architecture

### Navigation
- **OnboardingNavigator** - Stack navigator managing the onboarding flow
- **OnboardingContext** - State management for onboarding data
- **onboardingFlow.ts** - Utility functions for flow logic and persistence

### Components
- **OnboardingHeader** - Shared header with back button and progress indicator
- **OnboardingImage** - Consistent image styling component

### Screens
Each screen follows a consistent pattern:
- Uses shared onboarding components
- Implements proper navigation flow
- Handles state updates through context
- Follows the design shown in the provided mockups

## Integration Points

### RevenueCat Integration
The paywall screen integrates with RevenueCat for subscription management:
- Fetches available offerings
- Handles purchase flow
- Manages subscription status
- Links anonymous users to authenticated users after sign-in

### Authentication Flow
The PostPurchaseSignIn screen handles the authentication after purchase:
- Uses existing AuthContext for sign-in
- Links RevenueCat user with authenticated user
- Stores billing snapshots (TODO: implement Supabase integration)
- Manages subscription status persistence

### State Management
- **OnboardingContext** - Manages user input during onboarding
- **AsyncStorage** - Persists onboarding completion and subscription status
- **RevenueCat** - Manages subscription state and entitlements

## Usage

### Starting the Onboarding Flow
The onboarding flow is automatically triggered for first-time users. The flow state is determined by:

```typescript
import { checkOnboardingFlowState } from '../utils/onboardingFlow';

const flowState = await checkOnboardingFlowState(isAuthenticated);
```

### Flow Logic
1. **First-time users** → Onboarding screens
2. **Completed onboarding, no subscription** → Paywall
3. **Has subscription, not authenticated** → PostPurchaseSignIn
4. **Has subscription and authenticated** → Main App

### Persistence
The flow uses AsyncStorage to persist:
- `hasCompletedOnboarding` - Whether user has finished onboarding
- `lastKnownEntitled` - Last known subscription status (prevents flicker)

## Customization

### Adding/Removing Screens
To modify the onboarding flow:

1. **Add new screen**:
   - Create new component in `/app/onboarding/`
   - Add to `OnboardingNavigator.tsx`
   - Update progress indicators

2. **Remove screen**:
   - Remove from `OnboardingNavigator.tsx`
   - Update navigation logic in other screens

3. **Reorder screens**:
   - Update screen order in `OnboardingNavigator.tsx`
   - Update progress calculations in `OnboardingHeader.tsx`

### Styling
All screens use the existing theme system and follow the design patterns established in the provided mockups. Components are designed to be consistent with the existing app design.

## TODO Items

1. **Supabase Billing Integration** - Implement billing snapshot storage
2. **Enhanced Error Handling** - Add retry mechanisms for failed purchases
3. **Analytics** - Track onboarding completion rates and drop-off points
4. **A/B Testing** - Test different onboarding flows
5. **Accessibility** - Ensure proper accessibility support

## Dependencies

- `@react-navigation/native-stack` - Navigation
- `react-native-purchases` - Subscription management
- `@react-native-async-storage/async-storage` - Local storage
- Existing app components (`Button`, `IconButton`, `Input`)
- Existing contexts (`AuthContext`)

## Testing

The onboarding flow can be tested by:
1. Clearing app data to simulate first-time user
2. Testing purchase flow with RevenueCat sandbox
3. Verifying proper state persistence across app restarts
4. Testing navigation flow and back button behavior
