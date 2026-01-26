const { Client } = require('pg');

const SCRAPER_URL = 'http://localhost:3001';
const DB_URL = 'postgresql://postgres:LodsKzaNsEuu8m@db.gepkjyzqrjkuminphpxm.supabase.co:5432/postgres';

const STORES = [
  { id: 'hemkop-4147', name: 'Hemköp Östermalmstorg', chain: 'hemkop', externalId: '4147' },
];

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
  // Delete old offers
  await client.query('DELETE FROM offers WHERE store_id = $1', [storeId]);
  
  // Insert new offers
  for (const o of offers) {
    await client.query(`
      INSERT INTO offers (id, store_id, chain_id, name, brand, offer_price, original_price, unit, image_url, requires_membership, scraped_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        offer_price = EXCLUDED.offer_price,
        image_url = EXCLUDED.image_url,
        scraped_at = EXCLUDED.scraped_at
    `, [
      o.id,
      o.storeId,
      o.chain,
      o.name,
      o.brand || null,
      o.offerPrice,
      o.originalPrice || null,
      o.unit || null,
      o.imageUrl || null,
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
  
  let totalOffers = 0;
  
  for (const store of STORES) {
    try {
      const offers = await scrapeStore(store);
      await syncToDb(client, store.id, offers);
      totalOffers += offers.length;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  await client.end();
  console.log(`\n✅ Complete! ${totalOffers} offers synced.`);
}

main().catch(e => { console.error(e); process.exit(1); });
