import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain');
    const query = searchParams.get('q') || '';

    if (!chain) {
      return NextResponse.json(
        { error: 'Chain parameter required' },
        { status: 400 }
      );
    }

    // Build query
    let dbQuery = supabase
      .from('stores')
      .select('*')
      .eq('chain_id', chain);

    // Search by name, city, or profile
    if (query) {
      const searchTerm = `%${query}%`;
      dbQuery = dbQuery.or(
        `name.ilike.${searchTerm},city.ilike.${searchTerm},profile.ilike.${searchTerm}`
      );
    }

    // Order by name
    dbQuery = dbQuery.order('name');

    const { data: stores, error, count } = await dbQuery;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Database query failed' },
        { status: 500 }
      );
    }

    // Map to frontend format
    const mappedStores = (stores || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      city: s.city,
      chain: s.chain_id,
      externalId: s.external_id,
      profile: s.profile,
      offersUrl: s.offers_url,
    }));

    return NextResponse.json({
      stores: mappedStores,
      totalCount: mappedStores.length,
    });
  } catch (error) {
    console.error('Error searching stores:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search stores' },
      { status: 500 }
    );
  }
}
