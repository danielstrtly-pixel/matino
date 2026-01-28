"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PaywallGate() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <Card className="bg-cream-light border-0 rounded-3xl overflow-hidden">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-3">
            Provperioden är slut
          </h2>
          <p className="text-charcoal/70 mb-6 leading-relaxed">
            Din gratis provperiod har gått ut. Välj ett abonnemang för att 
            fortsätta använda veckomenyer, recept och inköpslistor.
          </p>
          
          <div className="space-y-3 text-left mb-8">
            {[
              "Veckomenyer med recept varje vecka",
              "Smart inköpslista sorterad per butik",
              "Baserat på veckans bästa erbjudanden",
              "Byt ut rätter du inte gillar",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-charcoal/80">
                <span className="text-fresh">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Button asChild size="lg" className="w-full bg-orange hover:bg-[#D55A25] text-white rounded-full py-6 text-lg shadow-lg">
              <Link href="/#pricing">Välj abonnemang – från 42 kr/mån</Link>
            </Button>
            <p className="text-xs text-charcoal/40">
              499 kr/år (spara 40%) eller 69 kr/mån
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-charcoal/10">
            <p className="text-sm text-charcoal/50">
              Du kan fortfarande se{' '}
              <Link href="/dashboard/deals" className="text-fresh underline">
                veckans erbjudanden
              </Link>{' '}
              och{' '}
              <Link href="/dashboard/settings" className="text-fresh underline">
                hantera inställningar
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
