/**
 * Sync ICA stores from scraper to Supabase
 * 
 * Usage: node scripts/sync-stores.js [query]
 * Example: node scripts/sync-stores.js maxi
 */

const { Client } = require('pg');

const SCRAPER_URL = 'http://localhost:3001';
const DB_URL = 'postgresql://postgres:LodsKzaNsEuu8m@db.gepkjyzqrjkuminphpxm.supabase.co:5432/postgres';

// Store types to sync for ICA
const ICA_QUERIES = ['maxi', 'kvantum', 'supermarket', 'nära'];

async function fetchStores(chain, query) {
  console.log(`   Fetching ${chain} stores for "${query}"...`);
  
  const res = await fetch(`${SCRAPER_URL}/chains/${chain}/stores?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Scraper error: ${res.statusText}`);
  
  const data = await res.json();
  console.log(`   Found ${data.stores?.length || 0} stores (total: ${data.totalCount || 'N/A'})`);
  return data.stores || [];
}

async function syncStoresToDb(client, stores) {
  let inserted = 0;
  let updated = 0;
  
  for (const store of stores) {
    const result = await client.query(`
      INSERT INTO stores (id, chain_id, external_id, name, address, city, profile, offers_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        profile = EXCLUDED.profile,
        offers_url = EXCLUDED.offers_url
      RETURNING (xmax = 0) as inserted
    `, [
      store.id,
      store.chain,
      store.externalId,
      store.name,
      store.address || null,
      store.city || null,
      store.profile || null,
      store.offersUrl || null,
    ]);
    
    if (result.rows[0]?.inserted) {
      inserted++;
    } else {
      updated++;
    }
  }
  
  return { inserted, updated };
}

async function main() {
  const args = process.argv.slice(2);
  const queries = args.length > 0 ? args : ICA_QUERIES;
  
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log('🏪 Matino Store Sync\n');
  console.log('Connected to Supabase\n');
  
  let totalStores = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  
  // Sync ICA stores
  console.log('📍 ICA stores:');
  for (const query of queries) {
    try {
      const stores = await fetchStores('ica', query);
      if (stores.length > 0) {
        const { inserted, updated } = await syncStoresToDb(client, stores);
        totalStores += stores.length;
        totalInserted += inserted;
        totalUpdated += updated;
        console.log(`   ✅ ${query}: ${inserted} new, ${updated} updated\n`);
      }
    } catch (error) {
      console.error(`   ❌ Error for "${query}": ${error.message}\n`);
    }
  }
  
  await client.end();
  console.log(`\n✅ Complete!`);
  console.log(`   Total: ${totalStores} stores processed`);
  console.log(`   New: ${totalInserted}, Updated: ${totalUpdated}`);
}

main().catch(e => { console.error(e); process.exit(1); });
