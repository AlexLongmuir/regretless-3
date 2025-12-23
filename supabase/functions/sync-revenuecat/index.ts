import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevenueCatCustomerInfo {
  request_date: string;
  request_date_ms: number;
  subscriber: {
    entitlements: {
      [key: string]: {
        expires_date: string | null;
        product_identifier: string;
        purchase_date: string;
        is_sandbox: boolean;
        unsubscribe_detected_at: string | null;
        billing_issues_detected_at: string | null;
        grace_period_expires_date: string | null;
        period_type: string;
        store: string;
      };
    };
    first_seen: string;
    last_seen: string;
    management_url: string | null;
    non_subscriptions: {
      [key: string]: any;
    };
    original_app_user_id: string;
    original_application_version: string | null;
    other_purchases: {
      [key: string]: any;
    };
    subscriptions: {
      [key: string]: {
        billing_issues_detected_at: string | null;
        expires_date: string | null;
        grace_period_expires_date: string | null;
        is_sandbox: boolean;
        original_purchase_date: string;
        period_type: string;
        product_identifier: string;
        purchase_date: string;
        store: string;
        unsubscribe_detected_at: string | null;
        will_renew: boolean;
      };
    };
  };
}

/**
 * Fetch customer info from RevenueCat REST API
 */
async function fetchRevenueCatCustomerInfo(rcAppUserId: string): Promise<RevenueCatCustomerInfo | null> {
  const revenueCatApiKey = Deno.env.get('REVENUECAT_API_KEY');
  
  if (!revenueCatApiKey) {
    console.error('❌ REVENUECAT_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(rcAppUserId)}`,
      {
        headers: {
          'Authorization': `Bearer ${revenueCatApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ RevenueCat API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return null;
    }

    const data: RevenueCatCustomerInfo = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching from RevenueCat API:', error);
    return null;
  }
}

/**
 * Extract subscription data from RevenueCat customer info
 */
function extractSubscriptionFromCustomerInfo(
  customerInfo: RevenueCatCustomerInfo,
  userId: string,
  rcAppUserId: string
): {
  subscriptionData: any;
  hasActiveSubscription: boolean;
} {
  const entitlements = customerInfo.subscriber.entitlements || {};
  const subscriptions = customerInfo.subscriber.subscriptions || {};
  
  // Find the 'pro' entitlement or any active entitlement
  let activeEntitlement = entitlements['pro'] || Object.values(entitlements)[0];
  
  if (!activeEntitlement) {
    // No active entitlements
    return {
      subscriptionData: null,
      hasActiveSubscription: false,
    };
  }

  // Find the corresponding subscription
  const productId = activeEntitlement.product_identifier;
  const subscription = subscriptions[productId];

  if (!subscription) {
    console.warn('⚠️ Entitlement found but no matching subscription:', productId);
    return {
      subscriptionData: null,
      hasActiveSubscription: false,
    };
  }

  // Determine if subscription is active
  const expiresDate = activeEntitlement.expires_date 
    ? new Date(activeEntitlement.expires_date) 
    : null;
  const now = new Date();
  const isActive = expiresDate ? expiresDate > now : false;

  // Determine if it's a trial (check period_type or short duration)
  let isTrial = false;
  if (activeEntitlement.period_type === 'trial') {
    isTrial = true;
  } else if (expiresDate) {
    const purchaseDate = new Date(subscription.purchase_date);
    const daysDifference = Math.ceil((expiresDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference <= 7) {
      isTrial = true;
    }
  }

  // Determine environment
  const environment = (activeEntitlement.is_sandbox || subscription.is_sandbox) ? 'SANDBOX' : 'PRODUCTION';

  // Normalize store
  const store = subscription.store.toLowerCase() === 'app_store' ? 'app_store' :
                subscription.store.toLowerCase() === 'play_store' ? 'play_store' : 'stripe';

  const subscriptionData = {
    user_id: userId,
    rc_app_user_id: rcAppUserId,
    rc_original_app_user_id: customerInfo.subscriber.original_app_user_id,
    entitlement: 'pro',
    product_id: productId,
    store: store,
    is_active: isActive,
    is_trial: isTrial,
    will_renew: subscription.will_renew ?? true,
    current_period_end: expiresDate ? expiresDate.toISOString() : new Date().toISOString(),
    original_purchase_at: subscription.original_purchase_date || subscription.purchase_date,
    rc_snapshot: customerInfo,
    environment: environment,
  };

  return {
    subscriptionData,
    hasActiveSubscription: isActive,
  };
}

/**
 * Sync a single user's subscription from RevenueCat to database
 */
async function syncUserSubscription(
  supabase: any,
  userId?: string,
  rcAppUserId?: string
): Promise<{ success: boolean; error?: string; synced?: boolean }> {
  // Get user_id or rc_app_user_id from database if not provided
  if (!rcAppUserId && userId) {
    const { data: userSub, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('rc_app_user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: `Database error: ${fetchError.message}` };
    }

    if (!userSub) {
      return { success: false, error: 'No subscription record found for user' };
    }

    rcAppUserId = userSub.rc_app_user_id;
  }

  if (!rcAppUserId) {
    return { success: false, error: 'rc_app_user_id is required' };
  }

  // Fetch current state from RevenueCat
  const customerInfo = await fetchRevenueCatCustomerInfo(rcAppUserId);
  
  if (!customerInfo) {
    return { success: false, error: 'Failed to fetch from RevenueCat API' };
  }

  // Get user_id if not provided
  if (!userId) {
    const { data: userSub, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('rc_app_user_id', rcAppUserId)
      .limit(1)
      .maybeSingle();

    if (fetchError || !userSub) {
      return { success: false, error: 'User not found in database' };
    }

    userId = userSub.user_id;
  }

  // Ensure we have both userId and rcAppUserId
  if (!userId || !rcAppUserId) {
    return { success: false, error: 'Both user_id and rc_app_user_id are required' };
  }

  // Extract subscription data
  const { subscriptionData, hasActiveSubscription } = extractSubscriptionFromCustomerInfo(
    customerInfo,
    userId,
    rcAppUserId
  );

  if (!subscriptionData) {
    // User has no active subscription - deactivate any existing records
    const { error: deactivateError } = await supabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (deactivateError) {
      return { success: false, error: `Failed to deactivate: ${deactivateError.message}` };
    }

    return { success: true, synced: true };
  }

  // Upsert subscription data
  const { error: upsertError } = await supabase
    .from('user_subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'rc_app_user_id',
      ignoreDuplicates: false,
    });

  if (upsertError) {
    return { success: false, error: `Upsert failed: ${upsertError.message}` };
  }

  return { success: true, synced: true };
}

serve(async (req) => {
  console.log('🚀 Sync RevenueCat function called', { method: req.method });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authorization (for cron jobs or authenticated user calls)
    // Note: Supabase Edge Functions require a Bearer token in Authorization header (validates as JWT)
    // For testing: Use anon key in Authorization header, pass user token in query param or custom header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const url = new URL(req.url);
    
    // Check for user token in query parameter (for testing when anon key is in Authorization header)
    const userTokenFromQuery = url.searchParams.get('user_token');
    const userTokenFromHeader = req.headers.get('X-User-Token') || req.headers.get('x-user-token');
    
    let isAuthenticated = false;
    let authenticatedUserId: string | null = null;
    let userToken: string | null = null;
    
    // Check for CRON_SECRET first (if configured)
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      console.log('✅ Authenticated via CRON_SECRET');
      isAuthenticated = true;
    } 
    // Check for user token in query parameter or custom header (for testing)
    else if (userTokenFromQuery || userTokenFromHeader) {
      userToken = (userTokenFromQuery || userTokenFromHeader)!.trim();
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
        if (!authError && user) {
          console.log('✅ Authenticated via user token (from query/header):', user.id);
          isAuthenticated = true;
          authenticatedUserId = user.id;
        } else {
          console.error('❌ Invalid user token:', authError?.message);
        }
      } catch (err) {
        console.error('❌ Error validating user token:', err);
      }
    }
    // Otherwise, check Authorization header for valid Supabase JWT token (normal frontend calls)
    else if (authHeader && authHeader.startsWith('Bearer ')) {
      userToken = authHeader.replace('Bearer ', '').trim();
      try {
        // Use service role client to validate user token
        // Service role can validate any JWT token
        const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
        if (!authError && user) {
          console.log('✅ Authenticated via user token (from Authorization header):', user.id);
          isAuthenticated = true;
          authenticatedUserId = user.id;
        } else {
          console.error('❌ Invalid user token:', authError?.message);
          console.log('Token validation failed - might need to use anon key in Authorization header and pass user token in ?user_token query param');
        }
      } catch (err) {
        console.error('❌ Error validating user token:', err);
      }
    }
    
    // If not authenticated, return 401
    if (!isAuthenticated) {
      console.log('❌ Authentication failed:', {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader ? authHeader.substring(0, 30) + '...' : null,
        hasCronSecret: !!cronSecret,
        hasUserTokenQuery: !!userTokenFromQuery,
        hasUserTokenHeader: !!userTokenFromHeader
      });
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Authentication required. Provide either CRON_SECRET or valid user JWT token.',
          hint: 'For frontend calls: Authorization header with Bearer {user_jwt_token}. For testing: Authorization header with Bearer {anon_key} and ?user_token={user_jwt_token} query param'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET') {
      // url already defined above
      const userId = url.searchParams.get('user_id');
      const rcAppUserId = url.searchParams.get('rc_app_user_id');

      if (!userId && !rcAppUserId) {
        return new Response(
          JSON.stringify({ error: 'Either user_id or rc_app_user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await syncUserSubscription(supabase, userId || undefined, rcAppUserId || undefined);
      
      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { user_id, rc_app_user_id, sync_all } = body;

      if (sync_all) {
        // Sync all active subscriptions (for cron jobs)
        const { data: activeSubscriptions, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('user_id, rc_app_user_id')
          .eq('is_active', true)
          .limit(100); // Limit to prevent timeout

        if (fetchError) {
          return new Response(
            JSON.stringify({ error: `Failed to fetch subscriptions: ${fetchError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const results = [];
        for (const sub of activeSubscriptions || []) {
          const result = await syncUserSubscription(supabase, sub.user_id, sub.rc_app_user_id);
          results.push({ user_id: sub.user_id, ...result });
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            synced_count: results.filter(r => r.success).length,
            total: results.length,
            results 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Sync single user
        if (!user_id && !rc_app_user_id) {
          return new Response(
            JSON.stringify({ error: 'Either user_id or rc_app_user_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await syncUserSubscription(supabase, user_id, rc_app_user_id);
        
        return new Response(
          JSON.stringify(result),
          { 
            status: result.success ? 200 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in sync-revenuecat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

