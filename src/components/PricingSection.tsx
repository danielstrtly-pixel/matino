"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PricingSectionProps {
  isLoggedIn: boolean;
  prices: {
    monthly?: { id: string; unit_amount: number };
    yearly?: { id: string; unit_amount: number };
  };
}

export function PricingSection({ isLoggedIn, prices }: PricingSectionProps) {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

  const handleCheckout = async (priceId: string, plan: 'monthly' | 'yearly') => {
    setLoading(plan);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  };

  // Fallback prices if not loaded from Stripe yet
  const monthlyAmount = prices.monthly?.unit_amount ? prices.monthly.unit_amount / 100 : 69;
  const yearlyAmount = prices.yearly?.unit_amount ? prices.yearly.unit_amount / 100 : 499;
  const yearlyMonthlyEquivalent = monthlyAmount * 12;
  const savings = yearlyMonthlyEquivalent - yearlyAmount;
  const savingsPercent = Math.round((savings / yearlyMonthlyEquivalent) * 100);

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-charcoal mb-4">
          Enkel prissättning
        </h2>
        <p className="text-charcoal/60 mb-10">
          Välj det alternativ som passar dig bäst
        </p>
        
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
          {/* Månadsabonnemang */}
          <Card className="bg-cream-light border-0 rounded-3xl p-6 md:p-8">
            <CardContent className="p-0">
              <div className="text-charcoal/60 font-medium mb-2">Månadsvis</div>
              <div className="text-4xl md:text-5xl font-bold text-charcoal mb-1">{monthlyAmount} kr</div>
              <div className="text-charcoal/60 mb-6">per månad</div>
              <ul className="text-left space-y-3 mb-8 text-sm">
                {[
                  "Veckomenyer med recept",
                  "Erbjudanden från 4 butikskedjor",
                  "Smart inköpslista",
                  "Byt ut rätter du inte gillar",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-charcoal/80">
                    <span className="text-fresh">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              {!isLoggedIn ? (
                <Button asChild variant="outline" size="lg" className="w-full rounded-full py-5 border-charcoal/20 hover:bg-cream-dark">
                  <Link href="/signup">Prova gratis i 7 dagar</Link>
                </Button>
              ) : prices.monthly?.id ? (
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full rounded-full py-5 border-charcoal/20 hover:bg-cream-dark"
                  onClick={() => handleCheckout(prices.monthly!.id, 'monthly')}
                  disabled={loading === 'monthly'}
                >
                  {loading === 'monthly' ? 'Laddar...' : 'Välj månadsabo'}
                </Button>
              ) : (
                <Button variant="outline" size="lg" className="w-full rounded-full py-5 border-charcoal/20" disabled>
                  Kommer snart
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Årsabonnemang - Populärast */}
          <Card className="bg-fresh text-white border-0 rounded-3xl p-6 md:p-8 relative overflow-hidden">
            <CardContent className="p-0">
              <div className="absolute top-4 right-4 bg-orange text-white text-xs font-bold px-3 py-1 rounded-full">
                SPARA {savingsPercent}%
              </div>
              <div className="text-white/80 font-medium mb-2">Årsvis</div>
              <div className="text-4xl md:text-5xl font-bold mb-1">{yearlyAmount} kr</div>
              <div className="text-white/70 mb-2">per år</div>
              <div className="text-sm text-white/60 mb-6">
                <span className="line-through">{yearlyMonthlyEquivalent} kr</span> · Du sparar {savings} kr
              </div>
              <ul className="text-left space-y-3 mb-8 text-sm">
                {[
                  "Allt i månadsabonnemanget",
                  `Betala för ${Math.round(yearlyAmount / monthlyAmount)} månader – få 12`,
                  "Lås priset i 12 månader",
                  "Prioriterad support",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/90">
                    <span className="text-orange">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              {!isLoggedIn ? (
                <Button asChild size="lg" className="w-full bg-orange hover:bg-[#D55A25] text-white rounded-full py-5 text-lg shadow-lg">
                  <Link href="/signup">Prova gratis i 7 dagar</Link>
                </Button>
              ) : prices.yearly?.id ? (
                <Button 
                  size="lg" 
                  className="w-full bg-orange hover:bg-[#D55A25] text-white rounded-full py-5 text-lg shadow-lg"
                  onClick={() => handleCheckout(prices.yearly!.id, 'yearly')}
                  disabled={loading === 'yearly'}
                >
                  {loading === 'yearly' ? 'Laddar...' : 'Välj årsabo'}
                </Button>
              ) : (
                <Button size="lg" className="w-full bg-orange/50 text-white rounded-full py-5 text-lg" disabled>
                  Kommer snart
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
        
        <p className="text-sm text-charcoal/50 mt-8">
          Inget betalkort krävs för provperioden · Avsluta när du vill
        </p>
      </div>
    </section>
  );
}
