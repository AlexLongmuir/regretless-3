# RevenueCat Database Synchronization Implementation

This document outlines the comprehensive changes made to establish the Supabase database as the single source of truth for subscription status, ensuring robust synchronization across sandbox and production environments.

## Overview

The implementation includes:
1. **Database Schema Updates** - SQL migration script for RLS relaxation and environment tracking
2. **Webhook Improvements** - Enhanced RevenueCat webhook handler with upsert logic and environment support
3. **Sync Function** - New Edge Function for manual/cron-based synchronization
4. **Frontend Migration** - Updated EntitlementsContext to use database as source of truth

## Manual Steps Required

### 1. Run SQL Migration

Execute the SQL migration script in your Supabase SQL Editor:

**File**: `migrations/revenuecat_sync_improvements.sql`

This script:
- Adds `environment` column to track SANDBOX vs PRODUCTION
- Relaxes RLS policy to allow reading all subscriptions (needed for constraint checks)
- Maintains security by keeping INSERT/UPDATE restricted to own records

**Important**: Review the SQL before running, especially the RLS policy change. The policy allows all authenticated users to read subscription records, which is necessary to check if a RevenueCat ID exists before attempting inserts.

### 2. Deploy Edge Functions

Deploy the updated webhook and new sync function:

```bash
# Deploy webhook (updated)
supabase functions deploy revenuecat-webhook

# Deploy sync function (new)
supabase functions deploy sync-revenuecat
```

### 3. Configure Environment Variables

Ensure these environment variables are set in Supabase Edge Functions:

**For revenuecat-webhook:**
- `REVENUECAT_WEBHOOK_SECRET` - Your RevenueCat webhook authentication token (set this in Supabase Dashboard → Edge Functions → revenuecat-webhook → Settings → Secrets)

**For sync-revenuecat:**
- `REVENUECAT_API_KEY` - Your RevenueCat API key (for REST API calls)
- `CRON_SECRET` - Secret for cron job authentication (optional, for scheduled syncs)
  - If not set, the function will require authenticated user JWT tokens (for frontend calls)
  - If set, you can use either CRON_SECRET or user JWT tokens

### 4. Set Up RevenueCat Webhooks

In RevenueCat Dashboard:
1. Go to **Project Settings** → **Integrations** → **Webhooks**
2. Click **"Add webhook"** or **"New webhook"**
3. **Webhook URL**: `https://cqzutvspbsspgtmcdqyp.supabase.co/functions/v1/revenuecat-webhook`
   - Replace `cqzutvspbsspgtmcdqyp` with your Supabase project reference ID
4. **Authorization header value**: Enter your `REVENUECAT_WEBHOOK_SECRET` value here
   - **Important**: RevenueCat will send this as `Authorization: Bearer {your_secret}`
   - Make sure this matches exactly what you set in Supabase Edge Function secrets
5. **Environment to send events for**: Select **"Both Production and Sandbox"** (or create separate webhooks)
6. **Events filter**:
   - **App**: Select your app or "All apps"
   - **Event type**: Select **"All events"** or specific events:
     - `INITIAL_PURCHASE`
     - `RENEWAL`
     - `CANCELLATION`
     - `EXPIRATION`
     - `BILLING_ISSUE`
     - `SUBSCRIPTION_PAUSED`
     - `SUBSCRIPTION_RESUMED`
     - `PRODUCT_CHANGE`

**Troubleshooting Webhook Auth Errors:**

If you get `"Auth header is not 'Bearer {token}'"` error:

This error comes from Supabase's Edge Function runtime, which validates JWT tokens in the Authorization header **before** our code runs. Here's how to fix it:

**Solution: Use Query Parameter for Webhook Secret**

1. **Get your Supabase Anon Key** from Supabase Dashboard → Project Settings → API

2. **In RevenueCat webhook configuration:**
   - **Webhook URL**: Add your webhook secret as a query parameter:
     ```
     https://cqzutvspbsspgtmcdqyp.supabase.co/functions/v1/revenuecat-webhook?secret={your_REVENUECAT_WEBHOOK_SECRET}
     ```
     Replace `{your_REVENUECAT_WEBHOOK_SECRET}` with your actual webhook secret value
   
   - **Authorization header value**: Enter your **Supabase Anon Key** here
     - This satisfies Supabase's runtime JWT validation
     - RevenueCat will send it as `Authorization: Bearer {anon_key}`
   
   - The webhook handler will:
     1. Let Supabase validate the anon key (passes runtime check)
     2. Extract the webhook secret from the query parameter
     3. Validate it matches `REVENUECAT_WEBHOOK_SECRET`

