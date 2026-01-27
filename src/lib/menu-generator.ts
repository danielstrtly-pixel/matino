/**
 * Menu Generator - Combines Edamam recipes with store offers
 */

import { 
  searchRecipes, 
  extractSearchableIngredients, 
  formatRecipeForDisplay,
  EdamamRecipe 
} from './edamam';
import { chat } from './openrouter';

export interface UserPreferences {
  householdSize: number;
  hasChildren: boolean;
  likes: string[];
  dislikes: string[];
  healthLabels: string[];
  dietLabels: string[];
  cuisineTypes: string[];
  mealsPerWeek: number;
  maxCookTime: number;
  includeLunch: boolean;
}

export interface Offer {
  id: string;
  name: string;
  brand?: string;
  offer_price: number;
  original_price?: number;
  store_name: string;
  chain_id: string;
  image_url?: string;
}

export interface MenuItem {
  day: string;
  dayIndex: number;
  meal: 'lunch' | 'dinner';
  recipe: {
    id: string;
    name: string;
    nameSwedish?: string;
    image: string;
    source: string;
    sourceUrl: string;
    servings: number;
    cookTime: number | null;
    calories: number;
    ingredients: string[];
    cuisineType: string | null;
    dietLabels: string[];
    healthLabels: string[];
  };
  matchedOffers: {
    offerId: string;
    offerName: string;
    price: number;
    store: string;
  }[];
  estimatedSavings?: number;
}

export interface GeneratedMenu {
  items: MenuItem[];
  totalEstimatedSavings: number;
  generatedAt: string;
}

const DAYS_SWEDISH = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

/**
 * Map Swedish dislikes to English for Edamam excluded parameter
 */
const DISLIKE_TRANSLATIONS: Record<string, string> = {
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
  'lakrits': 'licorice',
  'bläckfisk': 'octopus',
  'inälvor': 'organ meat',
};

function translateDislikes(dislikes: string[]): string[] {
  return dislikes.map(d => {
    const lower = d.toLowerCase();
    return DISLIKE_TRANSLATIONS[lower] || d;
  });
}

/**
 * Translate recipe name to Swedish using OpenRouter
 */
async function translateRecipeName(name: string): Promise<string> {
  try {
    const result = await chat([
      {
        role: 'system',
        content: 'Översätt receptnamnet till svenska. Svara endast med översättningen, inget annat.',
      },
      { role: 'user', content: name },
    ], { temperature: 0.3, max_tokens: 100 });
    
    return result.trim();
  } catch (error) {
    console.error('Translation error:', error);
    return name; // Fallback to English
  }
}

/**
 * Find which offers match recipe ingredients
 */
function findMatchingOffers(recipe: EdamamRecipe, offers: Offer[]): MenuItem['matchedOffers'] {
  const matches: MenuItem['matchedOffers'] = [];
  
  // Common ingredient keywords to match
  const ingredientKeywords = recipe.ingredients.map(ing => 
    ing.food.toLowerCase()
  );
  
  for (const offer of offers) {
    const offerName = offer.name.toLowerCase();
    
    for (const keyword of ingredientKeywords) {
      // Check if offer name contains ingredient keyword
      if (offerName.includes(keyword) || keyword.includes(offerName.split(' ')[0])) {
        // Avoid duplicates
        if (!matches.find(m => m.offerId === offer.id)) {
          matches.push({
            offerId: offer.id,
            offerName: offer.name,
            price: offer.offer_price,
            store: offer.store_name,
          });
        }
        break;
      }
    }
  }
  
  return matches;
}

/**
 * Generate a weekly menu based on preferences and offers
 */
