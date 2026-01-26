import { NextResponse } from 'next/server';
import { searchStores, type ChainId } from '@/lib/scraper-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') as ChainId;
    const query = searchParams.get('q') || '';

    if (!chain) {
      return NextResponse.json(
        { error: 'Chain parameter required' },
        { status: 400 }
      );
    }

    const result = await searchStores(chain, query);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching stores:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search stores' },
      { status: 500 }
    );
  }
}