**Alternative: Use Custom Header**
- If RevenueCat supports custom headers, you can use `X-RevenueCat-Signature` header
- Set the value to your `REVENUECAT_WEBHOOK_SECRET`
- Set Authorization header to your Supabase anon key
- The webhook handler checks custom headers as a fallback

**Verification:**
- Check Supabase function logs to see which authentication method was used
- Verify the secret matches exactly (no extra spaces, correct case)
- Test with RevenueCat's "Send test event" feature

### 5. Optional: Set Up Cron Job for Periodic Sync

If you want periodic synchronization as a backup:

Create a cron job (e.g., using Supabase Cron or external service) that calls:
```
POST https://your-project.supabase.co/functions/v1/sync-revenuecat
Authorization: Bearer YOUR_CRON_SECRET
Content-Type: application/json

{
  "sync_all": true
}
```

This will sync all active subscriptions from RevenueCat to the database.

## Architecture Changes

### Before
- Frontend checked RevenueCat SDK directly for access control
- Database was only a cache/backup
- Two sources of truth causing inconsistencies

### After
- **Database is source of truth** for access control
- Frontend queries database first, falls back to RevenueCat SDK if database unavailable
- Webhooks keep database synchronized in real-time
- Sync function provides manual/cron-based synchronization as backup

## Key Features

### 1. Database-First Access Control

The `hasProAccess` computed value now:
1. Checks database subscription status first
2. Validates expiration dates
3. Falls back to RevenueCat SDK if database unavailable
4. Automatically refreshes when user authenticates

### 2. Robust Webhook Handler

The webhook now:
- Uses upsert logic to handle race conditions
- Tracks environment (SANDBOX vs PRODUCTION)
- Handles trial conversions correctly
- Updates existing records instead of creating duplicates

### 3. Manual Sync Function

The sync function allows:
- Manual synchronization of a single user
- Bulk synchronization of all active subscriptions
- Direct API calls to RevenueCat REST API
- Useful for fixing inconsistencies or initial sync

### 4. Improved Error Handling

- Better handling of unique constraint violations
- Checks if subscription belongs to current user before erroring
- Updates inactive records instead of failing

## Testing Checklist

After implementation:

- [ ] Run SQL migration successfully
- [ ] Deploy both Edge Functions
- [ ] Test webhook with RevenueCat test events
- [ ] Verify sandbox purchases sync correctly
- [ ] Verify production purchases sync correctly
- [ ] Test access control with database as source of truth
- [ ] Test fallback to RevenueCat SDK when database unavailable
- [ ] Test manual sync function
- [ ] Verify expired subscriptions are correctly marked inactive

## Troubleshooting

### Webhook Not Receiving Events
- Check RevenueCat dashboard webhook logs
- Verify webhook URL is correct
- Verify authentication token matches
- Check Supabase function logs

### Database Out of Sync
- Use sync function to manually sync: `syncFromRevenueCat()`
- Check webhook logs for failed events
- Verify webhook is processing both SANDBOX and PRODUCTION events

### Access Control Issues
- Check database subscription status directly
- Verify `is_active` and `current_period_end` are correct
- Use `refreshDbSubscription()` to force refresh
- Check if fallback to RevenueCat SDK is working

## Files Changed

1. `migrations/revenuecat_sync_improvements.sql` - SQL migration script
2. `supabase/functions/revenuecat-webhook/index.ts` - Enhanced webhook handler
3. `supabase/functions/sync-revenuecat/index.ts` - New sync function
4. `contexts/EntitlementsContext.tsx` - Updated to use database as source of truth

## Next Steps

1. Run the SQL migration
2. Deploy the Edge Functions
3. Configure RevenueCat webhooks
4. Test thoroughly in sandbox
5. Monitor webhook logs for first few days
6. Set up cron job if desired for periodic sync

