#!/usr/bin/env node
/**
 * Sync offers for all unique stores in user_stores.
 * 
 * 1. Get unique store_ids from user_stores
 * 2. TRUNCATE offers table (fresh start every sync)
 * 3. Scrape each store via the Docker scraper API
 * 4. Insert offers including offer_url
 * 
 * Runs daily at 05:00 Stockholm time via cron.
 */

const { Client } = require('pg');

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:3001';
const DB_URL = 'postgresql://postgres:LodsKzaNsEuu8m@db.gepkjyzqrjkuminphpxm.supabase.co:5432/postgres';

async function getStoresToSync(client) {
  const { rows } = await client.query(`
    SELECT DISTINCT s.id, s.name, s.chain_id, s.external_id, s.offers_url
    FROM stores s
    INNER JOIN user_stores us ON us.store_id = s.id
    ORDER BY s.chain_id, s.name
  `);
  return rows;
}

async function scrapeStore(store) {
  const res = await fetch(`${SCRAPER_URL}/chains/${store.chain_id}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: store.id,
      name: store.name,
      chain: store.chain_id,
      externalId: store.external_id,
      offersUrl: store.offers_url,
    }),
  });

  if (!res.ok) {
    throw new Error(`Scraper returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.offers || [];
}

async function insertOffers(client, offers) {
  for (const o of offers) {
    await client.query(`
      INSERT INTO offers (
        id, store_id, chain_id, name, brand, offer_price,
        quantity, quantity_price, original_price, unit,
        image_url, offer_url, category, requires_membership, scraped_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
    `, [
      o.id,
      o.storeId,
      o.chain,
      o.name,
      o.brand || null,
      o.offerPrice,
      o.quantity || null,
      o.quantityPrice || null,
      o.originalPrice || null,
      o.unit || null,
      o.imageUrl || null,
      o.offerUrl || null,
      o.category || null,
      o.requiresMembership || false,
      o.scrapedAt,
    ]);
  }
}

async function main() {
  const startTime = Date.now();
  
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('🚀 SmartaMenyn Offer Sync');
  console.log(`   Scraper: ${SCRAPER_URL}`);
  console.log(`   Time: ${new Date().toISOString()}\n`);

  // 1. Get stores to sync
  const stores = await getStoresToSync(client);
  console.log(`📋 ${stores.length} stores to sync:\n`);
  stores.forEach(s => console.log(`   ${s.chain_id}: ${s.name} (${s.id})`));
  console.log('');

  if (stores.length === 0) {
    console.log('⚠️  No stores in user_stores. Nothing to sync.');
    await client.end();
    return;
  }

  // 2. Clear all existing offers
  const { rowCount } = await client.query('DELETE FROM offers');
  console.log(`🗑️  Cleared ${rowCount} old offers\n`);

  // 3. Scrape and insert for each store
  let totalOffers = 0;
  let errors = 0;

  for (const store of stores) {
    console.log(`📍 ${store.name}...`);
    try {
      const offers = await scrapeStore(store);
      if (offers.length > 0) {
        await insertOffers(client, offers);
        totalOffers += offers.length;
        console.log(`   ✅ ${offers.length} offers`);
      } else {
        console.log(`   ⚠️  0 offers returned`);
      }
    } catch (error) {
      console.error(`   ❌ ${error.message}`);
      errors++;
    }
  }

  // 4. Update last_synced_at on stores
  const syncedIds = stores.map(s => s.id);
  await client.query(
    `UPDATE stores SET last_synced_at = NOW() WHERE id = ANY($1)`,
    [syncedIds]
  );

  await client.end();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(40)}`);
  console.log(`✅ Done in ${duration}s`);
  console.log(`   Offers: ${totalOffers}`);
  console.log(`   Stores: ${stores.length - errors}/${stores.length} OK`);
  if (errors > 0) console.log(`   Errors: ${errors}`);
}

main().catch(e => { console.error(e); process.exit(1); });
