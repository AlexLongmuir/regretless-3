# Deployment Guide: Connecting App to Backend for App Store Release

This guide explains how to ensure your mobile app connects to your backend when releasing to the App Store.

## Overview

When you run the app locally, you typically:
1. Start the backend server (e.g., `npm run dev` in the `backend/` folder)
2. Start the frontend (e.g., `expo start`)

For App Store releases, the backend must be deployed to a public URL that your mobile app can access.

## Step-by-Step Process

### Step 1: Deploy Your Backend

Your backend is a Next.js application. Deploy it to one of these services:

#### Option A: Vercel (Recommended for Next.js)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New Project**
3. Import your repository
4. Set the **Root Directory** to `backend`
5. Add environment variables:
   - `OPENAI_API_KEY` (for transcription)
   - `SUPABASE_URL` (if your backend uses Supabase)
   - `SUPABASE_SERVICE_ROLE_KEY` (if needed)
6. Deploy
7. Copy your deployment URL (e.g., `https://dreamer-api.vercel.app`)

#### Option B: Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Create a new project
3. Deploy from GitHub and select your `backend` folder
4. Set environment variables
5. Deploy and get your URL

#### Option C: Other Services

- AWS (Lambda/ECS)
- Google Cloud Run
- Azure Functions
- DigitalOcean App Platform
- Any service that supports Node.js/Next.js

### Step 2: Configure Environment Variables in EAS

Environment variables are baked into your app at **build time**, not runtime. You need to set them in EAS before building.

#### Using EAS CLI:

```bash
# Set the backend URL for production builds
eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value https://your-backend-domain.com --type string

# Set other required variables
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your_supabase_url --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your_supabase_key --type string
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_API_KEY --value your_revenuecat_key --type string
eas secret:create --scope project --name EXPO_PUBLIC_MIXPANEL_TOKEN --value your_mixpanel_token --type string
```

#### Using EAS Dashboard:

1. Go to [expo.dev](https://expo.dev)
2. Select your project
3. Navigate to **Secrets** → **Environment Variables**
4. Add each variable:
   - `EXPO_PUBLIC_BACKEND_URL` = `https://your-backend-domain.com`
   - `EXPO_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `EXPO_PUBLIC_REVENUECAT_API_KEY` = your RevenueCat key
   - `EXPO_PUBLIC_MIXPANEL_TOKEN` = your Mixpanel token

### Step 3: Verify Your Backend is Accessible

Before building, test that your backend is accessible:

```bash
# Test your backend health endpoint (if you have one)
curl https://your-backend-domain.com/api/health

# Or test any API endpoint
curl https://your-backend-domain.com/api/dreams
```

### Step 4: Build for Production

```bash
# Build for iOS App Store
eas build --platform ios --profile production

# Build for Android Play Store
eas build --platform android --profile production
```

The environment variables you set in EAS will be automatically included in the build.

### Step 5: Test the Production Build

Before submitting to the App Store:

1. Install the production build on a test device
2. Verify the app connects to your production backend
3. Test key features that require backend access
4. Check network requests in your backend logs

### Step 6: Submit to App Store

Once verified, submit your build:

```bash
eas submit --platform ios --profile production
```

## Environment Variable Setup Summary

### Required for Production:

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_BACKEND_URL` | Your deployed backend URL | `https://dreamer-api.vercel.app` |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | RevenueCat public key | `pk_live_...` |
| `EXPO_PUBLIC_MIXPANEL_TOKEN` | Mixpanel project token | `abc123...` |

### Local Development:

For local development, use a `.env.local` file:
```bash
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
# ... other variables
```

**Note**: When testing on a physical device, use your computer's IP:
```bash
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3000
```

## Troubleshooting

### App can't connect to backend

1. **Check CORS settings**: Ensure your backend allows requests from your app
2. **Verify URL**: Make sure `EXPO_PUBLIC_BACKEND_URL` is set correctly in EAS
3. **Check backend logs**: Look for incoming requests
4. **Test backend directly**: Use `curl` or Postman to verify endpoints work

### Environment variables not working

1. **Rebuild**: Environment variables are baked in at build time - you must rebuild
2. **Check variable names**: Must start with `EXPO_PUBLIC_` to be available in the app
3. **Verify in EAS**: Check that variables are set in the EAS dashboard

### Backend deployment issues

1. **Check build logs**: Look for errors in your deployment service
2. **Verify environment variables**: Backend needs its own env vars (e.g., `OPENAI_API_KEY`)
3. **Check Node.js version**: Ensure your deployment service supports the required version

## Quick Checklist

Before releasing to App Store:

- [ ] Backend deployed to a public URL
- [ ] Backend URL is accessible and tested
- [ ] All environment variables set in EAS
- [ ] Production build created and tested
- [ ] App successfully connects to production backend
- [ ] Key features tested with production backend
- [ ] Backend CORS configured correctly
- [ ] Backend environment variables configured (OpenAI, Supabase, etc.)

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Secrets Documentation](https://docs.expo.dev/build-reference/variables/)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)




