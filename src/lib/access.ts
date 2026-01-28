import { createClient } from '@/lib/supabase/server';

const TRIAL_DAYS = 7;

export interface AccessStatus {
  hasAccess: boolean;
  reason: 'subscription' | 'trial' | 'expired';
  trialDaysLeft: number | null;
  isTrialing: boolean;
  isSubscribed: boolean;
  createdAt: string | null;
}

/**
 * Check if current user has access to premium features.
 * Access is granted if:
 * 1. User has active Stripe subscription (active/trialing), OR
 * 2. User's account was created within the last TRIAL_DAYS days
 */
export async function checkAccess(): Promise<AccessStatus> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      hasAccess: false,
      reason: 'expired',
      trialDaysLeft: null,
      isTrialing: false,
      isSubscribed: false,
      createdAt: null,
    };
  }

  // Check for active subscription
  const { data: subscription } = await supabase.rpc('has_active_subscription', {
    p_user_id: user.id,
  });

  if (subscription) {
    return {
      hasAccess: true,
      reason: 'subscription',
      trialDaysLeft: null,
      isTrialing: false,
      isSubscribed: true,
      createdAt: user.created_at,
    };
  }

  // Check trial period
  const createdAt = new Date(user.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - diffDays));

  if (daysLeft > 0) {
    return {
      hasAccess: true,
      reason: 'trial',
      trialDaysLeft: daysLeft,
      isTrialing: true,
      isSubscribed: false,
      createdAt: user.created_at,
    };
  }

  // Trial expired, no subscription
  return {
    hasAccess: false,
    reason: 'expired',
    trialDaysLeft: 0,
    isTrialing: false,
    isSubscribed: false,
    createdAt: user.created_at,
  };
}
