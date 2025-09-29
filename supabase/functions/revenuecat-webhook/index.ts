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

  console.log('🔄 Processing RevenueCat webhook:', {
    type: eventData.type,
    app_user_id: eventData.app_user_id,
    product_id: eventData.product_id,
    is_trial_period: eventData.is_trial_period,
    expiration_at_ms: eventData.expiration_at_ms
  });

  // Find user by RevenueCat app_user_id (look for any existing subscription)
  const { data: existingSubscriptions, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('user_id, rc_app_user_id, is_trial, is_active')
    .eq('rc_app_user_id', eventData.app_user_id);

  if (fetchError) {
    console.error('❌ Error fetching user subscriptions:', fetchError);
    return { success: false, error: 'Database error' };
  }

  if (!existingSubscriptions || existingSubscriptions.length === 0) {
    console.error('❌ User not found for RevenueCat app_user_id:', eventData.app_user_id);
    return { success: false, error: 'User not found' };
  }

  const userId = existingSubscriptions[0].user_id;

  // Determine subscription status based on event type
  let isActive = true;
  let isTrial = eventData.is_trial_period;
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
      return { success: false, error: 'Unknown event type' };
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

  // Prepare subscription data
  const subscriptionData = {
    user_id: userId,
    rc_app_user_id: eventData.app_user_id,
    rc_original_app_user_id: eventData.original_app_user_id,
    entitlement: eventData.entitlement_id || 'pro',
    product_id: eventData.product_id,
    store: eventData.store,
    is_active: isActive,
    is_trial: isTrial,
    will_renew: willRenew,
    current_period_end: currentPeriodEnd.toISOString(),
    original_purchase_at: new Date(eventData.purchased_at_ms).toISOString(),
    rc_snapshot: eventData
  };

  // Handle different event types with new schema approach
  if (eventData.type === 'INITIAL_PURCHASE' && !isTrial) {
    // This is a trial conversion - deactivate the trial entry first
    const { error: deactivateError } = await supabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('rc_app_user_id', eventData.app_user_id)
      .eq('is_trial', true)
      .eq('is_active', true);

    if (deactivateError) {
      console.error('❌ Error deactivating trial entry:', deactivateError);
    } else {
      console.log('✅ Deactivated trial entry for conversion');
    }

    // Insert new paid subscription entry
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert(subscriptionData);

    if (insertError) {
      console.error('❌ Error inserting paid subscription:', insertError);
      return { success: false, error: insertError.message };
    }
  } else if (eventData.type === 'INITIAL_PURCHASE' && isTrial) {
    // This is a new trial - check if user already has an active trial
    const { data: existingTrial } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_trial', true)
      .eq('is_active', true)
      .single();

    if (existingTrial) {
      // Update existing trial
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('id', existingTrial.id);

      if (updateError) {
        console.error('❌ Error updating existing trial:', updateError);
        return { success: false, error: updateError.message };
      }
      console.log('✅ Updated existing trial');
    } else {
      // Insert new trial entry
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);

      if (insertError) {
        console.error('❌ Error inserting new trial:', insertError);
        return { success: false, error: insertError.message };
      }
      console.log('✅ Created new trial entry');
    }
  } else {
    // For other event types (RENEWAL, CANCELLATION, etc.), update the most recent active subscription
    const { data: activeSubscription } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (activeSubscription) {
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update(subscriptionData)
        .eq('id', activeSubscription.id);

      if (updateError) {
        console.error('❌ Error updating subscription:', updateError);
        return { success: false, error: updateError.message };
      }
      console.log('✅ Updated existing subscription');
    } else {
      // No active subscription found, create new one
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);

      if (insertError) {
        console.error('❌ Error inserting subscription:', insertError);
        return { success: false, error: insertError.message };
      }
      console.log('✅ Created new subscription entry');
    }
  }

  console.log('✅ Subscription processed successfully:', {
    user_id: userId,
    type: eventData.type,
    is_active: isActive,
    is_trial: isTrial,
    will_renew: willRenew
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

  // Handle GET requests for testing - bypass auth for testing
  if (req.method === 'GET') {
    console.log('✅ GET request - webhook endpoint is active');
    return new Response(
      JSON.stringify({ 
        message: 'RevenueCat webhook endpoint is active',
        timestamp: new Date().toISOString(),
        environment: {
          hasWebhookSecret: !!Deno.env.get('REVENUECAT_WEBHOOK_SECRET'),
          hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
          hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('🔍 Getting Supabase client...');
    // Get Supabase client (URL and service role key are automatically provided)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Supabase client created');

    // Get webhook secret from environment
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
    console.log('🔍 Webhook secret configured:', !!webhookSecret);
    
    if (!webhookSecret) {
      console.error('❌ REVENUECAT_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the raw body and signature
    console.log('🔍 Reading request body...');
    const body = await req.text();
    console.log('📝 Body length:', body.length);
    
    // Try multiple header formats that RevenueCat might use
    let signature = req.headers.get('X-RevenueCat-Signature') || 
                   req.headers.get('x-revenuecat-signature') ||
                   req.headers.get('authorization')?.replace('Bearer ', '') ||
                   req.headers.get('Authorization')?.replace('Bearer ', '');
    
    console.log('🔐 Signature present:', !!signature);
    console.log('🔍 Available headers:', Array.from(req.headers.keys()));
    
    if (!signature) {
      console.error('❌ No webhook signature provided');
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify webhook authentication (RevenueCat uses simple token auth, not HMAC)
    console.log('🔍 Verifying webhook authentication...');
    console.log('🔍 Authentication details:', {
      receivedToken: signature,
      expectedToken: webhookSecret,
      tokenLength: signature?.length,
      secretLength: webhookSecret?.length,
      bodyLength: body.length
    });
    
    // Simple token comparison (RevenueCat doesn't use HMAC signatures)
    if (signature !== webhookSecret) {
      console.error('❌ Invalid webhook token');
      console.log('🔍 Token comparison failed:', {
        received: signature,
        expected: webhookSecret,
        match: signature === webhookSecret
      });
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('✅ Webhook authentication successful');

    // Parse the webhook payload
    console.log('🔍 Parsing webhook payload...');
    const webhookData: RevenueCatWebhookEvent = JSON.parse(body);
    
    console.log('📨 Received RevenueCat webhook:', {
      type: webhookData.event.type,
      app_user_id: webhookData.event.app_user_id,
      product_id: webhookData.event.product_id
    });

    // Process the subscription update
    console.log('🔄 Processing subscription update...');
    const result = await processSubscriptionUpdate(webhookData, supabase);
    
    if (!result.success) {
      console.error('❌ Failed to process webhook:', result.error);
      return new Response(
        JSON.stringify({ error: result.error }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Webhook processed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error processing RevenueCat webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})