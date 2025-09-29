/**
 * Trial Validation Utilities
 * 
 * Provides utilities for validating trial periods and enforcing access control
 * for trial users in the Dreamer app.
 */

export interface TrialStatus {
  is_trial: boolean;
  is_active: boolean;
  trial_expires_at: string | null;
  days_remaining: number | null;
  has_expired: boolean;
}

/**
 * Check if a user's subscription is a trial and get trial status
 */
export function getTrialStatus(
  subscription: {
    is_trial: boolean;
    is_active: boolean;
    current_period_end: string;
  }
): TrialStatus {
  const now = new Date();
  const trialExpiresAt = new Date(subscription.current_period_end);
  
  const isTrial = subscription.is_trial;
  const hasExpired = isTrial && now > trialExpiresAt;
  const daysRemaining = isTrial ? Math.ceil((trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  
  return {
    is_trial: isTrial,
    is_active: subscription.is_active && !hasExpired,
    trial_expires_at: isTrial ? subscription.current_period_end : null,
    days_remaining: daysRemaining && daysRemaining > 0 ? daysRemaining : 0,
    has_expired: hasExpired
  };
}

/**
 * Check if a trial user should have access to the app
 * Returns true if user has valid access (either paid subscription or active trial)
 */
export function hasValidAccess(subscription: {
  is_trial: boolean;
  is_active: boolean;
  current_period_end: string;
}): boolean {
  const trialStatus = getTrialStatus(subscription);
  
  // Non-trial users: check if subscription is active
  if (!trialStatus.is_trial) {
    return subscription.is_active;
  }
  
  // Trial users: check if trial is active and not expired
  return trialStatus.is_active && !trialStatus.has_expired;
}

/**
 * Get trial expiration warning status
 * Returns warning info if trial is expiring soon
 */
export function getTrialWarning(trialStatus: TrialStatus): {
  should_warn: boolean;
  warning_type: 'expired' | 'expiring_soon' | 'expiring_today' | null;
  days_remaining: number;
} {
  if (!trialStatus.is_trial) {
    return { should_warn: false, warning_type: null, days_remaining: 0 };
  }
  
  if (trialStatus.has_expired) {
    return { should_warn: true, warning_type: 'expired', days_remaining: 0 };
  }
  
  const daysRemaining = trialStatus.days_remaining || 0;
  
  if (daysRemaining === 0) {
    return { should_warn: true, warning_type: 'expiring_today', days_remaining: 0 };
  }
  
  if (daysRemaining <= 1) {
    return { should_warn: true, warning_type: 'expiring_soon', days_remaining: daysRemaining };
  }
  
  return { should_warn: false, warning_type: null, days_remaining: daysRemaining };
}

/**
 * Validate trial period from RevenueCat data
 * Enhanced trial detection logic
 */
export function validateTrialFromRevenueCat(eventData: {
  is_trial_period: boolean;
  offer_discount_type?: string;
  offer_period?: string;
  price: number;
  product_id: string;
  purchased_at_ms: number;
  expiration_at_ms: number;
}): {
  is_trial: boolean;
  trial_duration_days: number;
  correct_expiration: Date;
} {
  let isTrial = eventData.is_trial_period;
  let trialDurationDays = 0;
  
  // Enhanced trial detection
  if (!isTrial && eventData.offer_discount_type === 'FREE_TRIAL') {
    isTrial = true;
  }
  
  if (!isTrial && eventData.offer_period === 'P3D') {
    isTrial = true;
    trialDurationDays = 3;
  } else if (!isTrial && eventData.offer_period === 'P7D') {
    isTrial = true;
    trialDurationDays = 7;
  }
  
  if (!isTrial && eventData.price === 0) {
    isTrial = true;
    trialDurationDays = 3; // Default to 3 days for zero-price trials
  }
  
  // Check if product ID suggests a trial
  if (!isTrial && eventData.product_id.toLowerCase().includes('trial')) {
    isTrial = true;
    trialDurationDays = 3;
  }
  
  // Calculate correct expiration date
  const purchaseDate = new Date(eventData.purchased_at_ms);
  const correctExpiration = new Date(purchaseDate);
  
  if (isTrial && trialDurationDays > 0) {
    correctExpiration.setDate(purchaseDate.getDate() + trialDurationDays);
  } else if (isTrial) {
    // Default to 3 days if we can't determine duration
    correctExpiration.setDate(purchaseDate.getDate() + 3);
    trialDurationDays = 3;
  } else {
    // Use the original expiration date for non-trials
    correctExpiration.setTime(eventData.expiration_at_ms);
  }
  
  return {
    is_trial: isTrial,
    trial_duration_days: trialDurationDays,
    correct_expiration: correctExpiration
  };
}

