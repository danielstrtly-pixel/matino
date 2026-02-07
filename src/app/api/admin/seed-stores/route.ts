import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    // Verify the caller is an authenticated user
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminClient();
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain');

    if (chain === 'coop' || !chain) {
      const coopCount = await seedCoopStores(supabase);
      if (chain === 'coop') {
        return NextResponse.json({ success: true, coop: coopCount });
      }
    }

    if (chain === 'lidl' || !chain) {
      const lidlCount = await seedLidlStores(supabase);
      if (chain === 'lidl') {
        return NextResponse.json({ success: true, lidl: lidlCount });
      }
    }

    const coopCount = await seedCoopStores(supabase);
    const lidlCount = await seedLidlStores(supabase);

    return NextResponse.json({
      success: true,
      coop: coopCount,
      lidl: lidlCount,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Seed failed' },
      { status: 500 }
    );
  }
}

async function seedCoopStores(supabase: SupabaseClient): Promise<number> {
  console.log('Fetching Coop stores from API...');

  // Not secret, got it from scraping coop
  const coopApiKey = '990520e65cc44eef89e9e9045b57f4e9';
  if (!coopApiKey) {
    throw new Error('COOP_API_KEY environment variable is required');
  }

  const res = await fetch(
    'https://proxy.api.coop.se/external/store/stores/map?conceptIds=12,6,95&invertFilter=true&api-version=v2',
    {
      headers: {
        'accept': 'application/json',
        'ocp-apim-subscription-key': coopApiKey,
        'origin': 'https://www.coop.se',
        'referer': 'https://www.coop.se/',
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Coop API failed: ${res.status}`);
  }

  const stores = await res.json();
  console.log(`Found ${stores.length} Coop stores`);

  // Map stores
  const storeRecords = stores.map((s: any) => {
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
      console.error(`Batch ${i / batchSize + 1} error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Inserted ${inserted} Coop stores`);
  return inserted;
}

async function seedLidlStores(supabase: SupabaseClient): Promise<number> {
  console.log('Setting up Lidl stores...');

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
  ];

  const { error } = await supabase.from('stores').upsert(lidlStores, { onConflict: 'id' });
  if (error) {
    console.error('Lidl error:', error.message);
    return 0;
  }

  return lidlStores.length;
}
