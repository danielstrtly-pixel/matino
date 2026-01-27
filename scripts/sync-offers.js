const { Client } = require('pg');

const SCRAPER_URL = 'http://localhost:3001';
const DB_URL = 'postgresql://postgres:LodsKzaNsEuu8m@db.gepkjyzqrjkuminphpxm.supabase.co:5432/postgres';

async function getStoresToSync(client) {
  // Get all unique stores that users have selected
  const result = await client.query(`
    SELECT DISTINCT s.id, s.name, s.chain_id as chain, s.external_id, s.offers_url
    FROM stores s
    INNER JOIN user_stores us ON us.store_id = s.id
    ORDER BY s.chain_id, s.name
  `);
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    chain: row.chain,
    externalId: row.external_id,
    offersUrl: row.offers_url
  }));
}

async function scrapeStore(store) {
  console.log(`\n📍 Scraping ${store.name}...`);
  
  const res = await fetch(`${SCRAPER_URL}/chains/${store.chain}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(store),
  });
  
  if (!res.ok) throw new Error(`Scraper error: ${res.statusText}`);
  
  const data = await res.json();
  console.log(`   Found ${data.offers?.length || 0} offers`);
  return data.offers || [];
}

async function syncToDb(client, storeId, offers) {
  // Delete old offers for this store
  await client.query('DELETE FROM offers WHERE store_id = $1', [storeId]);
  
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
  
  console.log(`   ✅ Synced ${offers.length} offers to database`);
}

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('🚀 Matino Offer Sync\n');
  console.log('Connected to Supabase');
  
  // Get stores dynamically from user_stores
  const stores = await getStoresToSync(client);
  console.log(`Found ${stores.length} stores to sync from user selections`);
  
  if (stores.length === 0) {
    console.log('⚠️ No stores selected by any user. Nothing to sync.');
    await client.end();
    return;
  }
  
  let totalOffers = 0;
  
  for (const store of stores) {
    try {
      const offers = await scrapeStore(store);
      await syncToDb(client, store.id, offers);
      totalOffers += offers.length;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  await client.end();
  console.log(`\n✅ Complete! ${totalOffers} offers synced across ${stores.length} stores.`);
}

main().catch(e => { console.error(e); process.exit(1); });
