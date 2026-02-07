import 'dotenv/config';
import express from 'express';
import { Client } from 'pg';
import { createScraper, getSupportedChains } from './scrapers';
import type { ChainId, Store, Offer } from './types';
import { CHAIN_CONFIGS } from './types';

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;
const DB_URL = process.env.DATABASE_URL;
const SYNC_API_KEY = process.env.SYNC_API_KEY;

console.log(SUPABASE_URL, DB_URL, SYNC_API_KEY);

if (!SUPABASE_URL || !DB_URL || !SYNC_API_KEY) {
  console.error('❌ Required environment variables: SUPABASE_URL, DATABASE_URL, SYNC_API_KEY');
  process.exit(1);
}

/**
 * Authenticate sync request.
 * Accepts either:
 * - Supabase JWT (Bearer token) → verifies with Supabase, returns user_id
 * - API key (X-API-Key header) + user_id in body → server-to-server calls
 */
async function authenticateSync(req: express.Request): Promise<{ userId: string } | null> {
  // Option 1: API key + user_id (server-to-server)
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey === SYNC_API_KEY && req.body?.userId) {
    return { userId: req.body.userId };
  }

  // Option 2: Supabase JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: token },
    });
    if (!res.ok) return null;
    const user = await res.json() as any;
    return user?.id ? { userId: user.id } : null;
  } catch {
    return null;
  }
}

/**
 * Insert offers into DB for a store (delete old first)
 */
async function syncOffersToDb(client: Client, storeId: string, offers: Offer[]): Promise<number> {
  await client.query('DELETE FROM offers WHERE store_id = $1', [storeId]);

  for (const o of offers) {
    await client.query(`
      INSERT INTO offers (
        id, store_id, chain_id, name, brand, offer_price,
        quantity, quantity_price, original_price, unit,
        image_url, offer_url, category, requires_membership, scraped_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        offer_price = EXCLUDED.offer_price,
        image_url = EXCLUDED.image_url,
        offer_url = EXCLUDED.offer_url,
        scraped_at = EXCLUDED.scraped_at
    `, [
      o.id, o.storeId, o.chain, o.name, o.brand || null, o.offerPrice,
      o.quantity || null, o.quantityPrice || null, o.originalPrice || null, o.unit || null,
      o.imageUrl || null, o.offerUrl || null, o.category || null,
      o.requiresMembership || false, o.scrapedAt,
    ]);
  }

  return offers.length;
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supportedChains: getSupportedChains(),
  });
});

// List supported chains
app.get('/chains', (req, res) => {
  const chains = getSupportedChains().map(id => CHAIN_CONFIGS[id]);
  res.json({ chains });
});

// Search stores for a chain
app.get('/chains/:chain/stores', async (req, res) => {
  const chain = req.params.chain as ChainId;
  const query = req.query.q as string || '';

  if (!getSupportedChains().includes(chain)) {
    return res.status(400).json({ error: `Chain ${chain} not supported` });
  }

  const scraper = createScraper(chain);

  try {
    await scraper.init();
    const result = await scraper.searchStores(query);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await scraper.close();
  }
});

// Get offers for a specific store
app.post('/chains/:chain/offers', async (req, res) => {
  const chain = req.params.chain as ChainId;
  const store = req.body as Store;

  if (!getSupportedChains().includes(chain)) {
    return res.status(400).json({ error: `Chain ${chain} not supported` });
  }

  if (!store || !store.externalId) {
    return res.status(400).json({ error: 'Store with externalId required in body' });
  }

  const scraper = createScraper(chain);

  try {
    await scraper.init();
    const result = await scraper.getOffers(store);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await scraper.close();
  }
});

// Validate scrapers
app.get('/validate', async (req, res) => {
  const results = [];

  for (const chain of getSupportedChains()) {
    const scraper = createScraper(chain);
    try {
      await scraper.init();
      const result = await scraper.validate();
      results.push(result);
    } catch (error) {
      results.push({
        valid: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        chain,
        timestamp: new Date(),
      });
    } finally {
      await scraper.close();
    }
  }

  const allValid = results.every(r => r.valid);
  res.status(allValid ? 200 : 500).json({
    valid: allValid,
    results,
  });
});

