"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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

export function SubscriptionCard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_user_subscription', {
        p_user_id: user.id,
      });

      if (!error && data && data.length > 0) {
        setSubscription(data[0]);
      }
      
      setLoading(false);
    }

    fetchSubscription();
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/portal', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Kunde inte öppna kundportalen. Försök igen.');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Något gick fel. Försök igen.');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💳 Prenumeration</CardTitle>
          <CardDescription>Hantera din betalning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-gray-100 h-24 rounded-lg"></div>
        </CardContent>
      </Card>
    );
  }

  // No subscription - show upgrade prompt
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💳 Prenumeration</CardTitle>
          <CardDescription>Hantera din betalning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-orange-50 rounded-lg mb-4">
            <p className="font-medium text-orange-800">Ingen aktiv prenumeration</p>
            <p className="text-sm text-orange-600 mt-1">
              Välj en plan för att få tillgång till alla funktioner.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/#pricing">Välj abonnemang</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate subscription info
  const periodEnd = new Date(subscription.current_period_end);
  
  const isYearly = subscription.interval === 'year';
  const planName = isYearly ? 'Årsabonnemang' : 'Månadsabonnemang';
  const priceFormatted = subscription.unit_amount 
    ? `${subscription.unit_amount / 100} kr/${isYearly ? 'år' : 'mån'}`
    : '';

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  const statusLabel = isActive ? 'Aktiv' : ({
    canceled: 'Avslutad',
    past_due: 'Förfallen betalning',
    unpaid: 'Obetald',
  }[subscription.status] || subscription.status);

  const statusColor = isActive
    ? 'bg-green-100 text-green-800'
    : ({
      canceled: 'bg-gray-100 text-gray-800',
      past_due: 'bg-red-100 text-red-800',
      unpaid: 'bg-red-100 text-red-800',
    }[subscription.status] || 'bg-gray-100 text-gray-800');

  return (
    <Card>
      <CardHeader>
        <CardTitle>💳 Prenumeration</CardTitle>
        <CardDescription>Hantera din betalning</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 rounded-lg mb-4 bg-green-50">
          <div>
            <p className="font-medium">{planName}</p>
            <p className="text-sm text-gray-500">
              {subscription.cancel_at_period_end 
                ? `Avslutas ${periodEnd.toLocaleDateString('sv-SE')}`
                : `Förnyas ${periodEnd.toLocaleDateString('sv-SE')}`
              }
            </p>
          </div>
          <Badge className={statusColor}>{statusLabel}</Badge>
        </div>
        
        {priceFormatted && (
          <p className="text-sm text-gray-500 mb-4">
            {priceFormatted} · Avsluta när du vill.
          </p>
        )}

        <Button 
          variant="outline" 
          onClick={openPortal}
          disabled={portalLoading}
          className="w-full"
        >
          {portalLoading ? 'Öppnar...' : 'Hantera prenumeration'}
        </Button>
      </CardContent>
    </Card>
  );
}
