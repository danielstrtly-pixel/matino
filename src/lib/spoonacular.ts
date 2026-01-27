/**
 * Spoonacular Recipe API client
 * Documentation: https://spoonacular.com/food-api/docs
 */

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

// Intolerances mapping (Swedish → Spoonacular)
export const INTOLERANCES = {
  'Laktos': 'dairy',
  'Gluten': 'gluten',
  'Ägg': 'egg',
  'Jordnötter': 'peanut',
  'Nötter': 'tree nut',
  'Soja': 'soy',
  'Fisk': 'seafood',
  'Skaldjur': 'shellfish',
  'Vete': 'wheat',
  'Sulfiter': 'sulfite',
} as const;

// Diet mapping (Swedish → Spoonacular)
export const DIETS = {
  'Vegetarisk': 'vegetarian',
  'Vegansk': 'vegan',
  'Glutenfri': 'gluten free',
  'Laktosfri': 'dairy free', // Note: This is a loose mapping
  'Pescetarian': 'pescetarian',
  'Paleo': 'paleo',
  'Primal': 'primal',
  'Whole30': 'whole30',
  'Keto': 'ketogenic',
  'FODMAP': 'fodmap friendly',
} as const;

// Cuisine types
export const CUISINES = {
  'Nordisk': 'nordic',
  'Svensk': 'nordic',
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
  'Thai': 'thai',
  'Vietnamesisk': 'vietnamese',
  'Koreansk': 'korean',
  'Spansk': 'spanish',
  'Brittisk': 'british',
  'Irländsk': 'irish',
  'Karibisk': 'caribbean',
} as const;

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  sourceName: string;
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
  veryHealthy: boolean;
  cheap: boolean;
  veryPopular: boolean;
  preparationMinutes: number;
  cookingMinutes: number;
  aggregateLikes: number;
  healthScore: number;
  pricePerServing: number;
  summary: string;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  extendedIngredients: {
    id: number;
    name: string;
    original: string;
    amount: number;
    unit: string;
    measures: {
      metric: { amount: number; unitShort: string; unitLong: string };
      us: { amount: number; unitShort: string; unitLong: string };
    };
  }[];
  analyzedInstructions?: {
    name: string;
    steps: {
      number: number;
      step: string;
      ingredients: { name: string }[];
      equipment: { name: string }[];
      length?: { number: number; unit: string };
    }[];
  }[];
  nutrition?: {
    nutrients: {
      name: string;
      amount: number;
      unit: string;
      percentOfDailyNeeds: number;
    }[];
  };
}

export interface RecipeSearchParams {
  query?: string;
  includeIngredients?: string[];
  excludeIngredients?: string[];
  diet?: string;
  intolerances?: string[];
  cuisine?: string[];
  type?: string;
  maxReadyTime?: number;
  minServings?: number;
  maxServings?: number;
  number?: number;
  offset?: number;
  instructionsRequired?: boolean;
  addRecipeInformation?: boolean;
  addRecipeInstructions?: boolean;
  sort?: string;
  sortDirection?: string;
}

export interface SearchResponse {
  results: SpoonacularRecipe[];
  offset: number;
  number: number;
  totalResults: number;
}

/**
 * Search for recipes using Spoonacular API
 */
export async function searchRecipes(params: RecipeSearchParams): Promise<SpoonacularRecipe[]> {
  if (!SPOONACULAR_API_KEY) {
    throw new Error('SPOONACULAR_API_KEY must be set');
  }

  const url = new URL(`${SPOONACULAR_BASE_URL}/recipes/complexSearch`);
  url.searchParams.set('apiKey', SPOONACULAR_API_KEY);
  
  // Always get recipe information, instructions, and nutrition
  url.searchParams.set('addRecipeInformation', 'true');
  url.searchParams.set('addRecipeInstructions', 'true');
  url.searchParams.set('addRecipeNutrition', 'true');
  url.searchParams.set('fillIngredients', 'true');
  
  // Require instructions
  url.searchParams.set('instructionsRequired', 'true');
  
  // Query
  if (params.query) {
    url.searchParams.set('query', params.query);
  }
  
  // Include ingredients (for offer matching)
  if (params.includeIngredients?.length) {
    url.searchParams.set('includeIngredients', params.includeIngredients.join(','));
  }
  
  // Exclude ingredients
  if (params.excludeIngredients?.length) {
    url.searchParams.set('excludeIngredients', params.excludeIngredients.join(','));
  }
  
  // Diet
  if (params.diet) {
    url.searchParams.set('diet', params.diet);
  }
  
  // Intolerances
  if (params.intolerances?.length) {
    url.searchParams.set('intolerances', params.intolerances.join(','));
  }
  
  // Cuisine
  if (params.cuisine?.length) {
    url.searchParams.set('cuisine', params.cuisine.join(','));
  }
  
  // Type (main course, side dish, etc.)
  if (params.type) {
    url.searchParams.set('type', params.type);
  }
  
  // Max ready time
  if (params.maxReadyTime) {
    url.searchParams.set('maxReadyTime', params.maxReadyTime.toString());
  }
  
  // Servings range
  if (params.minServings) {
    url.searchParams.set('minServings', params.minServings.toString());
  }
  if (params.maxServings) {
    url.searchParams.set('maxServings', params.maxServings.toString());
  }
  
  // Number of results
  url.searchParams.set('number', (params.number || 10).toString());
  
  // Offset for pagination
  if (params.offset) {
    url.searchParams.set('offset', params.offset.toString());
  }
  
  // Sorting
  if (params.sort) {
    url.searchParams.set('sort', params.sort);
    url.searchParams.set('sortDirection', params.sortDirection || 'desc');
  }

  console.log('[Spoonacular] Searching:', url.toString().replace(SPOONACULAR_API_KEY, '***'));

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    console.error('[Spoonacular] Error:', response.status, error);
    throw new Error(`Spoonacular API error: ${response.status}`);
  }

  const data: SearchResponse = await response.json();
  
  console.log(`[Spoonacular] Found ${data.totalResults} recipes, returning ${data.results.length}`);
  
  return data.results;
}

