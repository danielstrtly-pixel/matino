/**
 * Edamam Recipe Search API client
 * Documentation: https://developer.edamam.com/edamam-docs-recipe-api
 */

const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;
const EDAMAM_BASE_URL = 'https://api.edamam.com/api/recipes/v2';

// Health Labels - Edamam API parameter values
export const HEALTH_LABELS = {
  'Vegetarisk': 'vegetarian',
  'Vegansk': 'vegan',
  'Glutenfri': 'gluten-free',
  'Laktosfri': 'dairy-free',
  'Äggfri': 'egg-free',
  'Nötfri': 'tree-nut-free',
  'Jordnötsfri': 'peanut-free',
  'Fiskfri': 'fish-free',
  'Skaldjursfri': 'shellfish-free',
  'Sojafri': 'soy-free',
  'Fläskfri': 'pork-free',
  'Keto': 'keto-friendly',
  'Paleo': 'paleo',
  'Pescetarian': 'pescatarian',
  'DASH': 'DASH',
  'Medelhavskost': 'Mediterranean',
  'Lågt socker': 'low-sugar',
  'Alkoholfri': 'alcohol-free',
} as const;

// Diet Labels - nutrient-based
export const DIET_LABELS = {
  'Balanserad': 'balanced',
  'Proteinrik': 'high-protein',
  'Lågkolhydrat': 'low-carb',
  'Fiberrik': 'high-fiber',
  'Låg fetthalt': 'low-fat',
  'Låg natriumhalt': 'low-sodium',
} as const;

// Cuisine Types
export const CUISINE_TYPES = {
  'Nordisk': 'nordic',
  'Svensk': 'nordic', // Map Swedish to Nordic
  'Italiensk': 'italian',
  'Asiatisk': 'asian',
  'Mexikansk': 'mexican',
  'Indisk': 'indian',
  'Medelhavet': 'mediterranean',
  'Kinesisk': 'chinese',
  'Japansk': 'japanese',
  'Fransk': 'french',
  'Amerikansk': 'american',
  'Grekisk': 'greek',
} as const;

// Meal Types
export const MEAL_TYPES = {
  'Frukost': 'breakfast',
  'Brunch': 'brunch',
  'Lunch/Middag': 'lunch/dinner',
  'Mellanmål': 'snack',
} as const;

// Dish Types for filtering
export const DISH_TYPES = [
  'main course',
  'salad',
  'soup',
  'pasta',
  'sandwich',
  'side dish',
  'starter',
  'seafood',
] as const;

export interface EdamamRecipe {
  uri: string;
  label: string;
  image: string;
  images?: {
    THUMBNAIL?: { url: string };
    SMALL?: { url: string };
    REGULAR?: { url: string };
    LARGE?: { url: string };
  };
  source: string;
  url: string;
  yield: number;
  dietLabels: string[];
  healthLabels: string[];
  ingredientLines: string[];
  ingredients: {
    foodId: string;
    quantity: number;
    measure: string;
    weight: number;
    food: string;
    foodCategory: string;
  }[];
  calories: number;
  totalTime: number;
  cuisineType: string[];
  mealType: string[];
  dishType: string[];
  totalNutrients: Record<string, {
    label: string;
    quantity: number;
    unit: string;
  }>;
}

export interface EdamamSearchResponse {
  from: number;
  to: number;
  count: number;
  _links: {
    next?: { href: string };
  };
  hits: {
    recipe: EdamamRecipe;
    _links: { self: { href: string } };
  }[];
}

export interface RecipeSearchParams {
  query?: string;                    // Free text search (ingredients)
  healthLabels?: string[];           // Health restrictions
  dietLabels?: string[];             // Nutrient-based diet
  cuisineTypes?: string[];           // Cuisine preferences
  mealType?: string;                 // breakfast, lunch/dinner, etc.
  dishType?: string[];               // main course, salad, etc.
  maxTime?: number;                  // Max cooking time in minutes
  maxResults?: number;               // Number of results (default 10)
  excluded?: string[];               // Ingredients to exclude
}

/**
 * Search for recipes using Edamam API
 */
export async function searchRecipes(params: RecipeSearchParams): Promise<EdamamRecipe[]> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    throw new Error('EDAMAM_APP_ID and EDAMAM_APP_KEY must be set');
  }

  const url = new URL(EDAMAM_BASE_URL);
  url.searchParams.set('type', 'public');
  url.searchParams.set('app_id', EDAMAM_APP_ID);
  url.searchParams.set('app_key', EDAMAM_APP_KEY);

  // Query (ingredients to include)
  if (params.query) {
    url.searchParams.set('q', params.query);
  }

  // Health labels (allergies, dietary restrictions)
  if (params.healthLabels?.length) {
    params.healthLabels.forEach(label => {
      url.searchParams.append('health', label);
    });
  }

  // Diet labels (nutrient-based)
  if (params.dietLabels?.length) {
    params.dietLabels.forEach(label => {
      url.searchParams.append('diet', label);
    });
  }

  // Cuisine types
  if (params.cuisineTypes?.length) {
    params.cuisineTypes.forEach(cuisine => {
      url.searchParams.append('cuisineType', cuisine);
    });
  }

  // Meal type
  if (params.mealType) {
    url.searchParams.set('mealType', params.mealType);
  }

  // Dish type
  if (params.dishType?.length) {
    params.dishType.forEach(dish => {
      url.searchParams.append('dishType', dish);
    });
  }

  // Max cooking time
  if (params.maxTime) {
    url.searchParams.set('time', `0-${params.maxTime}`);
  }

  // Excluded ingredients
  if (params.excluded?.length) {
    params.excluded.forEach(ingredient => {
      url.searchParams.append('excluded', ingredient);
    });
  }

  // Request more results for better variety
  const maxResults = params.maxResults || 10;

  console.log('[Edamam] Searching:', url.toString().replace(EDAMAM_APP_KEY, '***'));

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Edamam] Error:', response.status, error);
    throw new Error(`Edamam API error: ${response.status}`);
  }

  const data: EdamamSearchResponse = await response.json();
  
  console.log(`[Edamam] Found ${data.count} recipes, returning ${Math.min(data.hits.length, maxResults)}`);
  
  return data.hits.slice(0, maxResults).map(hit => hit.recipe);
}

