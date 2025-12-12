# Environment Variables Setup

This document explains how to set up the required environment variables for the Dreamer app.

## Required Environment Variables

Create a `.env` or `.env.local` file in the root directory of your project with the following variables:

> **Note**: `.env.local` is preferred for local development as it's typically ignored by git by default.

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Sign-In Configuration
GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id_here
GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id_here
GOOGLE_WEB_CLIENT_ID=your_google_web_client_id_here

# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_API_KEY=pk_your_revenuecat_api_key_here

# Mixpanel Configuration
EXPO_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token_here
# Optional: Set to 'https://api-eu.mixpanel.com' for EU Data Residency
# Defaults to 'https://api.mixpanel.com' (US) if not set
EXPO_PUBLIC_MIXPANEL_SERVER_URL=https://api.mixpanel.com

# Backend API Configuration
# For local development: http://localhost:3000
# For production: https://your-backend-domain.com (e.g., https://dreamer-api.vercel.app)
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000

# OpenAI Configuration (Backend Only)
OPENAI_API_KEY=sk_your_openai_api_key_here
```

## RevenueCat API Key

### Where to get your RevenueCat API Key:

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Sign in to your account
3. Navigate to **Project Settings** → **API Keys**
4. Copy your **Public API Key** (starts with `pk_`)

### How to add it:

1. Create a `.env` or `.env.local` file in your project root (same level as `package.json`)
2. Add the following line:
   ```
   EXPO_PUBLIC_REVENUECAT_API_KEY=pk_your_actual_api_key_here
   ```
3. Replace `pk_your_actual_api_key_here` with your actual RevenueCat public API key

### Important Notes:

- The `EXPO_PUBLIC_` prefix is required for Expo to expose the variable to your app
- `.env.local` is typically ignored by git by default, but you can also add `.env` to your `.gitignore` file to keep your API keys secure
- Never commit your actual API keys to version control

## Testing

- **Without API key**: The app will run in mock mode (no RevenueCat functionality)
- **With API key**: The app will use real RevenueCat for subscription management

## Mixpanel Token

### Where to get your Mixpanel Token:

1. Go to [Mixpanel Dashboard](https://mixpanel.com/)
2. Sign in to your account
3. Navigate to **Project Settings** → **Project Info**
4. Copy your **Project Token**

### How to add it:

1. Add the following line to your `.env` or `.env.local` file:
   ```
   EXPO_PUBLIC_MIXPANEL_TOKEN=your_actual_mixpanel_token_here
   ```
2. Replace `your_actual_mixpanel_token_here` with your actual Mixpanel project token

### EU Data Residency:

To route data to Mixpanel's EU servers for EU Data Residency compliance, add:
```
EXPO_PUBLIC_MIXPANEL_SERVER_URL=https://api-eu.mixpanel.com
```

If not set, the app defaults to US servers (`https://api.mixpanel.com`).

### Session Replay (Beta):

Session Replay is automatically enabled during the onboarding flow to capture user interactions and help identify drop-off points.

**To enable Session Replay:**
1. Contact your Mixpanel Account Manager to request access to the private beta
2. Install the Session Replay package:
   ```bash
   npm install @mixpanel/react-native-session-replay
   ```
3. Run `pod install` in the `ios` directory (for iOS)
4. Session Replay will automatically start when users enter the onboarding flow

**Privacy & Security:**
- Text inputs and images are automatically masked for privacy
- Sensitive screens (payment, profile) should be reviewed for additional masking
- Session Replay is only active during onboarding by default

### Important Notes:

- The `EXPO_PUBLIC_` prefix is required for Expo to expose the variable to your app
- Without a token, Mixpanel will use a no-op implementation (events won't be tracked but won't cause errors)
- Never commit your actual token to version control
- The server URL determines where your analytics data is stored (US vs EU)

## OpenAI API Key (Backend)

### Where to get your OpenAI API Key:

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in to your account
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)

### How to add it:

1. Add the following line to your `.env` or `.env.local` file in the **backend** directory:
   ```
   OPENAI_API_KEY=sk_your_actual_api_key_here
   ```
2. Replace `sk_your_actual_api_key_here` with your actual OpenAI API key

### Important Notes:

- This key is used for audio transcription via Whisper API
- The key is only used on the backend, never exposed to the frontend
- Keep this key secure and never commit it to version control
- OpenAI charges $0.006 per minute of audio transcribed

## Backend URL Configuration

### Local Development

For local development, set the backend URL to your local server:
```bash
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

**Note**: When testing on a physical device, use your computer's local IP address instead of `localhost`:
```bash
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3000  # Replace with your actual IP
```

### Production (App Store Release)

Before releasing to the App Store, you need to:

1. **Deploy your backend** to a hosting service:
   - **Vercel** (recommended for Next.js): Connect your backend folder to Vercel
   - **Railway**: Deploy the backend folder
   - **AWS/Google Cloud/Azure**: Deploy as a serverless function or container
   - Any other hosting service that supports Next.js

2. **Get your production backend URL** (e.g., `https://dreamer-api.vercel.app`)

3. **Set the environment variable in EAS** for production builds:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value https://your-backend-domain.com --type string
   ```

   Or use the EAS dashboard:
   - Go to https://expo.dev
   - Select your project
   - Go to **Secrets** → **Environment Variables**
   - Add `EXPO_PUBLIC_BACKEND_URL` with your production backend URL

4. **Verify the build profile** in `eas.json` includes the environment variable (it should automatically use secrets)

### Important Notes:

- The backend URL is baked into your app at build time, not runtime
- You'll need separate builds for development and production (or use different environment variables)
- Always test your production backend URL before submitting to the App Store
- Make sure your backend CORS settings allow requests from your mobile app

## Security

- Keep your `.env` file private and never commit it to version control
- Use different API keys for development and production
- Regularly rotate your API keys for security
