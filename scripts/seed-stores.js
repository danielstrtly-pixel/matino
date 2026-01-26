#!/usr/bin/env node
/**
 * Seed stores for chains that have APIs (Coop, Lidl)
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envFile = readFileSync(envPath, 'utf-8');
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#')) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedCoopStores() {
  console.log('\n🟢 Fetching Coop stores from API...');
  
  try {
    const res = await fetch(
      'https://proxy.api.coop.se/external/store/stores/map?conceptIds=12,6,95&invertFilter=true&api-version=v2',
      {
        headers: {
          'accept': 'application/json',
          'ocp-apim-subscription-key': '990520e65cc44eef89e9e9045b57f4e9',
          'origin': 'https://www.coop.se',
          'referer': 'https://www.coop.se/',
        }
      }
    );
    
    if (!res.ok) {
      throw new Error(`Coop API failed: ${res.status}`);
    }
    
    const stores = await res.json();
    console.log(`   Found ${stores.length} Coop stores`);
    
    // Ensure chain exists (ignore errors - may already exist)
    await supabase
      .from('chains')
      .upsert({ id: 'coop', name: 'Coop', logo: '🟢' }, { onConflict: 'id' });
    
    // Map and insert stores (only use columns that exist)
    const storeRecords = stores.map(s => {
      const slug = (s.name || '').toLowerCase().replace(/[^a-z0-9åäö]+/g, '-');
      return {
        id: `coop-${s.storeId || slug}`,
        chain_id: 'coop',
        external_id: String(s.storeId || slug),
        name: s.name,
        address: s.streetAddress,
        city: s.city,
        profile: s.conceptName || 'Coop',
        offers_url: `https://www.coop.se/butiker-erbjudanden/${(s.conceptName || 'coop').toLowerCase().replace(/\s+/g, '-')}/${slug}/`,
      };
    });
    
    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < storeRecords.length; i += batchSize) {
      const batch = storeRecords.slice(i, i + batchSize);
      const { error } = await supabase.from('stores').upsert(batch, { onConflict: 'id' });
      if (error) {
        console.error(`   Batch ${i / batchSize + 1} error:`, error.message);
      } else {
        inserted += batch.length;
      }
    }
    
    console.log(`   ✅ Inserted/updated ${inserted} Coop stores`);
    return inserted;
  } catch (e) {
    console.error('   ❌ Coop seeding failed:', e.message);
    return 0;
  }
}

async function seedLidlStores() {
  console.log('\n🔵 Setting up Lidl stores...');
  
  try {
    // Ensure chain exists (ignore errors - may already exist)
    await supabase
      .from('chains')
      .upsert({ id: 'lidl', name: 'Lidl', logo: '🔵' }, { onConflict: 'id' });
    
    // Lidl has national offers - add a single "national" store option
    // Plus some major cities if they want specific stores later
    const lidlStores = [
      {
        id: 'lidl-national',
        chain_id: 'lidl',
        external_id: 'national',
        name: 'Lidl Sverige (alla butiker)',
        address: 'Nationella erbjudanden',
        city: 'Sverige',
        profile: 'Nationell',
      },
      // Major cities - Lidl has 200+ stores but offers are national
      // We can add specific stores later if needed
    ];
    
    const { error } = await supabase.from('stores').upsert(lidlStores, { onConflict: 'id' });
    if (error) {
      console.error('   Error:', error.message);
    } else {
      console.log(`   ✅ Inserted/updated ${lidlStores.length} Lidl store option(s)`);
    }
    
    return lidlStores.length;
  } catch (e) {
    console.error('   ❌ Lidl seeding failed:', e.message);
    return 0;
  }
}

async function main() {
  console.log('🌱 Matino Store Seeder\n');
  console.log('Connected to Supabase');
  
  const coopCount = await seedCoopStores();
  const lidlCount = await seedLidlStores();
  
  console.log('\n✅ Complete!');
  console.log(`   Coop: ${coopCount} stores`);
  console.log(`   Lidl: ${lidlCount} stores`);
}

main().catch(console.error);
