-- Stripe Integration Tables
-- Based on Vercel's nextjs-subscription-payments template

-- Customers table: Links auth.users to Stripe customer IDs
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table: Synced from Stripe via webhooks
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, -- Stripe product ID (prod_xxx)
  active BOOLEAN DEFAULT true,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prices table: Synced from Stripe via webhooks
CREATE TABLE IF NOT EXISTS prices (
  id TEXT PRIMARY KEY, -- Stripe price ID (price_xxx)
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  description TEXT,
  unit_amount INTEGER, -- Price in smallest currency unit (öre for SEK)
  currency TEXT DEFAULT 'sek',
  type TEXT CHECK (type IN ('one_time', 'recurring')),
  "interval" TEXT CHECK ("interval" IN ('day', 'week', 'month', 'year')),
  interval_count INTEGER DEFAULT 1,
  trial_period_days INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table: Synced from Stripe via webhooks
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, -- Stripe subscription ID (sub_xxx)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN (
    'trialing', 'active', 'canceled', 'incomplete', 
    'incomplete_expired', 'past_due', 'unpaid', 'paused'
  )),
  price_id TEXT REFERENCES prices(id),
  quantity INTEGER DEFAULT 1,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_stripe_id ON customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices(product_id);

-- Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own data
CREATE POLICY "Users can view own customer data"
  ON customers FOR SELECT
  USING (auth.uid() = id);

-- Products and prices are public (needed for pricing page)
CREATE POLICY "Anyone can read products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read prices"
  ON prices FOR SELECT
  USING (true);

-- Subscriptions: users can only see their own
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current subscription
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id TEXT,
  status TEXT,
  price_id TEXT,
  product_name TEXT,
  unit_amount INTEGER,
  "interval" TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    s.status,
    s.price_id,
    p.name as product_name,
    pr.unit_amount,
    pr."interval",
    s.current_period_end,
    s.cancel_at_period_end
  FROM subscriptions s
  JOIN prices pr ON s.price_id = pr.id
  JOIN products p ON pr.product_id = p.id
  WHERE s.user_id = p_user_id
  AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