/**
 * Get detailed recipe information including instructions
 */
export async function getRecipeDetails(recipeId: number): Promise<SpoonacularRecipe> {
  if (!SPOONACULAR_API_KEY) {
    throw new Error('SPOONACULAR_API_KEY must be set');
  }

  const url = `${SPOONACULAR_BASE_URL}/recipes/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=false`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to get recipe ${recipeId}: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get analyzed instructions for a recipe
 */
export async function getRecipeInstructions(recipeId: number): Promise<SpoonacularRecipe['analyzedInstructions']> {
  if (!SPOONACULAR_API_KEY) {
    throw new Error('SPOONACULAR_API_KEY must be set');
  }

  const url = `${SPOONACULAR_BASE_URL}/recipes/${recipeId}/analyzedInstructions?apiKey=${SPOONACULAR_API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to get instructions for ${recipeId}: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Extract main ingredients from offers for recipe search
 */
export function extractSearchableIngredients(offers: { name: string }[]): string[] {
  const ingredientMap: Record<string, string> = {
    // Proteins
    'kycklingfilé': 'chicken',
    'kyckling': 'chicken',
    'kycklingben': 'chicken',
    'kycklingklubba': 'chicken',
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
    'fläskkarré': 'pork',
    'fläskkotlett': 'pork chop',
    'entrecôte': 'steak',
    'ryggbiff': 'steak',
    'högrev': 'beef',
    'biff': 'beef',
    'rostbiff': 'roast beef',
    'bog': 'pork shoulder',
    // Produce
    'tomat': 'tomato',
    'potatis': 'potato',
    'lök': 'onion',
    'vitlök': 'garlic',
    'paprika': 'bell pepper',
    'broccoli': 'broccoli',
    'morot': 'carrot',
    'gurka': 'cucumber',
    'sallad': 'salad',
    'spenat': 'spinach',
    'champinjoner': 'mushroom',
    'svamp': 'mushroom',
    'zucchini': 'zucchini',
    'aubergine': 'eggplant',
    // Dairy
    'ost': 'cheese',
    'grädde': 'cream',
    'mjölk': 'milk',
    'smör': 'butter',
    'ägg': 'egg',
    // Carbs
    'pasta': 'pasta',
    'ris': 'rice',
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
 * Translate dislikes from Swedish to English
 */
export function translateDislikes(dislikes: string[]): string[] {
  const translations: Record<string, string> = {
    'koriander': 'cilantro',
    'lever': 'liver',
    'svamp': 'mushroom',
    'champinjoner': 'mushroom',
    'oliver': 'olive',
    'skaldjur': 'shellfish',
    'räkor': 'shrimp',
    'anjovis': 'anchovy',
    'kapris': 'capers',
    'selleri': 'celery',
    'rödbetor': 'beet',
    'fänkål': 'fennel',
    'bläckfisk': 'octopus',
    'inälvor': 'organ meat',
  };
  
  return dislikes.map(d => translations[d.toLowerCase()] || d);
}

/**
 * Extract nutrition info from recipe
 */
function extractNutrition(recipe: SpoonacularRecipe) {
  const nutrients = recipe.nutrition?.nutrients || [];
  
  const findNutrient = (name: string) => {
    const n = nutrients.find(n => n.name.toLowerCase() === name.toLowerCase());
    return n ? Math.round(n.amount) : null;
  };
  
  return {
    calories: findNutrient('Calories'),
    protein: findNutrient('Protein'),
    fat: findNutrient('Fat'),
    carbs: findNutrient('Carbohydrates'),
    fiber: findNutrient('Fiber'),
    sugar: findNutrient('Sugar'),
  };
}

/**
 * Format recipe for display (with Swedish translations where possible)
 */
export function formatRecipeForDisplay(recipe: SpoonacularRecipe) {
  // Get instructions as a single array of steps
  const instructions = recipe.analyzedInstructions?.[0]?.steps.map(s => s.step) || [];
  
  // Get ingredients in metric
  const ingredients = recipe.extendedIngredients?.map(ing => {
    const metric = ing.measures?.metric;
    if (metric && metric.amount && metric.unitShort) {
      return `${metric.amount} ${metric.unitShort} ${ing.name}`;
    }
    return ing.original;
  }) || [];

  // Extract nutrition
  const nutrition = extractNutrition(recipe);

  return {
    id: recipe.id,
    name: recipe.title,
    image: recipe.image,
    sourceUrl: recipe.sourceUrl,
    sourceName: recipe.sourceName,
    servings: recipe.servings,
    readyInMinutes: recipe.readyInMinutes,
    preparationMinutes: recipe.preparationMinutes,
    cookingMinutes: recipe.cookingMinutes,
    healthScore: recipe.healthScore,
    pricePerServing: recipe.pricePerServing,
    vegetarian: recipe.vegetarian,
    vegan: recipe.vegan,
    glutenFree: recipe.glutenFree,
    dairyFree: recipe.dairyFree,
    cuisines: recipe.cuisines,
    dishTypes: recipe.dishTypes,
    diets: recipe.diets,
    ingredients,
    instructions,
    summary: recipe.summary?.replace(/<[^>]*>/g, '') || '', // Strip HTML
    nutrition,
  };
}
