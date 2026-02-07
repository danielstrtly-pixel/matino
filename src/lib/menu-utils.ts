/**
 * Shared menu formatting utilities.
 * Used by both the API route and the server-rendered page.
 */

export interface MenuItemDb {
  id: string;
  day_index: number;
  day_name: string;
  meal: string;
  recipe: Record<string, unknown>;
  matched_offers: unknown;
  selected_recipe_index?: number;
}

export interface MenuDb {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
  menu_items: MenuItemDb[];
}

/**
 * Format menu from DB — handles both v1 (full recipe) and v2 (suggestion + links) formats
 */
export function formatMenuFromDb(dbMenu: MenuDb) {
  // Detect mode from first v2 item
  const firstV2 = dbMenu.menu_items?.find(i => i.recipe?._version === 2);
  const mode = (firstV2?.recipe?.mode as string) || 'taste';

  return {
    id: dbMenu.id,
    name: dbMenu.name,
    generatedAt: dbMenu.created_at,
    isActive: dbMenu.is_active,
    mode: mode as 'taste' | 'budget',
    items: (dbMenu.menu_items || [])
      .sort((a, b) => a.day_index - b.day_index)
      .map(item => {
        const recipe = item.recipe;
        const isV2 = recipe?._version === 2;

        if (isV2) {
          const recipeLinks = (recipe.recipeLinks || []) as unknown[];
          const suggestion = recipe.suggestion as { name?: string; description?: string; tags?: string[] } || {};
          return {
            id: item.id,
            day: item.day_name,
            dayIndex: item.day_index,
            meal: item.meal as 'lunch' | 'dinner',
            suggestion: {
              name: suggestion.name || '',
              description: suggestion.description || '',
              tags: suggestion.tags || [],
            },
            recipes: recipeLinks,
            matchedOffers: (item.matched_offers || []) as unknown[],
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
          recipes: [] as unknown[],
          matchedOffers: (item.matched_offers || []) as unknown[],
          selectedRecipeIndex: item.selected_recipe_index ?? 0,
        };
      }),
  };
}
