/**
 * AI Meal Suggester
 * Two modes:
 *   "taste" — Preference-first: delicious meals, offers shown as bonus
 *   "budget" — Offer-first: build meals around this week's deals
 *
 * Recipes are sourced from real Swedish recipe sites via recipe-search.ts
 */

import { chat } from './openrouter';
import { searchRecipes, RecipeLink, RecipeSourceId } from './recipe-search';

export type MenuMode = 'taste' | 'budget';

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
  searchQuery: string; // short, optimized for recipe search
  description: string;
  tags: string[];
  usesOffers: string[];
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
  mode: MenuMode;
}

const DAYS_SWEDISH = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

/**
 * Generate meal suggestions + find real recipes for each
 */
export async function generateMenu(
  preferences: UserPreferences,
  offers: Offer[],
  mode: MenuMode = 'taste',
  recipeSources?: RecipeSourceId[]
): Promise<GeneratedMenu> {
  console.log(`[MealSuggester] Generating menu in "${mode}" mode`);

  // Step 1: AI generates meal names
  const suggestions = await suggestMeals(preferences, offers, mode);

  // Step 2: Search for real recipes sequentially (Brave free tier: 1 req/sec)
  console.log(`[MealSuggester] Searching recipes for ${suggestions.length} meals...`);
  const recipeResults: RecipeLink[][] = [];
  for (let i = 0; i < suggestions.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1100));
    // Use searchQuery (short, optimized) instead of full name
    recipeResults.push(await searchRecipes(suggestions[i].searchQuery, recipeSources));
  }

  // Step 3: Combine into menu items
  const items: MenuItemWithRecipes[] = suggestions.map((suggestion, i) => ({
    day: DAYS_SWEDISH[i],
    dayIndex: i,
    meal: 'dinner' as const,
    suggestion,
    recipes: recipeResults[i],
    matchedOffers: matchOffersToMeal(suggestion, offers),
  }));

  console.log(`[MealSuggester] Generated ${items.length} meal suggestions with recipes`);

  return {
    items,
    generatedAt: new Date().toISOString(),
    model: 'google/gemini-3-flash-preview',
    mode,
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
  mode: MenuMode = 'taste',
  userPreference?: string | null,
  feedbackHistory?: { reason?: string; preference?: string }[],
  recipeSources?: RecipeSourceId[]
): Promise<MenuItemWithRecipes | null> {
  try {
    const suggestion = await suggestOneMeal(
      preferences, offers, existingMealNames, mode, userPreference, feedbackHistory
    );
    if (!suggestion) return null;

    const recipes = await searchRecipes(suggestion.searchQuery, recipeSources);
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

// ─── AI Prompts ──────────────────────────────────────────────

/**
 * Step 1: AI curates the best offers for menu building
 * Sends ALL offers, asks AI to pick the 30-50 best cooking ingredients.
 * Filters out non-food, candy, snacks, drinks etc.
 */
async function curateOffers(offers: Offer[]): Promise<Offer[]> {
  if (offers.length <= 40) return offers; // No need to curate small lists

  console.log(`[MealSuggester] Curating ${offers.length} offers...`);

  const allOffers = offers.map((o, i) =>
    `${i}: ${o.name} (${o.offer_price} kr, ${o.store_name})`
  ).join('\n');

  const prompt = `Du får en lista med ${offers.length} erbjudanden från matbutiker.
Välj ut de 30-50 BÄSTA erbjudandena för att bygga attraktiva middagsrätter.

PRIORITERA:
- Proteinkällor (kött, fisk, kyckling, ägg, bönor)
- Grönsaker och rotfrukter
- Mejeriprodukter (grädde, ost, crème fraiche)
- Basvaror (pasta, ris, potatis)
- Kryddor och såser

IGNORERA:
- Godis, chips, snacks
- Läsk, juice, alkohol
- Hygienartiklar och non-food
- Frukostflingor, müsli
- Kaffe, te

Svara med en JSON-array av indexnummer:
{"selected": [0, 3, 7, 12, ...]}

ERBJUDANDEN:
${allOffers}`;

  try {
    const result = await chat([
      { role: 'system', content: 'Välj de bästa matlagningsingredienserna. Svara i JSON.' },
      { role: 'user', content: prompt },
    ], {
      model: 'google/gemini-3-flash-preview',
      temperature: 0.3,
      max_tokens: 1000,
      json_mode: true,
    });

    const parsed = JSON.parse(result);
    const indices: number[] = parsed.selected || [];
    const curated = indices
      .filter(i => i >= 0 && i < offers.length)
      .map(i => offers[i]);

    console.log(`[MealSuggester] Curated ${curated.length} offers from ${offers.length}`);
    return curated.length > 0 ? curated : offers.slice(0, 40);
  } catch (error) {
    console.error('[MealSuggester] Curation error:', error);
    return offers.slice(0, 40);
  }
}

function buildProfileContext(preferences: UserPreferences): string {
  const restrictions = [
    ...preferences.healthLabels,
    ...preferences.dietLabels,
    ...(preferences.interviewProfile?.restrictions || []),
  ].filter(Boolean);

  const ip = preferences.interviewProfile;
  const hasInterview = ip?.menuPrompt || ip?.preferences;

  let ctx = `HUSHÅLL: ${preferences.householdSize} personer${preferences.hasChildren ? ' (inkl. barn)' : ''}
Max tillagningstid: ${preferences.maxCookTime} minuter
Kostrestriktioner: ${restrictions.length > 0 ? [...new Set(restrictions)].join(', ') : 'Inga'}
Ogillar: ${preferences.dislikes.join(', ') || 'inget'}
Gillar: ${preferences.likes.join(', ') || 'allt'}
Matkulturer: ${preferences.cuisineTypes.join(', ') || 'varierat'}`;

  if (hasInterview) {
    ctx += `\n\nMATPROFIL (från intervju):
${ip?.menuPrompt || ip?.preferences || ''}`;
    if (ip?.currentMeals) ctx += `\nRätter de brukar äta: ${ip.currentMeals}`;
    if (ip?.wantedChanges) ctx += `\nÖnskade förändringar: ${ip.wantedChanges}`;
    if (ip?.luxuryDays) ctx += `\nLyxdagar: ${ip.luxuryDays}`;
    if (ip?.quickDays) ctx += `\nSnabba dagar: ${ip.quickDays}`;
  }

  return ctx;
}

/**
 * AI suggests meals — mode determines the prompt strategy
 */
async function suggestMeals(
  preferences: UserPreferences,
  offers: Offer[],
  mode: MenuMode
): Promise<MealSuggestion[]> {
  const profileContext = buildProfileContext(preferences);

  // Step 1: Curate offers — AI picks the best cooking ingredients
  const curatedOffers = await curateOffers(offers);
  const offersSummary = curatedOffers.map(o =>
    `- ${o.name} (${o.offer_price} kr, ${o.store_name})`
  ).join('\n');

  const prompt = mode === 'taste'
    ? buildTastePrompt(preferences.mealsPerWeek, profileContext, offersSummary)
    : buildBudgetPrompt(preferences.mealsPerWeek, profileContext, offersSummary);

  const result = await chat([
    {
      role: 'system',
      content: 'Du är en svensk måltidsplanerare. Föreslå populära, välkända rätter. Svara i JSON.',
    },
    { role: 'user', content: prompt },
  ], {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.8,
    max_tokens: 2000,
    json_mode: true,
  });

  const parsed = JSON.parse(result);
  return (parsed.meals || []).slice(0, preferences.mealsPerWeek);
}

function buildTastePrompt(mealsPerWeek: number, profile: string, offers: string): string {
  return `Föreslå ${mealsPerWeek} middagsrätter för veckan. Fokus: GODA, ATTRAKTIVA rätter som användaren verkligen vill äta.

${profile}

VECKANS ERBJUDANDEN (visa vilka som matchar, men låt inte erbjudanden styra valet):
${offers || 'Inga erbjudanden tillgängliga'}

REGLER:
1. Välj rätter som är POPULÄRA och BEPRÖVADE — rätter folk faktiskt lagar hemma
2. VARIATION: olika proteinkällor (kyckling, fisk, köttfärs, fläsk, vegetariskt), tillagning och kulturer
3. Fredagar = fredagsmys (tacos, pizza, hamburgare, fish & chips)
4. "searchQuery" ska vara KORT och generiskt (2-3 ord max) för att hitta recept:
   - BRA: "kycklinggryta curry", "laxpasta", "köttfärssås"
   - DÅLIGT: "krämig kycklinggryta med soltorkade tomater och parmesan"
5. "usesOffers" — lista ingredienser som MATCHAR erbjudanden (om några)

Svara i JSON:
{
  "meals": [
    {
      "name": "Krämig kycklingpasta",
      "searchQuery": "kycklingpasta",
      "description": "Snabb och krämig pasta med kyckling och vitlökssås.",
      "tags": ["pasta", "kyckling", "snabbt", "barnvänligt"],
      "usesOffers": ["Kycklingfilé"]
    }
  ]
}`;
}

function buildBudgetPrompt(mealsPerWeek: number, profile: string, offers: string): string {
  return `Föreslå ${mealsPerWeek} middagsrätter för veckan. Fokus: SPARA PENGAR genom att bygga menyn kring veckans erbjudanden.

${profile}

VECKANS ERBJUDANDEN (BYGG MENYN KRING DESSA):
${offers || 'Inga erbjudanden tillgängliga — föreslå billiga vardagsrätter istället'}

REGLER:
1. VARJE rätt ska använda minst 1-2 erbjudanden som huvudingrediens
2. Välj fortfarande rätter som är GODA och populära — billigt behöver inte vara tråkigt
3. VARIATION: använd olika erbjudanden, inte samma protein varje dag
4. "searchQuery" ska vara KORT (2-3 ord max):
   - BRA: "köttfärssås", "fiskgratäng", "kycklingwok"
   - DÅLIGT: "billig vardagsgryta med veckans köttfärserbjudande"
5. "usesOffers" — lista VILKA erbjudanden rätten använder
6. Fredagar = fredagsmys men gärna med erbjudanden

Svara i JSON:
{
  "meals": [
    {
      "name": "Köttfärssås med spaghetti",
      "searchQuery": "köttfärssås",
      "description": "Klassisk köttfärssås — extra billig med veckans köttfärserbjudande.",
      "tags": ["pasta", "köttfärs", "klassiker", "budgetvänligt"],
      "usesOffers": ["Köttfärs 800g"]
    }
  ]
}`;
}

/**
 * Suggest one replacement meal
 */
async function suggestOneMeal(
  preferences: UserPreferences,
  offers: Offer[],
  existingNames: string[],
  mode: MenuMode,
  userPreference?: string | null,
  feedbackHistory?: { reason?: string; preference?: string }[]
): Promise<MealSuggestion | null> {
  const curatedOffers = offers.length > 20 ? await curateOffers(offers) : offers;
  const offersSummary = curatedOffers.slice(0, 20).map(o =>
    `- ${o.name} (${o.offer_price} kr, ${o.store_name})`
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

  const modeInstruction = mode === 'taste'
    ? 'Fokusera på en GOD och ATTRAKTIV rätt.'
    : 'Fokusera på att ANVÄNDA ERBJUDANDEN. Rätten ska bygga på billiga ingredienser.';

  const prompt = `Föreslå EN ny middagsrätt. ${modeInstruction}
${feedbackContext}
Max tid: ${preferences.maxCookTime} min
Ogillar: ${preferences.dislikes.join(', ') || 'inget'}
Undvik (redan i menyn): ${existingNames.join(', ')}

Erbjudanden: ${offersSummary}

Svara i JSON:
{
  "name": "Rätt namn",
  "searchQuery": "kort sökord",
  "description": "Kort beskrivning",
  "tags": ["tag1"],
  "usesOffers": ["Erbjudande"]
}`;

  const result = await chat([
    { role: 'system', content: 'Föreslå ett rättsnamn. searchQuery ska vara 2-3 ord max. Svara i JSON.' },
    { role: 'user', content: prompt },
  ], {
    model: 'google/gemini-3-flash-preview',
    temperature: 0.9,
    max_tokens: 500,
    json_mode: true,
  });

  return JSON.parse(result);
}

// ─── Helpers ─────────────────────────────────────────────────

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