/**
 * Search for recipes that use specific offer ingredients
 */
export async function searchRecipesWithOffers(
  offerIngredients: string[],
  preferences: {
    healthLabels?: string[];
    dietLabels?: string[];
    cuisineTypes?: string[];
    maxTime?: number;
    excluded?: string[];
  },
  maxResults: number = 5
): Promise<EdamamRecipe[]> {
  // Build query from offer ingredients (e.g., "chicken tomato pasta")
  const query = offerIngredients.slice(0, 3).join(' ');
  
  return searchRecipes({
    query,
    healthLabels: preferences.healthLabels,
    dietLabels: preferences.dietLabels,
    cuisineTypes: preferences.cuisineTypes,
    maxTime: preferences.maxTime,
    excluded: preferences.excluded,
    mealType: 'lunch/dinner',
    dishType: ['main course'],
    maxResults,
  });
}

/**
 * Extract main ingredients from offers for recipe search
 * Maps common Swedish offer names to English search terms
 */
export function extractSearchableIngredients(offers: { name: string }[]): string[] {
  const ingredientMap: Record<string, string> = {
    // Proteins
    'kycklingfilé': 'chicken',
    'kyckling': 'chicken',
    'köttfärs': 'ground beef',
    'nötfärs': 'ground beef',
    'fläskfärs': 'ground pork',
    'blandfärs': 'ground meat',
    'laxfilé': 'salmon',
    'lax': 'salmon',
    'torskfilé': 'cod',
    'torsk': 'cod',
    'fisk': 'fish',
    'räkor': 'shrimp',
    'kassler': 'ham',
    'bacon': 'bacon',
    'skinka': 'ham',
    'korv': 'sausage',
    'falukorv': 'sausage',
    'fläskkarré': 'pork loin',
    'fläskkotlett': 'pork chop',
    'entrecôte': 'beef steak',
    'ryggbiff': 'beef steak',
    'högrev': 'beef chuck',
    // Produce
    'tomat': 'tomato',
    'potatis': 'potato',
    'lök': 'onion',
    'vitlök': 'garlic',
    'paprika': 'bell pepper',
    'broccoli': 'broccoli',
    'morot': 'carrot',
    'gurka': 'cucumber',
    'sallad': 'lettuce',
    'spenat': 'spinach',
    'champinjoner': 'mushroom',
    'svamp': 'mushroom',
    'avokado': 'avocado',
    'citron': 'lemon',
    'lime': 'lime',
    // Dairy
    'ost': 'cheese',
    'grädde': 'cream',
    'mjölk': 'milk',
    'smör': 'butter',
    'ägg': 'egg',
    // Carbs
    'pasta': 'pasta',
    'ris': 'rice',
    'bröd': 'bread',
    'nudlar': 'noodles',
  };

  const found = new Set<string>();
  
  for (const offer of offers) {
    const nameLower = offer.name.toLowerCase();
    
    for (const [swedish, english] of Object.entries(ingredientMap)) {
      if (nameLower.includes(swedish)) {
        found.add(english);
      }
    }
  }

  return Array.from(found);
}

/**
 * Get recipe ID from URI (for deduplication)
 */
export function getRecipeId(recipe: EdamamRecipe): string {
  // URI format: http://www.edamam.com/ontologies/edamam.owl#recipe_xxxxx
  return recipe.uri.split('#recipe_')[1] || recipe.uri;
}

/**
 * Format recipe for display
 */
export function formatRecipeForDisplay(recipe: EdamamRecipe) {
  return {
    id: getRecipeId(recipe),
    name: recipe.label,
    image: recipe.images?.REGULAR?.url || recipe.image,
    thumbnail: recipe.images?.SMALL?.url || recipe.image,
    source: recipe.source,
    sourceUrl: recipe.url,
    servings: recipe.yield,
    cookTime: recipe.totalTime || null,
    calories: Math.round(recipe.calories / recipe.yield),
    ingredients: recipe.ingredientLines,
    cuisineType: recipe.cuisineType?.[0] || null,
    mealType: recipe.mealType?.[0] || null,
    dishType: recipe.dishType?.[0] || null,
    dietLabels: recipe.dietLabels,
    healthLabels: recipe.healthLabels,
  };
}
