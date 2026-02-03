-- Migration: Add offer_url to get_user_offers function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_user_offers(p_user_id UUID)
RETURNS TABLE (
  offer_id TEXT,
  store_id TEXT,
  store_name TEXT,
  chain_id TEXT,
  chain_name TEXT,
  chain_logo TEXT,
  name TEXT,
  brand TEXT,
  offer_price DECIMAL,
  original_price DECIMAL,
  quantity INTEGER,
  quantity_price DECIMAL,
  unit TEXT,
  image_url TEXT,
  offer_url TEXT,
  requires_membership BOOLEAN,
  scraped_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as offer_id,
    o.store_id,
    s.name as store_name,
    o.chain_id,
    c.name as chain_name,
    c.logo as chain_logo,
    o.name,
    o.brand,
    o.offer_price,
    o.original_price,
    o.quantity,
    o.quantity_price,
    o.unit,
    o.image_url,
    o.offer_url,
    o.requires_membership,
    o.scraped_at
  FROM offers o
  JOIN stores s ON o.store_id = s.id
  JOIN chains c ON o.chain_id = c.id
  JOIN user_stores us ON us.store_id = o.store_id
  WHERE us.user_id = p_user_id
  ORDER BY o.scraped_at DESC, o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
