import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyMenu } from '@/lib/openrouter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const menu = await generateWeeklyMenu({
      preferences: body.preferences || {},
      offers: body.offers || [],
      previousRecipes: body.previousRecipes || [],
    });

    return NextResponse.json({ menu });
  } catch (error) {
    console.error('Menu generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate menu' },
      { status: 500 }
    );
  }
}
