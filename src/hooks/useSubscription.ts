"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Subscription {
  subscription_id: string;
  status: string;
  price_id: string;
  product_name: string;
  unit_amount: number;
  interval: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Use the database function to get subscription
      const { data, error } = await supabase.rpc('get_user_subscription', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error fetching subscription:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setSubscription(data[0]);
        setIsActive(true);
      }
      
      setLoading(false);
    }

    fetchSubscription();
  }, []);

  const openPortal = async () => {
    const response = await fetch('/api/portal', { method: 'POST' });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  const checkout = async (priceId: string) => {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  return {
    subscription,
    loading,
    isActive,
    openPortal,
    checkout,
  };
}
