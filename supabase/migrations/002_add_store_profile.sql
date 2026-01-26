-- Migration: Add profile and offers_url to stores table
-- For ICA store types (Maxi, Kvantum, Supermarket, Nära)

ALTER TABLE stores ADD COLUMN IF NOT EXISTS profile TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS offers_url TEXT;

-- Index for profile searches
CREATE INDEX IF NOT EXISTS idx_stores_profile ON stores(profile);
CREATE INDEX IF NOT EXISTS idx_stores_chain_city ON stores(chain_id, city);
