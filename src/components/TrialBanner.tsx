"use client";

import Link from 'next/link';

interface TrialBannerProps {
  daysLeft: number;
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  if (daysLeft <= 0) return null;

  const urgency = daysLeft <= 2;

  return (
    <div className={`w-full py-2.5 px-4 text-center text-sm font-medium ${
      urgency 
        ? 'bg-orange-100 text-orange-800' 
        : 'bg-blue-50 text-blue-800'
    }`}>
      {urgency ? '⏰' : '✨'}{' '}
      Gratis provperiod – <strong>{daysLeft} {daysLeft === 1 ? 'dag' : 'dagar'} kvar</strong>.{' '}
      <Link href="/#pricing" className="underline hover:no-underline font-bold">
        Välj abonnemang
      </Link>{' '}
      för att fortsätta efter provperioden.
    </div>
  );
}
