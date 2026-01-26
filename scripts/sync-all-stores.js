#!/usr/bin/env node
/**
 * Sync offers for all stores that users have selected.
 * Respects 24h cooldown per store.
 * Run nightly via cron.
 */

const { Client } = require('pg');

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:3001';
const DB_URL = 'postgresql://postgres:LodsKzaNsEuu8m@db.gepkjyzqrjkuminphpxm.supabase.co:5432/postgres';
const COOLDOWN_HOURS = 20; // Sync if older than 20h (leaves buffer for nightly runs)

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('🚀 Matino Nightly Sync\n');
  console.log(`Scraper: ${SCRAPER_URL}`);
  console.log(`Cooldown: ${COOLDOWN_HOURS}h\n`);

  // Get all unique stores that users have selected
  const { rows: stores } = await client.query(`
    SELECT DISTINCT s.id, s.name, s.chain_id, s.external_id, s.offers_url, s.last_synced_at
    FROM stores s
    INNER JOIN user_stores us ON s.id = us.store_id
  `);

  console.log(`Found ${stores.length} stores to check\n`);

  const now = new Date();
  const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const store of stores) {
    // Check cooldown
    if (store.last_synced_at) {
      const lastSync = new Date(store.last_synced_at);
      const age = now.getTime() - lastSync.getTime();
      if (age < cooldownMs) {
        const hoursAgo = Math.round(age / 3600000);
        console.log(`⏭️  ${store.name} - synced ${hoursAgo}h ago, skipping`);
        skipped++;
        continue;
      }
    }

    console.log(`📍 Syncing ${store.name}...`);

    try {
      // Call scraper
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
        throw new Error(`Scraper error: ${res.status}`);
      }

      const data = await res.json();
      const offers = data.offers || [];

      // Delete old offers
      await client.query('DELETE FROM offers WHERE store_id = $1', [store.id]);

      // Insert new offers
      for (const o of offers) {
        await client.query(`
          INSERT INTO offers (id, store_id, chain_id, name, brand, offer_price, quantity, quantity_price, original_price, unit, image_url, category, requires_membership, scraped_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            offer_price = EXCLUDED.offer_price,
            quantity = EXCLUDED.quantity,
            quantity_price = EXCLUDED.quantity_price,
            image_url = EXCLUDED.image_url,
            category = EXCLUDED.category,
            scraped_at = EXCLUDED.scraped_at
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
          o.category || null,
          o.requiresMembership || false,
          o.scrapedAt
        ]);
      }

      // Update last_synced_at
      await client.query(
        'UPDATE stores SET last_synced_at = $1 WHERE id = $2',
        [now.toISOString(), store.id]
      );

      console.log(`   ✅ ${offers.length} offers`);
      synced++;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errors++;
    }
  }

  await client.end();

  console.log(`\n${'='.repeat(40)}`);
  console.log(`✅ Synced: ${synced}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`Total stores: ${stores.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
