/**
 * AI Meal Suggester
 * Generates meal NAME suggestions (not full recipes)
 * Recipes are sourced from real recipe sites via recipe-search.ts
 */

import { chat } from './openrouter';
import { searchRecipes, RecipeLink, RecipeSourceId } from './recipe-search';

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
  interviewProfile?: {
    currentMeals?: string;
    wantedChanges?: string;
    restrictions?: string[];
    luxuryDays?: string;
    quickDays?: string;
    preferences?: string;
    menuPrompt?: string;
  } | null;
}

export interface Offer {
  id: string;
  name: string;
  brand?: string;
  offer_price: number;
  original_price?: number;
  store_name: string;
  chain_id: string;
}

export interface MealSuggestion {
  name: string;
  description: string;
  tags: string[];
  usesOffers: string[]; // names of offers this meal could use
}

export interface MenuItemWithRecipes {
  day: string;
  dayIndex: number;
  meal: 'lunch' | 'dinner';
  suggestion: MealSuggestion;
  recipes: RecipeLink[];
  matchedOffers: {
    offerId: string;
    offerName: string;
    price: number;
    store: string;
  }[];
}

export interface GeneratedMenu {
  items: MenuItemWithRecipes[];
  generatedAt: string;
  model: string;
}

const DAYS_SWEDISH = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

/**
 * Generate meal suggestions + find real recipes for each
 */
export async function generateMenu(
  preferences: UserPreferences,
  offers: Offer[],
  recipeSources?: RecipeSourceId[]
): Promise<GeneratedMenu> {
  console.log('[MealSuggester] Starting meal suggestion generation');

  // Step 1: AI generates meal names
  const suggestions = await suggestMeals(preferences, offers);

  // Step 2: Search for real recipes sequentially (Brave free tier: 1 req/sec)
  console.log(`[MealSuggester] Searching recipes for ${suggestions.length} meals...`);
  const recipeResults: Awaited<ReturnType<typeof searchRecipes>>[] = [];
  for (let i = 0; i < suggestions.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1100));
    recipeResults.push(await searchRecipes(suggestions[i].name, recipeSources));
  }

  // Step 3: Combine into menu items
  const items: MenuItemWithRecipes[] = suggestions.map((suggestion, i) => {
    // Match with offers
    const matchedOffers = matchOffersToMeal(suggestion, offers);

    return {
      day: DAYS_SWEDISH[i],
      dayIndex: i,
      meal: 'dinner' as const,
      suggestion,
      recipes: recipeResults[i],
      matchedOffers,
    };
  });

  console.log(`[MealSuggester] Generated ${items.length} meal suggestions with recipes`);

  return {
    items,
    generatedAt: new Date().toISOString(),
    model: 'google/gemini-3-flash-preview',
  };
}

/**
 * Regenerate a single meal suggestion with recipes
 */
export async function regenerateMeal(
  dayIndex: number,
  meal: 'lunch' | 'dinner',
  preferences: UserPreferences,
  offers: Offer[],
  existingMealNames: string[],
  userPreference?: string | null,
  feedbackHistory?: { reason?: string; preference?: string }[],
  recipeSources?: RecipeSourceId[]
): Promise<MenuItemWithRecipes | null> {
  try {
    const suggestion = await suggestOneMeal(
      preferences,
      offers,
      existingMealNames,
      userPreference,
      feedbackHistory
    );

    if (!suggestion) return null;

    const recipes = await searchRecipes(suggestion.name, recipeSources);
    const matchedOffers = matchOffersToMeal(suggestion, offers);

    return {
      day: DAYS_SWEDISH[dayIndex],
      dayIndex,
      meal,
      suggestion,
      recipes,
      matchedOffers,
    };
  } catch (error) {
    console.error('[MealSuggester] Regenerate error:', error);
    return null;
  }
}

/**
 * AI suggests meal names (not full recipes!)
 */
