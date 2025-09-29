import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';
import { getTrialStatus, hasValidAccess, getTrialWarning } from '../../../../lib/trialValidation';

/**
 * Check trial status for a user
 * Returns detailed trial information including expiration and warnings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const rcAppUserId = searchParams.get('rc_app_user_id');

    if (!userId && !rcAppUserId) {
      return NextResponse.json({ error: 'user_id or rc_app_user_id is required' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Build query based on available parameters
    let query = supabase.from('user_subscriptions').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (rcAppUserId) {
      query = query.eq('rc_app_user_id', rcAppUserId);
    }

    const { data: subscription, error: fetchError } = await query.single();

    if (fetchError || !subscription) {
      return NextResponse.json({ 
        error: 'Subscription not found',
        details: fetchError?.message 
      }, { status: 404 });
    }

    // Get trial status
    const trialStatus = getTrialStatus(subscription);
    const hasAccess = hasValidAccess(subscription);
    const warning = getTrialWarning(trialStatus);

    const response = {
      user_id: subscription.user_id,
      rc_app_user_id: subscription.rc_app_user_id,
      product_id: subscription.product_id,
      store: subscription.store,
      
      // Trial status
      trial_status: trialStatus,
      
      // Access control
      has_valid_access: hasAccess,
      
      // Warnings
      warning: warning.should_warn ? warning : null,
      
      // Raw subscription data
      subscription: {
        is_active: subscription.is_active,
        is_trial: subscription.is_trial,
        will_renew: subscription.will_renew,
        current_period_end: subscription.current_period_end,
        original_purchase_at: subscription.original_purchase_at,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error checking trial status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Update trial status (for testing or manual intervention)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, rc_app_user_id, action } = body;

    if (!user_id && !rc_app_user_id) {
      return NextResponse.json({ error: 'user_id or rc_app_user_id is required' }, { status: 400 });
    }

    if (!action || !['expire_trial', 'extend_trial'].includes(action)) {
      return NextResponse.json({ error: 'action must be expire_trial or extend_trial' }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Build query based on available parameters
    let query = supabase.from('user_subscriptions').select('*');
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (rc_app_user_id) {
      query = query.eq('rc_app_user_id', rc_app_user_id);
    }

    const { data: subscription, error: fetchError } = await query.single();

    if (fetchError || !subscription) {
      return NextResponse.json({ 
        error: 'Subscription not found',
        details: fetchError?.message 
      }, { status: 404 });
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    if (action === 'expire_trial') {
      updateData.is_active = false;
    } else if (action === 'extend_trial' && body.extension_days) {
      const currentEnd = new Date(subscription.current_period_end);
      currentEnd.setDate(currentEnd.getDate() + body.extension_days);
      updateData.current_period_end = currentEnd.toISOString();
    }

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', subscription.user_id);

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update subscription',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Trial ${action} completed successfully`,
      updated_subscription: {
        user_id: subscription.user_id,
        ...updateData
      }
    });

  } catch (error) {
    console.error('❌ Error updating trial status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

