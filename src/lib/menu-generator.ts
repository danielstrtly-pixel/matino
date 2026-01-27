/**
 * Menu Generator - Combines Spoonacular recipes with store offers
 */

import { 
  searchRecipes, 
  extractSearchableIngredients, 
  formatRecipeForDisplay,
  translateDislikes,
  SpoonacularRecipe,
  INTOLERANCES,
  DIETS,
  CUISINES,
} from './spoonacular';
import { chat } from './openrouter';

export interface UserPreferences {
  householdSize: number;
  hasChildren: boolean;
  likes: string[];
  dislikes: string[];
  healthLabels: string[];  // Maps to intolerances
  dietLabels: string[];    // Maps to diet
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
    id: number;
    name: string;
    nameSwedish?: string;
    image: string;
    sourceUrl: string;
    sourceName: string;
    servings: number;
    readyInMinutes: number;
    ingredients: string[];
    ingredientsSwedish?: string[];
    instructions: string[];
    instructionsSwedish?: string[];
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    dairyFree: boolean;
    cuisines: string[];
    summary?: string;
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
 * Translate recipe content to Swedish using OpenRouter
 */
async function translateRecipe(recipe: ReturnType<typeof formatRecipeForDisplay>): Promise<{
  nameSwedish: string;
  ingredientsSwedish: string[];
  instructionsSwedish: string[];
}> {
  try {
    const result = await chat([
      {
        role: 'system',
        content: `Du är en professionell matöversättare. Översätt receptet till svenska.
Konvertera amerikanska mått till metriska: cups → dl, oz → g, lbs → kg, tbsp → msk, tsp → tsk, fahrenheit → celsius.
Svara ENDAST i JSON-format exakt så här:
{
  "name": "Receptnamn på svenska",
  "ingredients": ["ingrediens 1 på svenska", "ingrediens 2"],
  "instructions": ["steg 1 på svenska", "steg 2"]
}`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          name: recipe.name,
          ingredients: recipe.ingredients.slice(0, 15), // Limit to avoid token overflow
          instructions: recipe.instructions.slice(0, 10),
        }),
      },
    ], { temperature: 0.3, json_mode: true, max_tokens: 2000 });

    const parsed = JSON.parse(result);
    return {
      nameSwedish: parsed.name || recipe.name,
      ingredientsSwedish: parsed.ingredients || recipe.ingredients,
      instructionsSwedish: parsed.instructions || recipe.instructions,
    };
  } catch (error) {
    console.error('[MenuGen] Translation error:', error);
    return {
      nameSwedish: recipe.name,
      ingredientsSwedish: recipe.ingredients,
      instructionsSwedish: recipe.instructions,
    };
  }
}

/**
 * Map Swedish preference labels to Spoonacular API parameters
 */
function mapPreferencesToSpoonacular(preferences: UserPreferences) {
  // Map health labels to intolerances
  const intolerances: string[] = [];
  for (const label of preferences.healthLabels) {
    const mapped = Object.entries(INTOLERANCES).find(([, v]) => v === label)?.[1];
    if (mapped) intolerances.push(mapped);
    // Also check if label itself is already an intolerance value
    if (Object.values(INTOLERANCES).includes(label as any)) {
      intolerances.push(label);
    }
  }

  // Map diet labels
  let diet: string | undefined;
  for (const label of preferences.dietLabels) {
    const mapped = Object.entries(DIETS).find(([, v]) => v === label)?.[1];
    if (mapped) {
      diet = mapped;
      break;
    }
    if (Object.values(DIETS).includes(label as any)) {
      diet = label;
      break;
    }
  }

  // Map cuisine types
  const cuisines: string[] = [];
  for (const cuisine of preferences.cuisineTypes) {
    const mapped = Object.entries(CUISINES).find(([, v]) => v === cuisine)?.[1];
    if (mapped) cuisines.push(mapped);
    if (Object.values(CUISINES).includes(cuisine as any)) {
      cuisines.push(cuisine);
    }
  }

  return { intolerances, diet, cuisines };
}

/**
 * Find which offers match recipe ingredients
 */
