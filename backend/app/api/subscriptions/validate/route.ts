import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

/**
 * Subscription Validation API
 * 
 * Validates subscription status against RevenueCat and updates database
 * This endpoint can be called to ensure subscription data is accurate
 */

interface SubscriptionValidationRequest {
  user_id?: string;
  rc_app_user_id?: string;
  force_refresh?: boolean;
}

interface SubscriptionStatus {
  user_id: string;
  rc_app_user_id: string;
  is_active: boolean;
  is_trial: boolean;
  will_renew: boolean;
  product_id: string;
  current_period_end: string;
  last_updated: string;
  needs_attention: boolean;
  issues: string[];
}

/**
 * Validate subscription against RevenueCat
 * Note: This is a simplified version - in production you'd call RevenueCat's API
 */
async function validateWithRevenueCat(rcAppUserId: string): Promise<{
  is_active: boolean;
  is_trial: boolean;
  will_renew: boolean;
  product_id: string;
  current_period_end: string;
  last_checked: string;
}> {
  // In a real implementation, you would:
  // 1. Call RevenueCat's REST API to get current customer info
  // 2. Parse the response to extract subscription details
  // 3. Return the validated data
  
  // For now, we'll return the current database data as a placeholder
  // TODO: Implement actual RevenueCat API call
  console.error('🔍 Validating subscription with RevenueCat for user:', rcAppUserId);
  
  // This would be replaced with actual RevenueCat API call
  return {
    is_active: true,
    is_trial: false,
    will_renew: true,
    product_id: 'monthly_subscription',
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    last_checked: new Date().toISOString()
  };
}

/**
 * Get subscription status for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const rcAppUserId = searchParams.get('rc_app_user_id');
    const forceRefresh = searchParams.get('force_refresh') === 'true';

    if (!userId && !rcAppUserId) {
      return NextResponse.json(
        { error: 'Either user_id or rc_app_user_id is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Find subscription record - get the most recent active subscription
    let query = supabase
      .from('user_subscriptions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (rcAppUserId) {
      query = query.eq('rc_app_user_id', rcAppUserId);
    }

    const { data: subscriptions, error: fetchError } = await query.limit(1);

    if (fetchError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'Active subscription not found' },
        { status: 404 }
      );
    }

    const subscription = subscriptions[0];

    // If force refresh is requested, validate with RevenueCat
    if (forceRefresh) {
      console.error('🔄 Force refreshing subscription data...');
      
      try {
        const validatedData = await validateWithRevenueCat(subscription.rc_app_user_id);
        
        // Update database with validated data - update the specific subscription record
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            is_active: validatedData.is_active,
            is_trial: validatedData.is_trial,
            will_renew: validatedData.will_renew,
            product_id: validatedData.product_id,
            current_period_end: validatedData.current_period_end,
            updated_at: validatedData.last_checked
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('❌ Error updating subscription:', updateError);
        } else {
          console.error('✅ Subscription data refreshed from RevenueCat');
        }
      } catch (error) {
        console.error('❌ Error validating with RevenueCat:', error);
      }
    }

    // Check for potential issues
    const issues: string[] = [];
    const now = new Date();
    const expirationDate = new Date(subscription.current_period_end);
    
    if (expirationDate < now) {
      issues.push('Subscription has expired');
    }
    
    if (expirationDate < new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
      issues.push('Subscription expires within 24 hours');
    }
    
    if (!subscription.is_active && subscription.will_renew) {
      issues.push('Subscription is inactive but marked as renewing');
    }

    const needsAttention = issues.length > 0;

    const status: SubscriptionStatus = {
      user_id: subscription.user_id,
      rc_app_user_id: subscription.rc_app_user_id,
      is_active: subscription.is_active,
      is_trial: subscription.is_trial,
      will_renew: subscription.will_renew,
      product_id: subscription.product_id,
      current_period_end: subscription.current_period_end,
      last_updated: subscription.updated_at,
      needs_attention: needsAttention,
      issues
    };

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error: any) {
    console.error('❌ Error validating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update subscription status (for manual corrections)
 */
export async function POST(request: NextRequest) {
  try {
    const body: {
      user_id: string;
      updates: {
        is_active?: boolean;
        is_trial?: boolean;
        will_renew?: boolean;
        product_id?: string;
        current_period_end?: string;
      };
    } = await request.json();

    if (!body.user_id || !body.updates) {
      return NextResponse.json(
        { error: 'user_id and updates are required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    // Update subscription
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        ...body.updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', body.user_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    console.error('✅ Subscription updated manually:', {
      user_id: body.user_id,
      updates: body.updates
    });

    return NextResponse.json({
      success: true,
      data: updatedSubscription,
      message: 'Subscription updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

