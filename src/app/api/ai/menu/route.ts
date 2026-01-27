import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMenu, regenerateMeal, GeneratedMenu } from '@/lib/menu-generator';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action || 'generate';

    // Load user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const preferences = {
      householdSize: prefs?.household_size || 2,
      hasChildren: prefs?.has_children || false,
      likes: prefs?.likes || [],
      dislikes: prefs?.dislikes || [],
      healthLabels: prefs?.health_labels || [],
      dietLabels: prefs?.diet_labels || [],
      cuisineTypes: prefs?.cuisine_types || [],
      mealsPerWeek: prefs?.meals_per_week || 5,
      maxCookTime: prefs?.max_cook_time || 45,
      includeLunch: prefs?.include_lunch || false,
    };

    // Load user's offers from their selected stores
    const { data: offers } = await supabase.rpc('get_user_offers', {
      p_user_id: user.id,
    });

    const formattedOffers = (offers || []).map((o: {
      offer_id: string;
      name: string;
      brand?: string;
      offer_price: number;
      original_price?: number;
      store_name: string;
      chain_id: string;
      image_url?: string;
    }) => ({
      id: o.offer_id,
      name: o.name,
      brand: o.brand,
      offer_price: o.offer_price,
      original_price: o.original_price,
      store_name: o.store_name,
      chain_id: o.chain_id,
      image_url: o.image_url,
    }));

    if (action === 'generate') {
      // Generate new menu
      const menu = await generateMenu(preferences, formattedOffers);
      return NextResponse.json({ menu });
    } 
    
    if (action === 'swap') {
      // Swap a single meal
      const { currentMenu, dayIndex, meal } = body;
      
      if (!currentMenu || dayIndex === undefined || !meal) {
        return NextResponse.json(
          { error: 'Missing required parameters: currentMenu, dayIndex, meal' },
          { status: 400 }
        );
      }

      const newMeal = await regenerateMeal(
        currentMenu as GeneratedMenu,
        dayIndex,
        meal,
        preferences,
        formattedOffers
      );

      if (!newMeal) {
        return NextResponse.json(
          { error: 'Could not find a new recipe' },
          { status: 404 }
        );
      }

      return NextResponse.json({ meal: newMeal });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Menu generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate menu' },
      { status: 500 }
    );
  }
}
