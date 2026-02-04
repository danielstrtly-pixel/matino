import { createClient } from "@/lib/supabase/server";
import MenuClient from "./MenuClient";

interface MenuItemDb {
  id: string;
  day_index: number;
  day_name: string;
  meal: string;
  recipe: Record<string, unknown>;
  matched_offers: unknown;
  selected_recipe_index?: number;
}

interface MenuDb {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
  menu_items: MenuItemDb[];
}

function formatMenuFromDb(dbMenu: MenuDb) {
  // Detect mode from first v2 item
  const firstV2 = dbMenu.menu_items?.find(i => i.recipe?._version === 2);
  const mode = (firstV2?.recipe?.mode as string) || 'taste';

  return {
    id: dbMenu.id,
    name: dbMenu.name,
    generatedAt: dbMenu.created_at,
    mode: mode as 'taste' | 'budget',
    items: (dbMenu.menu_items || [])
      .sort((a, b) => a.day_index - b.day_index)
      .map(item => {
        const recipe = item.recipe;
        const isV2 = recipe?._version === 2;

        if (isV2) {
          // New format: suggestion + recipe links
          const recipeLinks = (recipe.recipeLinks || []) as unknown[];
          return {
            id: item.id,
            day: item.day_name,
            dayIndex: item.day_index,
            meal: item.meal as 'lunch' | 'dinner',
            suggestion: recipe.suggestion || { name: '', description: '', tags: [] },
            recipes: recipeLinks,
            matchedOffers: (item.matched_offers || []) as any[],
            selectedRecipeIndex: item.selected_recipe_index ?? Math.floor(recipeLinks.length / 2),
          };
        }

        // Legacy v1 format: full AI recipe — adapt to new structure
        return {
          id: item.id,
          day: item.day_name,
          dayIndex: item.day_index,
          meal: item.meal as 'lunch' | 'dinner',
          suggestion: {
            name: (recipe?.name as string) || '',
            description: (recipe?.description as string) || '',
            tags: (recipe?.tags as string[]) || [],
          },
          recipes: [],
          matchedOffers: (item.matched_offers || []) as any[],
          selectedRecipeIndex: item.selected_recipe_index,
        };
      }),
  };
}

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || "";

  // Parallel fetch: active menu + saved recipe URLs
  const [{ data: menuData }, { data: recipesData }] = await Promise.all([
    supabase
      .from("menus")
      .select("*, menu_items(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("saved_recipes")
      .select("url")
      .eq("user_id", userId),
  ]);

  const initialMenu = menuData ? formatMenuFromDb(menuData as MenuDb) : null;
  const initialSavedRecipeUrls = (recipesData || []).map((r: { url: string }) => r.url);

  return (
    <MenuClient 
      initialMenu={initialMenu} 
      initialSavedRecipeUrls={initialSavedRecipeUrls} 
    />
  );
}
