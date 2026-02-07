import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, relevantEvents } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs';

async function upsertProduct(product: Stripe.Product) {
  await supabaseAdmin.from('products').upsert({
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? null,
    image: product.images?.[0] ?? null,
    metadata: product.metadata,
    updated_at: new Date().toISOString(),
  });
}

async function deleteProduct(productId: string) {
  await supabaseAdmin.from('products').delete().eq('id', productId);
}

async function upsertPrice(price: Stripe.Price) {
  await supabaseAdmin.from('prices').upsert({
    id: price.id,
    product_id: typeof price.product === 'string' ? price.product : price.product.id,
    active: price.active,
    description: price.nickname ?? null,
    unit_amount: price.unit_amount ?? 0,
    currency: price.currency,
    type: price.type,
    interval: price.recurring?.interval ?? null,
    interval_count: price.recurring?.interval_count ?? null,
    trial_period_days: price.recurring?.trial_period_days ?? null,
    metadata: price.metadata,
    updated_at: new Date().toISOString(),
  });
}

async function deletePrice(priceId: string) {
  await supabaseAdmin.from('prices').delete().eq('id', priceId);
}

async function upsertSubscription(subscription: Stripe.Subscription, userId?: string) {
  // Try to get user ID from subscription metadata or customer
  let supabaseUserId = userId;
  
  if (!supabaseUserId) {
    supabaseUserId = subscription.metadata?.supabase_user_id;
  }
  
  if (!supabaseUserId) {
    // Look up customer to get user ID
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single();
    supabaseUserId = customer?.id;
  }

  if (!supabaseUserId) {
    console.error('Could not find user ID for subscription:', subscription.id);
    return;
  }

  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id;

  await supabaseAdmin.from('subscriptions').upsert({
    id: subscription.id,
    user_id: supabaseUserId,
    status: subscription.status,
    price_id: priceId,
    quantity: subscriptionItem?.quantity ?? 1,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    current_period_start: subscriptionItem?.current_period_start ? new Date(subscriptionItem.current_period_start * 1000).toISOString() : null,
    current_period_end: subscriptionItem?.current_period_end ? new Date(subscriptionItem.current_period_end * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
    metadata: subscription.metadata,
    updated_at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'product.created':
      case 'product.updated':
        await upsertProduct(event.data.object as Stripe.Product);
        break;
      case 'product.deleted':
        await deleteProduct((event.data.object as Stripe.Product).id);
        break;
      case 'price.created':
      case 'price.updated':
        await upsertPrice(event.data.object as Stripe.Price);
        break;
      case 'price.deleted':
        await deletePrice((event.data.object as Stripe.Price).id);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        // Mark as canceled instead of deleting (keep history)
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await upsertSubscription(subscription, session.metadata?.supabase_user_id);
        }
        break;
      }
      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
