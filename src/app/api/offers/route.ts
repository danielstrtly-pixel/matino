import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const chainId = searchParams.get('chainId');
    
    const supabase = await createClient();
    
    let query = supabase
      .from('offers')
      .select(`
        id,
        name,
        brand,
        description,
        original_price,
        offer_price,
        unit,
        savings,
        image_url,
        valid_until,
        requires_membership,
        scraped_at,
        store_id,
        chain_id,
        stores (name, city),
        chains (name, logo, color)
      `)
      .order('name');
    
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    
    if (chainId) {
      query = query.eq('chain_id', chainId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform to expected format
    const offers = (data || []).map((o: any) => ({
      id: o.id,
      name: o.name,
      brand: o.brand,
      description: o.description,
      originalPrice: o.original_price,
      offerPrice: o.offer_price,
      unit: o.unit,
      savings: o.savings,
      imageUrl: o.image_url,
      validUntil: o.valid_until,
      requiresMembership: o.requires_membership,
      scrapedAt: o.scraped_at,
      storeId: o.store_id,
      storeName: o.stores?.name,
      chain: o.chain_id,
      chainName: o.chains?.name,
      chainLogo: o.chains?.logo,
    }));
    
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

// Keep POST for backward compatibility with scraper direct calls
export async function POST(request: Request) {
  // Redirect to scraper if needed (for admin/sync purposes)
  const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:3001';
  
  try {
    const store = await request.json();
    
    const res = await fetch(`${SCRAPER_URL}/chains/${store.chain}/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    });
    
    if (!res.ok) throw new Error(`Scraper error: ${res.statusText}`);
    
    return NextResponse.json(await res.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}
