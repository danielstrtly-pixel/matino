import { createClient } from "@/lib/supabase/server";
import MenuClient from "./MenuClient";

interface MenuItemDb {
  id: string;
  day: string;
  day_index: number;
  meal: 'lunch' | 'dinner';
  suggestion: any;
  recipes: any[];
  matched_offers: any[];
  selected_recipe_index?: number;
}

interface MenuDb {
  id: string;
  name: string;
  created_at: string;
  mode?: string;
  menu_items: MenuItemDb[];
}

function formatMenuFromDb(menu: MenuDb) {
  return {
    id: menu.id,
    name: menu.name,
    generatedAt: menu.created_at,
    mode: menu.mode as 'taste' | 'budget' | undefined,
    items: (menu.menu_items || [])
      .sort((a, b) => a.day_index - b.day_index)
      .map((item) => ({
        id: item.id,
        day: item.day,
        dayIndex: item.day_index,
        meal: item.meal,
        suggestion: item.suggestion || { name: '', description: '', tags: [] },
        recipes: item.recipes || [],
        matchedOffers: item.matched_offers || [],
        selectedRecipeIndex: item.selected_recipe_index,
      })),
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
