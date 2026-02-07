import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: chains, error } = await supabase
      .from('chains')
      .select('id, name, logo, supported')
      .order('name');

    if (error) {
      console.error('Failed to fetch chains:', error);
      return NextResponse.json({ error: 'Failed to fetch chains' }, { status: 500 });
    }

    return NextResponse.json({ chains });
  } catch (error) {
    console.error('Error fetching chains:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
