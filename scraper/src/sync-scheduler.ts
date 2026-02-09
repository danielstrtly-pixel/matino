import cron from 'node-cron';
import { Client } from 'pg';
import { createScraper } from './scrapers';
import type { ChainId, Store, Offer } from './types';

const DB_URL = process.env.DATABASE_URL;

interface SyncStoreResult {
  store: string;
  chain: string;
  offers: number;
  error?: string;
}

/**
 * Sync a single store's offers using a transactional swap.
 * Old offers are only deleted inside the same transaction that inserts new ones.
 * If scraping fails, old offers are preserved.
 */
async function syncStore(client: Client, store: { id: string; name: string; chain_id: string; external_id: string; offers_url?: string }): Promise<SyncStoreResult> {
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

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Scraping returned no data');
    }

    const offers = result.data.offers;

    // Transactional swap: DELETE old + INSERT new in one transaction
    await client.query('BEGIN');
    try {
      await client.query('DELETE FROM offers WHERE store_id = $1', [store.id]);

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

      await client.query('UPDATE stores SET last_synced_at = NOW() WHERE id = $1', [store.id]);
      await client.query('COMMIT');

      return { store: store.name, chain: store.chain_id, offers: offers.length };
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    }
  } finally {
    await scraper.close();
  }
}

/**
 * Run a full sync of all stores that have active users.
 * Each store is synced independently — a failure in one store
 * does not affect others, and old offers are preserved on failure.
 */
export async function runFullSync(): Promise<{ synced: number; failed: number; totalOffers: number; results: SyncStoreResult[] }> {
  if (!DB_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const startTime = Date.now();
  console.log(`[Sync] Starting full sync at ${new Date().toISOString()}`);

  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // Get unique stores from user_stores
    const { rows: stores } = await client.query(`
      SELECT DISTINCT s.id, s.name, s.chain_id, s.external_id, s.offers_url
      FROM stores s
      INNER JOIN user_stores us ON us.store_id = s.id
      ORDER BY s.chain_id, s.name
    `);

    if (stores.length === 0) {
      console.log('[Sync] No stores with active users. Nothing to sync.');
      return { synced: 0, failed: 0, totalOffers: 0, results: [] };
    }

    console.log(`[Sync] ${stores.length} stores to sync`);

    const results: SyncStoreResult[] = [];
    let synced = 0;
    let failed = 0;
    let totalOffers = 0;

    for (const store of stores) {
      try {
        const result = await syncStore(client, store);
        results.push(result);
        totalOffers += result.offers;
        synced++;
        console.log(`[Sync] ${store.name} (${store.chain_id}): ${result.offers} offers`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.push({ store: store.name, chain: store.chain_id, offers: 0, error: msg });
        failed++;
        console.error(`[Sync] ${store.name} (${store.chain_id}): FAILED - ${msg}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Sync] Done in ${duration}s — ${synced} synced, ${failed} failed, ${totalOffers} total offers`);

    return { synced, failed, totalOffers, results };
  } finally {
    await client.end();
  }
}

/**
 * Schedule daily sync at 03:00 Stockholm time.
 */
export function scheduleDailySync(): void {
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Triggered daily sync');
    try {
      await runFullSync();
    } catch (error) {
      console.error('[Cron] Full sync failed:', error instanceof Error ? error.message : error);
    }
  }, {
    timezone: 'Europe/Stockholm',
  });

  console.log('[Cron] Scheduled daily sync at 03:00 Europe/Stockholm');
}
