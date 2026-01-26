#!/usr/bin/env node

/**
 * Sync scraper data to Supabase
 * 
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npx tsx src/sync-to-supabase.ts
 * 
 * Or run for specific stores:
 *   npx tsx src/sync-to-supabase.ts hemkop-4147 hemkop-2070
 */

import { createScraper } from './scrapers';
import type { Store, Offer } from './types';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

interface DbStore {
  id: string;
  chain_id: string;
  external_id: string;
  name: string;
  city?: string;
}

async function supabaseQuery(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY!,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error: ${res.status} ${text}`);
  }
  
  if (options.method === 'GET' || res.headers.get('content-type')?.includes('json')) {
    return res.json().catch(() => null);
  }
  return null;
}

async function getStoresToScrape(storeIds?: string[]): Promise<DbStore[]> {
  let query = 'stores?select=id,chain_id,external_id,name,city';
  
  if (storeIds && storeIds.length > 0) {
    query += `&id=in.(${storeIds.map(id => `"${id}"`).join(',')})`;
  }
  
  // If no specific stores, get stores that have user selections
  if (!storeIds || storeIds.length === 0) {
    // Get unique store IDs from user_stores
    const userStores = await supabaseQuery('user_stores?select=store_id', { method: 'GET' });
    if (userStores && userStores.length > 0) {
      const uniqueStoreIds = [...new Set(userStores.map((us: any) => us.store_id))];
      query += `&id=in.(${uniqueStoreIds.map(id => `"${id}"`).join(',')})`;
    }
  }
  
  return await supabaseQuery(query, { method: 'GET' }) || [];
}

async function deleteOldOffers(storeId: string) {
  await supabaseQuery(`offers?store_id=eq.${storeId}`, { method: 'DELETE' });
}

async function insertOffers(offers: Offer[]) {
  if (offers.length === 0) return;
  
  const dbOffers = offers.map(o => ({
    id: o.id,
    store_id: o.storeId,
    chain_id: o.chain,
    name: o.name,
    brand: o.brand || null,
    description: o.description || null,
    original_price: o.originalPrice || null,
    offer_price: o.offerPrice,
    unit: o.unit || null,
    savings: o.savings || null,
    image_url: o.imageUrl || null,
    valid_from: o.validFrom || null,
    valid_until: o.validUntil || null,
    category: o.category || null,
    max_per_household: o.maxPerHousehold || null,
    requires_membership: o.requiresMembership || false,
    scraped_at: o.scrapedAt,
  }));
  
  await supabaseQuery('offers', {
    method: 'POST',
    body: JSON.stringify(dbOffers),
  });
}

async function createScrapeJob(storeId: string): Promise<string> {
  const result = await supabaseQuery('scrape_jobs', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      store_id: storeId,
      status: 'running',
      started_at: new Date().toISOString(),
    }),
  });
  return result?.[0]?.id;
}

async function updateScrapeJob(jobId: string, data: any) {
  await supabaseQuery(`scrape_jobs?id=eq.${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

async function scrapeStore(dbStore: DbStore): Promise<{ success: boolean; offersCount: number; duration: number }> {
  const store: Store = {
    id: dbStore.id,
    name: dbStore.name,
    chain: dbStore.chain_id as any,
    externalId: dbStore.external_id,
  };
  
  console.log(`\n📍 Scraping ${store.name} (${store.chain})...`);
  const start = Date.now();
  
  const scraper = createScraper(store.chain);
  
  try {
    await scraper.init();
    const result = await scraper.getOffers(store);
    
    if (result.success && result.data) {
      const offers = result.data.offers;
      console.log(`   Found ${offers.length} offers`);
      
      // Delete old offers and insert new ones
      await deleteOldOffers(store.id);
      await insertOffers(offers);
      
      const duration = Date.now() - start;
      console.log(`   ✅ Synced in ${(duration / 1000).toFixed(1)}s`);
      
      return { success: true, offersCount: offers.length, duration };
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      return { success: false, offersCount: 0, duration: Date.now() - start };
    }
  } finally {
    await scraper.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const storeIds = args.length > 0 ? args : undefined;
  
  console.log('🚀 Matino Scraper Sync\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  
  // Get stores to scrape
  const stores = await getStoresToScrape(storeIds);
  
  if (stores.length === 0) {
    console.log('\n⚠️  No stores to scrape.');
    console.log('   Either specify store IDs or add stores to user_stores table.');
    process.exit(0);
  }
  
  console.log(`\nStores to scrape: ${stores.length}`);
  stores.forEach(s => console.log(`  - ${s.name} (${s.id})`));
  
  let totalOffers = 0;
  let successCount = 0;
  
  for (const store of stores) {
    const jobId = await createScrapeJob(store.id);
    
    try {
      const result = await scrapeStore(store);
      
      await updateScrapeJob(jobId, {
        status: result.success ? 'completed' : 'failed',
        offers_count: result.offersCount,
        duration_ms: result.duration,
        completed_at: new Date().toISOString(),
      });
      
      if (result.success) {
        totalOffers += result.offersCount;
        successCount++;
      }
    } catch (error) {
      await updateScrapeJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      });
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Sync complete: ${successCount}/${stores.length} stores, ${totalOffers} offers`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
