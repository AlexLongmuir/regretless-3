import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabaseServer';

/**
 * Cron Job: Subscription Lifecycle Check
 * 
 * This endpoint should be called periodically (e.g., every hour) to:
 * - Check for expired subscriptions
 * - Handle billing retries
 * - Send renewal reminders
 * - Update subscription statuses
 */

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Starting subscription lifecycle cron job...');
    
    // Simple subscription lifecycle check
    const supabase = supabaseServer();
    
    // Get all active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching subscriptions:', error);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    if (!subscriptions) {
      console.log('✅ No active subscriptions found');
      return NextResponse.json({ message: 'No active subscriptions' });
    }

    const now = new Date();
    let expiredCount = 0;
    
    // #region agent log
    const fs = require('fs');
    const logPath = '/Users/alex/regretless-3/.cursor/debug.log';
    fs.appendFileSync(logPath, JSON.stringify({location:'subscription-lifecycle/route.ts:49',message:'Starting subscription check - checking for push notification sending code',data:{subscriptionCount:subscriptions.length,hasExpoPushToken:typeof process.env.EXPO_ACCESS_TOKEN !== 'undefined',hasExpoPushTokenValue:!!process.env.EXPO_ACCESS_TOKEN},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C,D'}) + '\n');
    // #endregion
    
    // Check for expired subscriptions
    for (const subscription of subscriptions) {
      const expirationDate = new Date(subscription.current_period_end);
      
      if (expirationDate < now) {
        // #region agent log
        fs.appendFileSync(logPath, JSON.stringify({location:'subscription-lifecycle/route.ts:57',message:'Subscription expired - checking if push notification is sent',data:{userId:subscription.user_id,expirationDate:subscription.current_period_end},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n');
        // #endregion
        
        // Mark as expired
        await supabase
          .from('user_subscriptions')
          .update({
            is_active: false,
            will_renew: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', subscription.user_id);
        
        expiredCount++;
        console.warn(`⚠️ Marked subscription expired for user ${subscription.user_id}`);
        
        // #region agent log
        fs.appendFileSync(logPath, JSON.stringify({location:'subscription-lifecycle/route.ts:70',message:'After marking expired - no push notification sending code found',data:{userId:subscription.user_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n');
        // #endregion
      }
    }
    
    console.log(`✅ Subscription lifecycle cron job completed. Expired ${expiredCount} subscriptions`);
    
    return NextResponse.json({
      success: true,
      message: 'Subscription lifecycle check completed',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in subscription lifecycle cron job:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

// Also support POST for webhook-style calls
export async function POST(request: NextRequest) {
  return GET(request);
}