function findMatchingOffers(recipe: SpoonacularRecipe, offers: Offer[]): MenuItem['matchedOffers'] {
  const matches: MenuItem['matchedOffers'] = [];
  
  const ingredientNames = recipe.extendedIngredients?.map(ing => 
    ing.name.toLowerCase()
  ) || [];
  
  for (const offer of offers) {
    const offerName = offer.name.toLowerCase();
    
    for (const ingredient of ingredientNames) {
      // Check if offer matches ingredient
      if (offerName.includes(ingredient) || ingredient.includes(offerName.split(' ')[0])) {
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
  console.log('[MenuGen] Starting menu generation with Spoonacular');
  console.log('[MenuGen] Preferences:', JSON.stringify(preferences, null, 2));
  console.log('[MenuGen] Offers count:', offers.length);
  
  // Extract searchable ingredients from offers
  const offerIngredients = extractSearchableIngredients(offers);
  console.log('[MenuGen] Extracted ingredients from offers:', offerIngredients);
  
  // Map preferences to Spoonacular format
  const { intolerances, diet, cuisines } = mapPreferencesToSpoonacular(preferences);
  
  // Translate dislikes to English
  const excludeIngredients = translateDislikes(preferences.dislikes);
  
  // Calculate servings range based on household
  const minServings = Math.max(1, preferences.householdSize - 2);
  const maxServings = preferences.householdSize + 4;
  
  const menuItems: MenuItem[] = [];
  const usedRecipeIds = new Set<number>();
  
  const numDinners = preferences.mealsPerWeek;
  const numLunches = preferences.includeLunch ? Math.min(5, numDinners) : 0;
  
  // Build search queries from offer ingredients
  const searchQueries: string[] = [];
  if (offerIngredients.length > 0) {
    searchQueries.push(...offerIngredients.slice(0, 4));
  } else {
    searchQueries.push('chicken dinner', 'pasta', 'beef', 'fish');
  }
  
  // Fetch recipes
  const allRecipes: SpoonacularRecipe[] = [];
  
  for (const query of searchQueries) {
    try {
      const recipes = await searchRecipes({
        query,
        type: 'main course',
        intolerances: intolerances.length > 0 ? intolerances : undefined,
        diet: diet,
        cuisine: cuisines.length > 0 ? cuisines : undefined,
        excludeIngredients: excludeIngredients.length > 0 ? excludeIngredients : undefined,
        maxReadyTime: preferences.maxCookTime,
        minServings,
        maxServings,
        number: 10,
        sort: 'popularity',
        sortDirection: 'desc',
      });
      
      allRecipes.push(...recipes);
    } catch (error) {
      console.error(`[MenuGen] Error searching for "${query}":`, error);
    }
  }
  
  console.log(`[MenuGen] Found ${allRecipes.length} total recipes`);
  
  // Deduplicate
  const uniqueRecipes = allRecipes.filter(r => {
    if (usedRecipeIds.has(r.id)) return false;
    return true;
  });
  
  // Shuffle for variety
  const shuffled = [...uniqueRecipes].sort(() => Math.random() - 0.5);
  
  // Generate menu items
  for (let i = 0; i < numDinners && i < shuffled.length; i++) {
    const recipe = shuffled[i];
    usedRecipeIds.add(recipe.id);
    
    const formatted = formatRecipeForDisplay(recipe);
    const matchedOffers = findMatchingOffers(recipe, offers);
    
    // Translate recipe to Swedish
    const { nameSwedish, ingredientsSwedish, instructionsSwedish } = await translateRecipe(formatted);
    
    menuItems.push({
      day: DAYS_SWEDISH[i],
      dayIndex: i,
      meal: 'dinner',
      recipe: {
        id: recipe.id,
        name: formatted.name,
        nameSwedish,
        image: formatted.image,
        sourceUrl: formatted.sourceUrl,
        sourceName: formatted.sourceName,
        servings: formatted.servings,
        readyInMinutes: formatted.readyInMinutes,
        ingredients: formatted.ingredients,
        ingredientsSwedish,
        instructions: formatted.instructions,
        instructionsSwedish,
        vegetarian: formatted.vegetarian,
        vegan: formatted.vegan,
        glutenFree: formatted.glutenFree,
        dairyFree: formatted.dairyFree,
        cuisines: formatted.cuisines,
        summary: formatted.summary,
      },
      matchedOffers,
      estimatedSavings: matchedOffers.reduce((sum, o) => sum + (o.price * 0.2), 0),
    });
  }
  
  // Add lunches if enabled
  if (numLunches > 0) {
    const lunchRecipes = shuffled.filter(r => !usedRecipeIds.has(r.id));
    
    for (let i = 0; i < numLunches && i < lunchRecipes.length; i++) {
      const recipe = lunchRecipes[i];
      usedRecipeIds.add(recipe.id);
      
      const formatted = formatRecipeForDisplay(recipe);
      const matchedOffers = findMatchingOffers(recipe, offers);
      const { nameSwedish, ingredientsSwedish, instructionsSwedish } = await translateRecipe(formatted);
      
      menuItems.push({
        day: DAYS_SWEDISH[i],
        dayIndex: i,
        meal: 'lunch',
        recipe: {
          id: recipe.id,
          name: formatted.name,
          nameSwedish,
          image: formatted.image,
          sourceUrl: formatted.sourceUrl,
          sourceName: formatted.sourceName,
          servings: formatted.servings,
          readyInMinutes: formatted.readyInMinutes,
          ingredients: formatted.ingredients,
          ingredientsSwedish,
          instructions: formatted.instructions,
          instructionsSwedish,
          vegetarian: formatted.vegetarian,
          vegan: formatted.vegan,
          glutenFree: formatted.glutenFree,
          dairyFree: formatted.dairyFree,
          cuisines: formatted.cuisines,
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
  const usedRecipeIds = new Set(currentMenu.items.map(i => i.recipe.id));
  
  const offerIngredients = extractSearchableIngredients(offers);
  const query = offerIngredients.length > 0 
    ? offerIngredients[Math.floor(Math.random() * offerIngredients.length)]
    : ['chicken', 'beef', 'fish', 'pasta'][Math.floor(Math.random() * 4)];
  
  const { intolerances, diet, cuisines } = mapPreferencesToSpoonacular(preferences);
  const excludeIngredients = translateDislikes(preferences.dislikes);
  
  try {
    const recipes = await searchRecipes({
      query,
      type: 'main course',
      intolerances: intolerances.length > 0 ? intolerances : undefined,
      diet,
      cuisine: cuisines.length > 0 ? cuisines : undefined,
      excludeIngredients: excludeIngredients.length > 0 ? excludeIngredients : undefined,
      maxReadyTime: preferences.maxCookTime,
      minServings: Math.max(1, preferences.householdSize - 2),
      maxServings: preferences.householdSize + 4,
      number: 20,
      sort: 'random',
    });
    
    const newRecipe = recipes.find(r => !usedRecipeIds.has(r.id));
    
    if (!newRecipe) {
      return null;
    }
    
    const formatted = formatRecipeForDisplay(newRecipe);
    const matchedOffers = findMatchingOffers(newRecipe, offers);
    const { nameSwedish, ingredientsSwedish, instructionsSwedish } = await translateRecipe(formatted);
    
    return {
      day: DAYS_SWEDISH[dayIndex],
      dayIndex,
      meal,
      recipe: {
        id: newRecipe.id,
        name: formatted.name,
        nameSwedish,
        image: formatted.image,
        sourceUrl: formatted.sourceUrl,
        sourceName: formatted.sourceName,
        servings: formatted.servings,
        readyInMinutes: formatted.readyInMinutes,
        ingredients: formatted.ingredients,
        ingredientsSwedish,
        instructions: formatted.instructions,
        instructionsSwedish,
        vegetarian: formatted.vegetarian,
        vegan: formatted.vegan,
        glutenFree: formatted.glutenFree,
        dairyFree: formatted.dairyFree,
        cuisines: formatted.cuisines,
      },
      matchedOffers,
      estimatedSavings: matchedOffers.reduce((sum, o) => sum + (o.price * 0.2), 0),
    };
  } catch (error) {
    console.error('[MenuGen] Error regenerating meal:', error);
    return null;
  }
}
