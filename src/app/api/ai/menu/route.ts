import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMenu, regenerateMeal, MenuItemWithRecipes, MenuMode } from '@/lib/ai-meal-suggester';
import { formatMenuFromDb, type MenuDb } from '@/lib/menu-utils';

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
      const { data: menu, error } = await supabase
        .from('menus')
        .select('*, menu_items(*)')
        .eq('id', menuId)
        .eq('user_id', user.id)
        .single();

      if (error || !menu) {
        return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
      }

      return NextResponse.json({ menu: formatMenuFromDb(menu as MenuDb) });
    }

    if (all) {
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

    return NextResponse.json({ menu: formatMenuFromDb(menu as MenuDb) });
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
      mealsPerWeek: prefs?.meals_per_week || 7,
      maxCookTime: prefs?.max_cook_time || 45,
      interviewProfile: prefs?.interview_profile || null,
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
      offer_url?: string;
      store_name: string;
      chain_id: string;
    }) => ({
      id: o.offer_id,
      name: o.name,
      brand: o.brand,
      offer_price: o.offer_price,
      original_price: o.original_price,
      offer_url: o.offer_url,
      store_name: o.store_name,
      chain_id: o.chain_id,
    }));

    if (action === 'generate') {
      const mode: MenuMode = body.mode === 'budget' ? 'budget' : 'taste';

      // Save regenerate feedback if provided
      const genFeedback = body.feedback;
      if (genFeedback?.preference) {
        await supabase.from('user_feedback').insert({
          user_id: user.id,
          recipe_name: 'Hela menyn',
          feedback_type: 'regenerate',
          reason: null,
          preference: genFeedback.preference,
          tags: extractFeedbackTags(undefined, genFeedback.preference),
        });
      }

      // Load recent feedback history
      const { data: userFeedback } = await supabase
        .from('user_feedback')
        .select('reason, preference, tags')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const feedbackContext = userFeedback?.map(f => ({
        reason: f.reason,
        preference: f.preference,
      })).filter(f => f.reason || f.preference) || [];

      const menu = await generateMenu(
        preferences,
        formattedOffers,
        mode,
        undefined,
        genFeedback?.preference || null,
        feedbackContext
      );

      // Deactivate old menus
      await supabase
        .from('menus')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Save new menu
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
        return NextResponse.json({ menu });
      }

      // Save menu items — store suggestion + recipes in the existing recipe JSON column
      const menuItems = menu.items.map((item: MenuItemWithRecipes) => ({
        menu_id: savedMenu.id,
        day_index: item.dayIndex,
        day_name: item.day,
        meal: item.meal,
        recipe: {
          _version: 2,
          mode,
          suggestion: item.suggestion,
          recipeLinks: item.recipes,
        },
        matched_offers: item.matchedOffers,
        selected_recipe_index: Math.floor((item.recipes?.length || 0) / 2),
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
      const { currentMenu, dayIndex, meal, feedback } = body;

      if (!currentMenu || dayIndex === undefined || !meal) {
        return NextResponse.json(
          { error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      // Save feedback
      if (feedback && (feedback.reason || feedback.preference)) {
        await supabase.from('user_feedback').insert({
          user_id: user.id,
          recipe_name: feedback.recipeName || 'Unknown',
          feedback_type: 'swap',
          reason: feedback.reason || null,
          preference: feedback.preference || null,
          tags: extractFeedbackTags(feedback.reason, feedback.preference),
        });
      }

      // Load feedback history
      const { data: userFeedback } = await supabase
        .from('user_feedback')
        .select('reason, preference, tags')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const feedbackContext = userFeedback?.map(f => ({
        reason: f.reason,
        preference: f.preference,
      })).filter(f => f.reason || f.preference) || [];

      const existingNames = currentMenu.items?.map(
        (i: { suggestion?: { name: string }; recipe?: { name: string } }) =>
          i.suggestion?.name || i.recipe?.name || ''
      ).filter(Boolean) || [];

      const swapMode: MenuMode = currentMenu.mode || body.mode || 'taste';

      const newMeal = await regenerateMeal(
        dayIndex,
        meal,
        preferences,
        formattedOffers,
        existingNames,
        swapMode,
        feedback?.preference || null,
        feedbackContext
      );

      if (!newMeal) {
        return NextResponse.json(
          { error: 'Could not generate new meal suggestion' },
          { status: 500 }
        );
      }

      // Update in database
      if (currentMenu.id) {
        await supabase
          .from('menu_items')
          .update({
            recipe: {
              _version: 2,
              mode: swapMode,
              suggestion: newMeal.suggestion,
              recipeLinks: newMeal.recipes,
            },
            matched_offers: newMeal.matchedOffers,
            selected_recipe_index: Math.floor((newMeal.recipes?.length || 0) / 2),
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

function extractFeedbackTags(reason?: string, preference?: string): string[] {
  const tags: string[] = [];
  const text = `${reason || ''} ${preference || ''}`.toLowerCase();
  const keywords = [
    'kyckling', 'fisk', 'kött', 'vegetariskt', 'veganskt',
    'kryddigt', 'milt', 'sött', 'salt',
    'snabbt', 'enkelt', 'avancerat',
    'pasta', 'ris', 'potatis', 'sallad',
    'soppa', 'gryta', 'wok', 'ugn',
    'barn', 'familj',
  ];
  for (const keyword of keywords) {
    if (text.includes(keyword)) tags.push(keyword);
  }
  return tags;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * PATCH: Update selected recipe index for a menu item
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { menuItemId, selectedRecipeIndex } = await request.json();

    if (!menuItemId || selectedRecipeIndex === undefined) {
      return NextResponse.json({ error: 'menuItemId and selectedRecipeIndex required' }, { status: 400 });
    }

    // Verify the menu item belongs to the user
    const { data: menuItem, error: fetchError } = await supabase
      .from('menu_items')
      .select('id, menu_id, menus!inner(user_id)')
      .eq('id', menuItemId)
      .single();

    if (fetchError || !menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const menus = menuItem.menus as unknown as { user_id: string };
    if (menus.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update selected recipe index
    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ selected_recipe_index: selectedRecipeIndex })
      .eq('id', menuItemId);

    if (updateError) {
      console.error('Error updating selected recipe:', updateError);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/ai/menu:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
