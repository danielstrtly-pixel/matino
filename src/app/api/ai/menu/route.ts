import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAIMenu, regenerateAIMeal, AIMenuItem } from '@/lib/ai-menu-generator';

/**
 * GET: Load saved menu(s)
 * - No params: Get active menu
 * - ?all=true: Get all menus
 * - ?id=xxx: Get specific menu
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (menuId) {
      // Get specific menu
      const { data: menu, error } = await supabase
        .from('menus')
        .select('*, menu_items(*)')
        .eq('id', menuId)
        .eq('user_id', user.id)
        .single();

      if (error || !menu) {
        return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
      }

      return NextResponse.json({ menu: formatMenuFromDb(menu) });
    }

    if (all) {
      // Get all menus (without items for list view)
      const { data: menus } = await supabase
        .from('menus')
        .select('id, name, created_at, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      return NextResponse.json({ menus: menus || [] });
    }

    // Get active menu
    const { data: menu } = await supabase
      .from('menus')
      .select('*, menu_items(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!menu) {
      return NextResponse.json({ menu: null });
    }

    return NextResponse.json({ menu: formatMenuFromDb(menu) });
  } catch (error) {
    console.error('Error loading menu:', error);
    return NextResponse.json(
      { error: 'Failed to load menu' },
      { status: 500 }
    );
  }
}

/**
 * POST: Generate new menu or swap meal
 */
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

    // Load user's offers
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
    }) => ({
      id: o.offer_id,
      name: o.name,
      brand: o.brand,
      offer_price: o.offer_price,
      original_price: o.original_price,
      store_name: o.store_name,
      chain_id: o.chain_id,
    }));

    if (action === 'generate') {
      // Generate new menu
      const menu = await generateAIMenu(preferences, formattedOffers);
      
      // Deactivate old menus
      await supabase
        .from('menus')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Save new menu to database
      const weekNumber = getWeekNumber(new Date());
      const { data: savedMenu, error: menuError } = await supabase
        .from('menus')
        .insert({
          user_id: user.id,
          name: `Vecka ${weekNumber}`,
          is_active: true,
        })
        .select()
        .single();

      if (menuError || !savedMenu) {
        console.error('Error saving menu:', menuError);
        // Still return the menu even if save fails
        return NextResponse.json({ menu });
      }

      // Save menu items
      const menuItems = menu.items.map((item: AIMenuItem) => ({
        menu_id: savedMenu.id,
        day_index: item.dayIndex,
        day_name: item.day,
        meal: item.meal,
        recipe: item.recipe,
        matched_offers: item.matchedOffers,
      }));

      await supabase.from('menu_items').insert(menuItems);

      return NextResponse.json({ 
        menu: {
          ...menu,
          id: savedMenu.id,
        }
      });
    }

    if (action === 'swap') {
      const { currentMenu, dayIndex, meal } = body;
      
      if (!currentMenu || dayIndex === undefined || !meal) {
        return NextResponse.json(
          { error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      const existingNames = currentMenu.items?.map((i: { recipe: { name: string } }) => i.recipe.name) || [];
      
      const newMeal = await regenerateAIMeal(
        dayIndex,
        meal,
        preferences,
        formattedOffers,
        existingNames
      );

      if (!newMeal) {
        return NextResponse.json(
          { error: 'Could not generate new recipe' },
          { status: 500 }
        );
      }

      // Update in database if menu has an ID
      if (currentMenu.id) {
        await supabase
          .from('menu_items')
          .update({
            recipe: newMeal.recipe,
            matched_offers: newMeal.matchedOffers,
          })
          .eq('menu_id', currentMenu.id)
          .eq('day_index', dayIndex)
          .eq('meal', meal);
      }

      return NextResponse.json({ meal: newMeal });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('AI Menu generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate menu' },
      { status: 500 }
    );
  }
}

/**
 * Format menu from database format to API format
 */
function formatMenuFromDb(dbMenu: {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
  menu_items: {
    day_index: number;
    day_name: string;
    meal: string;
    recipe: unknown;
    matched_offers: unknown;
  }[];
}) {
  return {
    id: dbMenu.id,
    name: dbMenu.name,
    generatedAt: dbMenu.created_at,
    isActive: dbMenu.is_active,
    items: (dbMenu.menu_items || [])
      .sort((a, b) => a.day_index - b.day_index)
      .map(item => ({
        day: item.day_name,
        dayIndex: item.day_index,
        meal: item.meal,
        recipe: item.recipe,
        matchedOffers: item.matched_offers || [],
      })),
  };
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
