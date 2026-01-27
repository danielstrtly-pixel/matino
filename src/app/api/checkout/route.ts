import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
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
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('Creating checkout for user:', user.id, user.email);

    // Get or create Stripe customer
    const supabaseAdmin = getSupabaseAdmin();
    const customerId = await getOrCreateCustomer(
      user.id,
      user.email!,
      supabaseAdmin
    );

    console.log('Stripe customer ID:', customerId);

    // Create checkout session
    const origin = request.headers.get('origin') || 'https://smartamenyn.se';
    const session = await createCheckoutSession(
      customerId,
      priceId,
      user.id,
      `${origin}/dashboard?checkout=success`,
      `${origin}/dashboard?checkout=canceled`
    );

    console.log('Checkout session created:', session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: errorMessage },
      { status: 500 }
    );
  }
}
