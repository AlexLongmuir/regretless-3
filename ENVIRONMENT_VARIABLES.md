# Environment Variables Setup

This document explains how to set up the required environment variables for the Dreamer app.

## Required Environment Variables

Create a `.env` or `.env.local` file in the root directory of your project with the following variables:

> **Note**: `.env.local` is preferred for local development as it's typically ignored by git by default.

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Sign-In Configuration
GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id_here
GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id_here
GOOGLE_WEB_CLIENT_ID=your_google_web_client_id_here

# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_API_KEY=pk_your_revenuecat_api_key_here
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

## Security

- Keep your `.env` file private and never commit it to version control
- Use different API keys for development and production
- Regularly rotate your API keys for security