export async function generateMenu(
  preferences: UserPreferences,
  offers: Offer[]
): Promise<GeneratedMenu> {
  console.log('[MenuGen] Starting menu generation');
  console.log('[MenuGen] Preferences:', JSON.stringify(preferences, null, 2));
  console.log('[MenuGen] Offers count:', offers.length);
  
  // Extract searchable ingredients from offers
  const offerIngredients = extractSearchableIngredients(offers);
  console.log('[MenuGen] Extracted ingredients from offers:', offerIngredients);
  
  // Translate dislikes to English
  const excludedIngredients = translateDislikes(preferences.dislikes);
  
  // Generate menu items
  const menuItems: MenuItem[] = [];
  const usedRecipeIds = new Set<string>();
  
  // Determine how many recipes we need
  const numDinners = preferences.mealsPerWeek;
  const numLunches = preferences.includeLunch ? Math.min(5, numDinners) : 0;
  
  // Search for recipes with different ingredient combinations to get variety
  const searchQueries: string[] = [];
  
  // Primary searches: Use offer ingredients
  if (offerIngredients.length > 0) {
    // Create different combinations of offer ingredients
    for (let i = 0; i < Math.min(3, offerIngredients.length); i++) {
      searchQueries.push(offerIngredients[i]);
    }
    // Also try combinations
    if (offerIngredients.length >= 2) {
      searchQueries.push(`${offerIngredients[0]} ${offerIngredients[1]}`);
    }
  }
  
  // Fallback searches if no offers
  if (searchQueries.length === 0) {
    searchQueries.push('chicken', 'beef', 'salmon', 'pasta', 'vegetable');
  }
  
  // Fetch recipes for each query
  const allRecipes: EdamamRecipe[] = [];
  
  for (const query of searchQueries) {
    try {
      const recipes = await searchRecipes({
        query,
        healthLabels: preferences.healthLabels.length > 0 ? preferences.healthLabels : undefined,
        dietLabels: preferences.dietLabels.length > 0 ? preferences.dietLabels : undefined,
        cuisineTypes: preferences.cuisineTypes.length > 0 ? preferences.cuisineTypes : undefined,
        maxTime: preferences.maxCookTime,
        excluded: excludedIngredients.length > 0 ? excludedIngredients : undefined,
        mealType: 'lunch/dinner',
        maxResults: 10,
      });
      
      allRecipes.push(...recipes);
    } catch (error) {
      console.error(`[MenuGen] Error searching for "${query}":`, error);
    }
  }
  
  console.log(`[MenuGen] Found ${allRecipes.length} total recipes`);
  
  // Deduplicate and shuffle
  const uniqueRecipes = allRecipes.filter(r => {
    const id = r.uri.split('#recipe_')[1];
    if (usedRecipeIds.has(id)) return false;
    return true;
  });
  
  // Shuffle for variety
  const shuffled = [...uniqueRecipes].sort(() => Math.random() - 0.5);
  
  // Pick recipes for dinners
  for (let i = 0; i < numDinners && i < shuffled.length; i++) {
    const recipe = shuffled[i];
    const recipeId = recipe.uri.split('#recipe_')[1];
    usedRecipeIds.add(recipeId);
    
    const formatted = formatRecipeForDisplay(recipe);
    const matchedOffers = findMatchingOffers(recipe, offers);
    
    // Translate recipe name (batch this for efficiency)
    const nameSwedish = await translateRecipeName(recipe.label);
    
    menuItems.push({
      day: DAYS_SWEDISH[i],
      dayIndex: i,
      meal: 'dinner',
      recipe: {
        ...formatted,
        nameSwedish,
      },
      matchedOffers,
      estimatedSavings: matchedOffers.reduce((sum, o) => sum + (o.price * 0.2), 0), // Rough estimate
    });
  }
  
  // Pick recipes for lunches if enabled
  if (numLunches > 0) {
    const lunchRecipes = shuffled.filter(r => !usedRecipeIds.has(r.uri.split('#recipe_')[1]));
    
    for (let i = 0; i < numLunches && i < lunchRecipes.length; i++) {
      const recipe = lunchRecipes[i];
      const recipeId = recipe.uri.split('#recipe_')[1];
      usedRecipeIds.add(recipeId);
      
      const formatted = formatRecipeForDisplay(recipe);
      const matchedOffers = findMatchingOffers(recipe, offers);
      const nameSwedish = await translateRecipeName(recipe.label);
      
      menuItems.push({
        day: DAYS_SWEDISH[i],
        dayIndex: i,
        meal: 'lunch',
        recipe: {
          ...formatted,
          nameSwedish,
        },
        matchedOffers,
      });
    }
  }
  
  // Sort by day and meal
  menuItems.sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    return a.meal === 'lunch' ? -1 : 1;
  });
  
  const totalSavings = menuItems.reduce((sum, item) => sum + (item.estimatedSavings || 0), 0);
  
  console.log(`[MenuGen] Generated ${menuItems.length} menu items`);
  
  return {
    items: menuItems,
    totalEstimatedSavings: Math.round(totalSavings),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Regenerate a single meal (swap)
 */
export async function regenerateMeal(
  currentMenu: GeneratedMenu,
  dayIndex: number,
  meal: 'lunch' | 'dinner',
  preferences: UserPreferences,
  offers: Offer[]
): Promise<MenuItem | null> {
  // Get IDs of recipes already in menu
  const usedRecipeIds = new Set(currentMenu.items.map(i => i.recipe.id));
  
  // Extract ingredients from offers
  const offerIngredients = extractSearchableIngredients(offers);
  const query = offerIngredients.length > 0 
    ? offerIngredients[Math.floor(Math.random() * offerIngredients.length)]
    : ['chicken', 'beef', 'fish', 'pasta'][Math.floor(Math.random() * 4)];
  
  const excludedIngredients = translateDislikes(preferences.dislikes);
  
  try {
    const recipes = await searchRecipes({
      query,
      healthLabels: preferences.healthLabels.length > 0 ? preferences.healthLabels : undefined,
      dietLabels: preferences.dietLabels.length > 0 ? preferences.dietLabels : undefined,
      cuisineTypes: preferences.cuisineTypes.length > 0 ? preferences.cuisineTypes : undefined,
      maxTime: preferences.maxCookTime,
      excluded: excludedIngredients.length > 0 ? excludedIngredients : undefined,
      mealType: 'lunch/dinner',
      maxResults: 20,
    });
    
    // Find a recipe not already in the menu
    const newRecipe = recipes.find(r => {
      const id = r.uri.split('#recipe_')[1];
      return !usedRecipeIds.has(id);
    });
    
    if (!newRecipe) {
      return null;
    }
    
    const formatted = formatRecipeForDisplay(newRecipe);
    const matchedOffers = findMatchingOffers(newRecipe, offers);
    const nameSwedish = await translateRecipeName(newRecipe.label);
    
    return {
      day: DAYS_SWEDISH[dayIndex],
      dayIndex,
      meal,
      recipe: {
        ...formatted,
        nameSwedish,
      },
      matchedOffers,
      estimatedSavings: matchedOffers.reduce((sum, o) => sum + (o.price * 0.2), 0),
    };
  } catch (error) {
    console.error('[MenuGen] Error regenerating meal:', error);
    return null;
  }
}
