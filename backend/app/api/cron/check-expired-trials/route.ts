import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';
import { getTrialStatus } from '../../../../lib/trialValidation';

/**
 * Cron job to check for expired trials and update subscription status
 * Should be called daily to ensure trial users lose access when their trial expires
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (add your cron secret verification here)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseServer();
    const now = new Date();

    console.log('🔄 Checking for expired trials...');

    // Get all active trial subscriptions
    const { data: trialSubscriptions, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('is_trial', true)
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ Error fetching trial subscriptions:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    if (!trialSubscriptions || trialSubscriptions.length === 0) {
      console.log('✅ No active trial subscriptions found');
      return NextResponse.json({ 
        success: true, 
        message: 'No active trials to check',
        expired_count: 0 
      });
    }

    console.log(`📊 Found ${trialSubscriptions.length} active trial subscriptions to check`);

    let expiredCount = 0;
    const expiredUsers = [];

    for (const subscription of trialSubscriptions) {
      const trialStatus = getTrialStatus(subscription);
      
      if (trialStatus.has_expired) {
        console.log(`⏰ Trial expired for user ${subscription.user_id}`);
        
        // Update subscription to inactive
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', subscription.user_id);

        if (updateError) {
          console.error(`❌ Error updating expired trial for user ${subscription.user_id}:`, updateError);
        } else {
          expiredCount++;
          expiredUsers.push({
            user_id: subscription.user_id,
            rc_app_user_id: subscription.rc_app_user_id,
            trial_expired_at: subscription.current_period_end
          });
          
          console.log(`✅ Marked trial as expired for user ${subscription.user_id}`);
        }
      }
    }

    console.log(`✅ Trial check completed. ${expiredCount} trials expired.`);

    return NextResponse.json({
      success: true,
      message: `Checked ${trialSubscriptions.length} trial subscriptions`,
      expired_count: expiredCount,
      expired_users: expiredUsers
    });

  } catch (error) {
    console.error('❌ Error in trial expiration check:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Allow POST as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

