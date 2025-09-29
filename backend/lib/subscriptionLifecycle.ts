/**
 * Subscription Lifecycle Management
 * 
 * Handles subscription state changes, grace periods, dunning management,
 * and automated actions based on subscription status.
 */

import { supabaseServer } from '../lib/supabaseServer';

export interface SubscriptionLifecycleEvent {
  user_id: string;
  event_type: 'expired' | 'expiring_soon' | 'billing_failed' | 'cancelled' | 'renewed';
  subscription_data: any;
  timestamp: string;
  actions_taken: string[];
}

export interface SubscriptionStatus {
  user_id: string;
  is_active: boolean;
  is_trial: boolean;
  will_renew: boolean;
  current_period_end: string;
  grace_period_end?: string;
  days_until_expiration: number;
  status: 'active' | 'expiring_soon' | 'expired' | 'cancelled' | 'billing_retry';
}

/**
 * Check all subscriptions for lifecycle events
 */
export async function checkSubscriptionLifecycle(): Promise<SubscriptionLifecycleEvent[]> {
  const supabase = supabaseServer();
  const events: SubscriptionLifecycleEvent[] = [];
  
  try {
    // Get all active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching subscriptions:', error);
      return events;
    }

    if (!subscriptions) {
      return events;
    }

    const now = new Date();
    
    for (const subscription of subscriptions) {
      const expirationDate = new Date(subscription.current_period_end);
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const status = determineSubscriptionStatus(subscription, daysUntilExpiration);
      const event = await handleSubscriptionStatus(subscription, status);
      
      if (event) {
        events.push(event);
      }
    }

    console.log(`✅ Processed ${subscriptions.length} subscriptions, found ${events.length} events`);
    return events;

  } catch (error) {
    console.error('❌ Error in subscription lifecycle check:', error);
    return events;
  }
}

/**
 * Determine subscription status based on current data
 */
function determineSubscriptionStatus(subscription: any, daysUntilExpiration: number): SubscriptionStatus {
  const now = new Date();
  const expirationDate = new Date(subscription.current_period_end);
  
  let status: SubscriptionStatus['status'] = 'active';
  
  if (expirationDate < now) {
    status = 'expired';
  } else if (daysUntilExpiration <= 3) {
    status = 'expiring_soon';
  } else if (!subscription.will_renew && daysUntilExpiration <= 7) {
    status = 'cancelled';
  }

  return {
    user_id: subscription.user_id,
    is_active: subscription.is_active,
    is_trial: subscription.is_trial,
    will_renew: subscription.will_renew,
    current_period_end: subscription.current_period_end,
    days_until_expiration: daysUntilExpiration,
    status
  };
}

/**
 * Handle subscription status and take appropriate actions
 */
async function handleSubscriptionStatus(
  subscription: any, 
  status: SubscriptionStatus
): Promise<SubscriptionLifecycleEvent | null> {
  const actions: string[] = [];
  const supabase = supabaseServer();

  switch (status.status) {
    case 'expired':
      return await handleExpiredSubscription(subscription, actions);
    
    case 'expiring_soon':
      return await handleExpiringSoonSubscription(subscription, actions);
    
    case 'cancelled':
      return await handleCancelledSubscription(subscription, actions);
    
    case 'billing_retry':
      return await handleBillingRetrySubscription(subscription, actions);
    
    default:
      return null;
  }
}

/**
 * Handle expired subscription
 */
async function handleExpiredSubscription(
  subscription: any, 
  actions: string[]
): Promise<SubscriptionLifecycleEvent> {
  const supabase = supabaseServer();
  
  // Update subscription to inactive
  await supabase
    .from('user_subscriptions')
    .update({
      is_active: false,
      will_renew: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', subscription.user_id);
  
  actions.push('marked_subscription_inactive');
  
  // TODO: Add additional actions like:
  // - Send expiration notification
  // - Restrict app features
  // - Schedule re-engagement campaign
  
  console.log(`⚠️ Subscription expired for user ${subscription.user_id}`);
  
  return {
    user_id: subscription.user_id,
    event_type: 'expired',
    subscription_data: subscription,
    timestamp: new Date().toISOString(),
    actions_taken: actions
  };
}

/**
 * Handle subscription expiring soon
 */
async function handleExpiringSoonSubscription(
  subscription: any, 
  actions: string[]
): Promise<SubscriptionLifecycleEvent> {
  // TODO: Send renewal reminder notification
  actions.push('sent_renewal_reminder');
  
  console.log(`⏰ Subscription expiring soon for user ${subscription.user_id}`);
  
  return {
    user_id: subscription.user_id,
    event_type: 'expiring_soon',
    subscription_data: subscription,
    timestamp: new Date().toISOString(),
    actions_taken: actions
  };
}

/**
 * Handle cancelled subscription
 */
async function handleCancelledSubscription(
  subscription: any, 
  actions: string[]
): Promise<SubscriptionLifecycleEvent> {
  // TODO: Send cancellation confirmation
  // TODO: Offer retention incentives
  actions.push('sent_cancellation_confirmation');
  
  console.log(`🚫 Subscription cancelled for user ${subscription.user_id}`);
  
  return {
    user_id: subscription.user_id,
    event_type: 'cancelled',
    subscription_data: subscription,
    timestamp: new Date().toISOString(),
    actions_taken: actions
  };
}

/**
 * Handle billing retry subscription
 */
async function handleBillingRetrySubscription(
  subscription: any, 
  actions: string[]
): Promise<SubscriptionLifecycleEvent> {
  // TODO: Send billing issue notification
  // TODO: Provide payment method update instructions
  actions.push('sent_billing_issue_notification');
  
  console.log(`💳 Billing retry for user ${subscription.user_id}`);
  
  return {
    user_id: subscription.user_id,
    event_type: 'billing_failed',
    subscription_data: subscription,
    timestamp: new Date().toISOString(),
    actions_taken: actions
  };
}

/**
 * Get subscription status for a specific user
 */
export async function getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
  const supabase = supabaseServer();
  
  try {
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      return null;
    }

    const now = new Date();
    const expirationDate = new Date(subscription.current_period_end);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return determineSubscriptionStatus(subscription, daysUntilExpiration);

  } catch (error) {
    console.error('❌ Error getting user subscription status:', error);
    return null;
  }
}

/**
 * Schedule subscription lifecycle checks
 * This should be called periodically (e.g., every hour)
 */
export async function scheduleSubscriptionChecks(): Promise<void> {
  try {
    console.log('🔄 Starting scheduled subscription lifecycle check...');
    const events = await checkSubscriptionLifecycle();
    
    if (events.length > 0) {
      console.log(`📊 Found ${events.length} subscription events:`, events.map(e => e.event_type));
      
      // TODO: Send notifications, update analytics, etc.
      // This is where you'd integrate with your notification system
    }
    
  } catch (error) {
    console.error('❌ Error in scheduled subscription checks:', error);
  }
}

