import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrCreateCustomer, createCheckoutSession } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
    }

    // Get current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(
      user.id,
      user.email!,
      supabaseAdmin
    );

    // Create checkout session
    const origin = request.headers.get('origin') || 'https://smartamenyn.se';
    const session = await createCheckoutSession(
      customerId,
      priceId,
      user.id,
      `${origin}/dashboard?checkout=success`,
      `${origin}/dashboard?checkout=canceled`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
