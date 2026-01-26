import { NextResponse } from 'next/server';
import { getOffers, type Store } from '@/lib/scraper-client';

export async function POST(request: Request) {
  try {
    const store: Store = await request.json();
    
    if (!store || !store.externalId || !store.chain) {
      return NextResponse.json(
        { error: 'Store with externalId and chain required' },
        { status: 400 }
      );
    }

    const result = await getOffers(store);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}
