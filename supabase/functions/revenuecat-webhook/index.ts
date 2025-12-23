import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    id: string;
    type: string;
    event_timestamp_ms: number;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms: number;
    environment: string;
    entitlement_id?: string;
    entitlement_ids?: string[];
    presented_offering_id?: string;
    transaction_id: string;
    original_transaction_id: string;
    is_family_share: boolean;
    country_code: string;
    app_id: string;
    offer_code?: string;
    currency: string;
    price: number;
    price_in_purchased_currency: number;
    subscriber_attributes: Record<string, any>;
    store: string;
    takehome_percentage: number;
    commission_percentage: number;
    is_trial_period: boolean;
    cancel_reason?: string;
    new_product_id?: string;
    grace_period_expiration_at_ms?: number;
    auto_resume_at_ms?: number;
    offer_discount_type?: string;
    offer_period?: string;
  };
}

// Note: RevenueCat uses simple token authentication in the Authorization header
// rather than HMAC signature verification

/**
 * Process subscription data and update database
 */
async function processSubscriptionUpdate(event: RevenueCatWebhookEvent, supabase: any) {
  const { event: eventData } = event;

  // Normalize environment to uppercase
  const environment = (eventData.environment || 'PRODUCTION').toUpperCase();
  
  console.log('🔄 Processing RevenueCat webhook:', {
    type: eventData.type,
    app_user_id: eventData.app_user_id,
    product_id: eventData.product_id,
    is_trial_period: eventData.is_trial_period,
    expiration_at_ms: eventData.expiration_at_ms,
    environment: environment
  });

  // Find user by RevenueCat app_user_id to get the internal user_id
  // We need to find the user_id associated with this RevenueCat ID
  // Try both rc_app_user_id and rc_original_app_user_id to handle aliases
  const { data: existingSubscriptions, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('user_id, rc_app_user_id, rc_original_app_user_id, is_trial, is_active, id')
    .or(`rc_app_user_id.eq.${eventData.app_user_id},rc_original_app_user_id.eq.${eventData.app_user_id}`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('❌ Error fetching user subscriptions:', fetchError);
    return { success: false, error: 'Database error' };
  }

  let userId: string | null = null;

  if (existingSubscriptions && existingSubscriptions.length > 0) {
    userId = existingSubscriptions[0].user_id;
  } else {
    // No subscription record exists yet - this can happen when:
    // 1. User purchased before logging in (anonymous purchase)
    // 2. Webhook arrives before app syncs
    // 3. RevenueCat app_user_id doesn't match any existing subscription
    
    console.log('⚠️ No subscription record found for rc_app_user_id:', eventData.app_user_id);
    
    // Check if the RevenueCat app_user_id is a UUID (might be a Supabase user_id)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const mightBeUserId = uuidRegex.test(eventData.app_user_id);
    
    if (mightBeUserId) {
      // Try to verify if it's a valid user_id using RPC or direct query
      // For now, we'll attempt to create a subscription record with this as user_id
      // If it fails due to foreign key constraint, we know it's not a valid user_id
      console.log('⚠️ rc_app_user_id looks like a UUID, attempting to use as user_id...');
      userId = eventData.app_user_id; // Will be validated by foreign key constraint on insert
    } else {
      // Anonymous ID or other format - can't determine user_id
      console.log('⚠️ rc_app_user_id is not a UUID format, cannot determine user_id');
      console.log('⚠️ This webhook will be processed when the user logs in and syncs.');
      // Return success so RevenueCat doesn't keep retrying
      // The app will sync when the user logs in via storeBillingSnapshot
      return { 
        success: true, 
        skipped: true, 
        message: 'User not found - will be processed when user logs in and syncs' 
      };
    }
  }

  // Determine subscription status based on event type
  let isActive = true;
  // Default to false, then check various sources for trial detection
  // Ensure isTrial is always a boolean (handle null/undefined)
  let isTrial = Boolean(eventData.is_trial_period);
  let willRenew = true;

  // Enhanced trial detection - check multiple sources
  if (!isTrial && eventData.offer_discount_type === 'FREE_TRIAL') {
    isTrial = true;
    console.log('🔄 Detected trial from offer_discount_type');
  }

  // Check if this is a trial based on offer period
  if (!isTrial && eventData.offer_period === 'P3D') {
    isTrial = true;
    console.log('🔄 Detected 3-day trial from offer_period');
  }

  // Check if price is 0 (typical for trials)
  if (!isTrial && eventData.price === 0) {
    isTrial = true;
    console.log('🔄 Detected trial from zero price');
  }

  // Ensure isTrial is always a boolean (never null/undefined)
  isTrial = Boolean(isTrial);
  
  // Ensure willRenew is always a boolean (never null/undefined)
  willRenew = Boolean(willRenew);
  
  // Ensure isActive is always a boolean (never null/undefined)
  isActive = Boolean(isActive);

  switch (eventData.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
      isActive = true;
      willRenew = true;
      break;
    
    case 'CANCELLATION':
      isActive = true; // Still active until expiration
      willRenew = false;
      break;
    
    case 'EXPIRATION':
      isActive = false;
      willRenew = false;
      break;
    
    case 'BILLING_ISSUE':
    case 'BILLING_RETRY':
      isActive = true; // Still active during billing retry
      willRenew = true;
      break;
    
    case 'SUBSCRIPTION_PAUSED':
      isActive = false;
      willRenew = false;
      break;
    
    case 'SUBSCRIPTION_RESUMED':
      isActive = true;
      willRenew = true;
      break;
    
    default:
      console.log('⚠️ Unknown event type:', eventData.type);
      // For unknown events, we might still want to update the snapshot if we can
      // But safest to not change active status if unsure, or treat as update
      break;
  }

  // Calculate proper expiration date for trials
  let currentPeriodEnd: Date;
  if (isTrial) {
    // For trials, calculate based on trial period, not full subscription period
    if (eventData.offer_period === 'P3D') {
      currentPeriodEnd = new Date(eventData.purchased_at_ms + (3 * 24 * 60 * 60 * 1000)); // 3 days
    } else if (eventData.offer_period === 'P7D') {
      currentPeriodEnd = new Date(eventData.purchased_at_ms + (7 * 24 * 60 * 60 * 1000)); // 7 days
    } else {
      // Default to 3 days for trials if no specific period
      currentPeriodEnd = new Date(eventData.purchased_at_ms + (3 * 24 * 60 * 60 * 1000));
    }
    console.log('🔄 Calculated trial expiration:', currentPeriodEnd.toISOString());
  } else {
    currentPeriodEnd = new Date(eventData.expiration_at_ms);
  }

  // Ensure we have a valid user_id before proceeding
  if (!userId) {
    console.error('❌ No user_id available for subscription');
    return { success: false, error: 'User ID is required' };
  }

  // Normalize store value (ensure it's always valid)
  let store = 'app_store'; // default
  if (eventData.store) {
    const storeLower = eventData.store.toLowerCase();
    if (storeLower === 'app_store' || storeLower === 'ios') {
      store = 'app_store';
    } else if (storeLower === 'play_store' || storeLower === 'android') {
      store = 'play_store';
    } else if (storeLower === 'stripe') {
      store = 'stripe';
    }
  }

  // Prepare subscription data for upsert
  const subscriptionData = {
    user_id: userId,
    rc_app_user_id: eventData.app_user_id,
    rc_original_app_user_id: eventData.original_app_user_id || eventData.app_user_id,
    entitlement: eventData.entitlement_id || eventData.entitlement_ids?.[0] || 'pro',
    product_id: eventData.product_id || 'unknown',
    store: store,
    is_active: isActive,
    is_trial: isTrial,
    will_renew: willRenew,
    current_period_end: currentPeriodEnd.toISOString(),
    original_purchase_at: new Date(eventData.purchased_at_ms).toISOString(),
    rc_snapshot: eventData,
    environment: environment // Store normalized environment
  };

  // Handle special cases for trial conversions
  if (eventData.type === 'INITIAL_PURCHASE' && !isTrial) {
    // This is a trial conversion - deactivate any existing trial entries first
    const { error: deactivateError } = await supabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_trial', true)
      .eq('is_active', true);

    if (deactivateError) {
      console.error('❌ Error deactivating trial entry:', deactivateError);
      // Continue anyway - upsert will create the paid subscription
    } else {
      console.log('✅ Deactivated trial entry for conversion');
    }
  }

  // Use Upsert to handle race conditions robustly
  // We use rc_app_user_id as the unique constraint key
  // This ensures we update existing records or create new ones atomically
  const { error: upsertError } = await supabase
    .from('user_subscriptions')
    .upsert(subscriptionData, { 
      onConflict: 'rc_app_user_id',
      ignoreDuplicates: false // We want to update existing records
    });

  if (upsertError) {
    // Check if error is due to foreign key constraint (invalid user_id)
    if (upsertError.code === '23503' || upsertError.message.includes('foreign key')) {
      console.error('❌ Invalid user_id - user does not exist:', userId);
      console.log('⚠️ This webhook will be processed when the user logs in and syncs.');
      // Return success so RevenueCat doesn't keep retrying
      return { 
        success: true, 
        skipped: true, 
        message: 'User not found - will be processed when user logs in' 
      };
    }
    
    console.error('❌ Error upserting subscription:', upsertError);
    return { success: false, error: upsertError.message };
  }

  console.log('✅ Subscription upserted successfully:', {
    user_id: userId,
    rc_app_user_id: eventData.app_user_id,
    type: eventData.type,
    is_active: isActive,
    is_trial: isTrial,
    environment: environment
  });

  return { success: true };
}

serve(async (req) => {
  console.log('🚀 Webhook function called', { method: req.method, url: req.url });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response('ok', { headers: corsHeaders })
  }

  // Handle GET requests for testing
  if (req.method === 'GET') {
    console.log('✅ GET request - webhook endpoint is active');
    return new Response(
      JSON.stringify({ 
        message: 'RevenueCat webhook endpoint is active',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Get webhook secret first to validate
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('❌ REVENUECAT_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration error' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read body first (before auth check to avoid issues)
    const body = await req.text();
    
    // Supabase Edge Functions require a valid JWT in Authorization header
    // RevenueCat sends webhook secret in Authorization header, but Supabase validates it as JWT first
    // Solution: Use Supabase anon key in Authorization header (to satisfy Supabase runtime)
    // and check webhook secret from query parameter or custom header
    
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const customHeader = req.headers.get('X-RevenueCat-Signature') || req.headers.get('x-revenuecat-signature');
    
    // Check for webhook secret in query parameter (RevenueCat can add this)
    const url = new URL(req.url);
    const secretFromQuery = url.searchParams.get('secret');
    
    // Extract webhook secret from multiple possible locations
    let signature: string | null = null;
    
    // Priority 1: Query parameter (most reliable for bypassing Supabase JWT check)
    if (secretFromQuery) {
      signature = secretFromQuery.trim();
      console.log('🔑 Found webhook secret in query parameter');
    }
    // Priority 2: Custom header
    else if (customHeader) {
      signature = customHeader.trim();
      console.log('🔑 Found webhook secret in custom header');
    }
    // Priority 3: Authorization header (if it's not a JWT, it might be our secret)
    else if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        // Check if it's our webhook secret (not a JWT)
        // JWTs typically have 3 parts separated by dots
        if (!token.includes('.') || token.split('.').length !== 3) {
          // Not a JWT, might be our webhook secret
          signature = token;
          console.log('🔑 Found webhook secret in Authorization header (not a JWT)');
        }
      } else {
        signature = authHeader.trim();
      }
    }
    
    // Validate the signature matches our webhook secret
    if (!signature || signature !== webhookSecret) {
      console.error('❌ Invalid or missing webhook token');
      console.log('Auth check failed:', {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader ? authHeader.substring(0, 30) + '...' : null,
        hasCustomHeader: !!customHeader,
        hasQuerySecret: !!secretFromQuery,
        receivedSignatureLength: signature?.length,
        expectedSecretLength: webhookSecret.length,
        signatureMatch: signature === webhookSecret
      });
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Invalid webhook authentication token',
          hint: 'Add webhook secret as query parameter: ?secret={your_webhook_secret} OR use X-RevenueCat-Signature header'
        }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Webhook authentication successful');

    // Now create Supabase client (after auth check passes)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const webhookData: RevenueCatWebhookEvent = JSON.parse(body);
    
    // Process the subscription update
    const result = await processSubscriptionUpdate(webhookData, supabase);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Error processing RevenueCat webhook:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
})