async function suggestMeals(
  preferences: UserPreferences,
  offers: Offer[]
): Promise<MealSuggestion[]> {
  const offersSummary = offers.slice(0, 30).map(o =>
    `- ${o.name} (${o.offer_price} kr, ${o.store_name})`
  ).join('\n');

  const restrictions = [
    ...preferences.healthLabels,
    ...preferences.dietLabels,
    ...(preferences.interviewProfile?.restrictions || []),
  ].filter(Boolean);

  const ip = preferences.interviewProfile;
  const hasInterview = ip?.menuPrompt || ip?.preferences;

  const interviewContext = hasInterview ? `
MATPROFIL (från intervju med användaren):
${ip?.menuPrompt || ip?.preferences || ''}
${ip?.currentMeals ? `RÄTTER DE BRUKAR ÄTA OCH GILLAR: ${ip.currentMeals}` : ''}
${ip?.wantedChanges ? `ÖNSKADE FÖRÄNDRINGAR: ${ip.wantedChanges}` : ''}
${ip?.luxuryDays ? `LYXDAGAR: ${ip.luxuryDays}` : ''}
${ip?.quickDays ? `SNABBA DAGAR: ${ip.quickDays}` : ''}
` : '';

  const prompt = `Du är en svensk måltidsplanerare. Föreslå ${preferences.mealsPerWeek} middagsrätter för veckan.

VIKTIGT: Du ska BARA föreslå rättsnamn och korta beskrivningar. INGA recept, ingredienslistor eller instruktioner.

HUSHÅLL:
- ${preferences.householdSize} personer${preferences.hasChildren ? ' (inkl. barn)' : ''}
- Max tillagningstid: ${preferences.maxCookTime} minuter
${interviewContext}
KOSTRESTRIKTIONER:
${restrictions.length > 0 ? [...new Set(restrictions)].map(r => `- ${r}`).join('\n') : '- Inga'}

OGILLAR: ${preferences.dislikes.join(', ') || 'inget'}
GILLAR: ${preferences.likes.join(', ') || 'allt'}
MATKULTURER: ${preferences.cuisineTypes.join(', ') || 'varierat'}

VECKANS ERBJUDANDEN (försök föreslå rätter som använder dessa):
${offersSummary || 'Inga erbjudanden tillgängliga'}

REGLER:
1. VARIATION: olika proteinkällor, kolhydrater, tillagning och matkulturer
2. Fredagar kan vara "fredagsmys" (tacos, pizza, hamburgare)
3. Ange vilka erbjudanden varje rätt kan använda
4. Föreslå välkända, populära rätter som är lätta att hitta recept på
5. Rättsnamnet ska vara sökbart (t.ex. "Kycklinggryta med curry" inte "Mormors speciella gryta")

Svara i JSON:
{
  "meals": [
    {
      "name": "Kycklinggryta med curry",
      "description": "Krämig och smakrik gryta med kyckling och curry. Serveras med ris.",
      "tags": ["gryta", "kyckling", "curry", "barnvänligt"],
      "usesOffers": ["Kycklingfilé", "Grädde"]
    }
  ]
}`;

  const result = await chat([
    {
      role: 'system',
      content: 'Du är en svensk måltidsplanerare. Föreslå bara rättsnamn, inte recept. Svara i JSON.',
    },
    { role: 'user', content: prompt },
  ], {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.8,
    max_tokens: 1500,
    json_mode: true,
  });

  const parsed = JSON.parse(result);
  return (parsed.meals || []).slice(0, preferences.mealsPerWeek);
}

/**
 * Suggest one replacement meal
 */
async function suggestOneMeal(
  preferences: UserPreferences,
  offers: Offer[],
  existingNames: string[],
  userPreference?: string | null,
  feedbackHistory?: { reason?: string; preference?: string }[]
): Promise<MealSuggestion | null> {
  const offersSummary = offers.slice(0, 15).map(o =>
    `- ${o.name} (${o.offer_price} kr)`
  ).join('\n');

  let feedbackContext = '';
  if (userPreference) {
    feedbackContext += `\nANVÄNDARENS ÖNSKEMÅL: ${userPreference}\n`;
  }
  if (feedbackHistory?.length) {
    feedbackContext += '\nTIDIGARE FEEDBACK:\n';
    for (const fb of feedbackHistory.slice(0, 5)) {
      if (fb.reason) feedbackContext += `- Ogillade: ${fb.reason}\n`;
      if (fb.preference) feedbackContext += `- Föredrar: ${fb.preference}\n`;
    }
  }

  const prompt = `Föreslå EN ny middagsrätt.
${feedbackContext}
Max tid: ${preferences.maxCookTime} min
Ogillar: ${preferences.dislikes.join(', ') || 'inget'}
Undvik (redan i menyn): ${existingNames.join(', ')}

Erbjudanden: ${offersSummary}

Svara i JSON:
{
  "name": "Rätt namn",
  "description": "Kort beskrivning",
  "tags": ["tag1", "tag2"],
  "usesOffers": ["Erbjudande 1"]
}`;

  const result = await chat([
    { role: 'system', content: 'Föreslå ett rättsnamn, inte recept. Svara i JSON.' },
    { role: 'user', content: prompt },
  ], {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.9,
    max_tokens: 500,
    json_mode: true,
  });

  return JSON.parse(result);
}

/**
 * Match offers to a meal suggestion
 */
function matchOffersToMeal(
  suggestion: MealSuggestion,
  offers: Offer[]
): MenuItemWithRecipes['matchedOffers'] {
  const matched: MenuItemWithRecipes['matchedOffers'] = [];

  for (const offerName of suggestion.usesOffers || []) {
    const offer = offers.find(o =>
      o.name.toLowerCase().includes(offerName.toLowerCase()) ||
      offerName.toLowerCase().includes(o.name.toLowerCase().split(' ')[0])
    );
    if (offer && !matched.find(m => m.offerId === offer.id)) {
      matched.push({
        offerId: offer.id,
        offerName: offer.name,
        price: offer.offer_price,
        store: offer.store_name,
      });
    }
  }

  return matched;
}