// Validate specific chain
app.get('/validate/:chain', async (req, res) => {
  const chain = req.params.chain as ChainId;

  if (!getSupportedChains().includes(chain)) {
    return res.status(400).json({ error: `Chain ${chain} not supported` });
  }

  const scraper = createScraper(chain);

  try {
    await scraper.init();
    const result = await scraper.validate();
    res.status(result.valid ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      valid: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      chain,
      timestamp: new Date(),
    });
  } finally {
    await scraper.close();
  }
});

// Sync offers for a user's stores (requires Supabase auth)
app.post('/api/sync', async (req, res) => {
  // Verify user
  const auth = await authenticateSync(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { userId } = auth;

  console.log(`[Sync] User ${userId} requested sync`);

  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    // Get user's stores with last_synced_at
    const { rows: stores } = await client.query(`
      SELECT DISTINCT s.id, s.name, s.chain_id, s.external_id, s.offers_url, s.last_synced_at
      FROM stores s
      INNER JOIN user_stores us ON us.store_id = s.id
      WHERE us.user_id = $1
      ORDER BY s.chain_id, s.name
    `, [userId]);

    if (stores.length === 0) {
      await client.end();
      return res.json({ success: true, message: 'No stores selected', stores: 0, offers: 0, results: [] });
    }

    console.log(`[Sync] Checking ${stores.length} stores for user ${userId}`);

    const results: Array<{ store: string; chain: string; offers: number; skipped?: boolean; error?: string }> = [];
    let totalOffers = 0;
    let synced = 0;
    let skipped = 0;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const store of stores) {
      // Skip if already synced today (has offers from today)
      if (store.last_synced_at) {
        const lastSync = new Date(store.last_synced_at);
        if (lastSync >= today) {
          // Also check that offers actually exist for this store
          const { rows: [{ count }] } = await client.query(
            'SELECT COUNT(*)::int as count FROM offers WHERE store_id = $1',
            [store.id]
          );
          if (count > 0) {
            console.log(`[Sync] ${store.name}: already synced today (${count} offers), skipping`);
            results.push({ store: store.name, chain: store.chain_id, offers: count, skipped: true });
            totalOffers += count;
            skipped++;
            continue;
          }
        }
      }

      // Needs sync — scrape this store
      const scraper = createScraper(store.chain_id as ChainId);
      try {
        await scraper.init();
        const result = await scraper.getOffers({
          id: store.id,
          name: store.name,
          chain: store.chain_id as ChainId,
          externalId: store.external_id,
          offersUrl: store.offers_url,
        });

        if (result.success && result.data) {
          const count = await syncOffersToDb(client, store.id, result.data.offers);
          totalOffers += count;
          results.push({ store: store.name, chain: store.chain_id, offers: count });
          console.log(`[Sync] ${store.name}: ${count} offers`);
          synced++;
        } else {
          results.push({ store: store.name, chain: store.chain_id, offers: 0, error: result.error });
          console.log(`[Sync] ${store.name}: error - ${result.error}`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.push({ store: store.name, chain: store.chain_id, offers: 0, error: msg });
        console.error(`[Sync] ${store.name}: ${msg}`);
      } finally {
        await scraper.close();
      }
    }

    // Update last_synced_at for stores that were actually synced
    const syncedStoreIds = stores
      .filter(s => results.find(r => r.store === s.name && !r.skipped && !r.error))
      .map(s => s.id);
    if (syncedStoreIds.length > 0) {
      await client.query(
        'UPDATE stores SET last_synced_at = NOW() WHERE id = ANY($1)',
        [syncedStoreIds]
      );
    }

    await client.end();

    console.log(`[Sync] Done: ${synced} synced, ${skipped} skipped, ${totalOffers} total offers`);

    res.json({
      success: true,
      userId,
      stores: stores.length,
      synced,
      skipped,
      offers: totalOffers,
      results,
    });
  } catch (error) {
    await client.end().catch(() => { });
    console.error(`[Sync] Error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SmartaMenyn Scraper API running on port ${PORT}`);
  console.log(`   Supported chains: ${getSupportedChains().join(', ')}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
