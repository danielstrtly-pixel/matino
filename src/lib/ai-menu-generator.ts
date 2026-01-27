/**
 * AI-powered Menu Generator
 * Generates complete Swedish recipes using OpenRouter/GPT
 * No external recipe database needed
 */

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
}

export interface AIRecipe {
  name: string;
  description: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: 'lätt' | 'medel' | 'avancerad';
  ingredients: {
    amount: string;
    unit: string;
    item: string;
    isOffer?: boolean;
  }[];
  instructions: string[];
  tips?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  tags: string[];
}

export interface AIMenuItem {
  day: string;
  dayIndex: number;
  meal: 'lunch' | 'dinner';
  recipe: AIRecipe;
  matchedOffers: {
    offerId: string;
    offerName: string;
    price: number;
    store: string;
  }[];
}

export interface AIGeneratedMenu {
  items: AIMenuItem[];
  generatedAt: string;
  model: string;
}

const DAYS_SWEDISH = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

/**
 * Generate a complete weekly menu using AI
 */
export async function generateAIMenu(
  preferences: UserPreferences,
  offers: Offer[]
): Promise<AIGeneratedMenu> {
  console.log('[AI-MenuGen] Starting AI menu generation');
  
  // Group offers by category for the prompt
  const offersSummary = offers.slice(0, 30).map(o => 
    `- ${o.name} (${o.offer_price} kr, ${o.store_name})`
  ).join('\n');

  const restrictions = [
    ...preferences.healthLabels,
    ...preferences.dietLabels,
  ].filter(Boolean);

  const prompt = `Du är en svensk måltidsplanerare. Skapa en veckomeny med ${preferences.mealsPerWeek} middagsrecept.

HUSHÅLL:
- ${preferences.householdSize} personer${preferences.hasChildren ? ' (inkl. barn)' : ''}
- Max tillagningstid: ${preferences.maxCookTime} minuter

KOSTRESTRIKTIONER:
${restrictions.length > 0 ? restrictions.map(r => `- ${r}`).join('\n') : '- Inga'}

OGILLAR:
${preferences.dislikes.length > 0 ? preferences.dislikes.map(d => `- ${d}`).join('\n') : '- Inget speciellt'}

GILLAR:
${preferences.likes.length > 0 ? preferences.likes.map(l => `- ${l}`).join('\n') : '- Allt'}

MATKULTURER:
${preferences.cuisineTypes.length > 0 ? preferences.cuisineTypes.join(', ') : 'Varierat'}

VECKANS ERBJUDANDEN (försök använda dessa):
${offersSummary || 'Inga erbjudanden tillgängliga'}

REGLER:
1. Använd svenska mått (dl, msk, tsk, g, kg)
2. Variera protein (kött, fisk, vegetariskt)
3. Fredagar kan vara "fredagsmys" (tacos, pizza, hamburgare)
4. Markera ingredienser som matchar erbjudanden med "offer": true
5. Uppskatta näringsvärden per portion
6. Ge praktiska tips för tillagning
7. Anpassa portioner för ${preferences.householdSize} personer

Svara i JSON-format:
{
  "recipes": [
    {
      "name": "Receptnamn",
      "description": "Kort beskrivning",
      "servings": ${preferences.householdSize},
      "prepTime": 15,
      "cookTime": 25,
      "totalTime": 40,
      "difficulty": "lätt",
      "ingredients": [
        {"amount": "500", "unit": "g", "item": "kycklingfilé", "isOffer": true},
        {"amount": "2", "unit": "dl", "item": "grädde"}
      ],
      "instructions": [
        "Skär kycklingen i bitar.",
        "Stek i smör tills gyllene."
      ],
      "tips": "Servera med ris eller pasta.",
      "nutrition": {"calories": 450, "protein": 35, "carbs": 20, "fat": 25},
      "tags": ["snabbt", "barnvänligt", "kyckling"]
    }
  ]
}`;

  try {
    const result = await chat([
      {
        role: 'system',
        content: 'Du är en professionell svensk kock och måltidsplanerare. Svara alltid i korrekt JSON-format.',
      },
      { role: 'user', content: prompt },
    ], {
      model: 'google/gemini-3-flash-preview',
      temperature: 0.8,
      max_tokens: 4000,
      json_mode: true,
    });

    const parsed = JSON.parse(result);
    const recipes: AIRecipe[] = parsed.recipes || [];

    // Match recipes with offers
    const menuItems: AIMenuItem[] = recipes.slice(0, preferences.mealsPerWeek).map((recipe, i) => {
      // Find matching offers
      const matchedOffers: AIMenuItem['matchedOffers'] = [];
      
      for (const ing of recipe.ingredients) {
        if (ing.isOffer) {
          const offer = offers.find(o => 
            o.name.toLowerCase().includes(ing.item.toLowerCase()) ||
            ing.item.toLowerCase().includes(o.name.toLowerCase().split(' ')[0])
          );
          if (offer && !matchedOffers.find(m => m.offerId === offer.id)) {
            matchedOffers.push({
              offerId: offer.id,
              offerName: offer.name,
              price: offer.offer_price,
              store: offer.store_name,
            });
          }
        }
      }

      return {
        day: DAYS_SWEDISH[i],
        dayIndex: i,
        meal: 'dinner' as const,
        recipe,
        matchedOffers,
      };
    });

    console.log(`[AI-MenuGen] Generated ${menuItems.length} recipes`);

    return {
      items: menuItems,
      generatedAt: new Date().toISOString(),
      model: 'google/gemini-3-flash-preview',
    };
  } catch (error) {
    console.error('[AI-MenuGen] Error:', error);
    throw new Error('Failed to generate AI menu');
  }
}

/**
 * Regenerate a single meal using AI
 */
export async function regenerateAIMeal(
  dayIndex: number,
  meal: 'lunch' | 'dinner',
  preferences: UserPreferences,
  offers: Offer[],
  existingRecipeNames: string[],
  userPreference?: string | null,
  feedbackHistory?: { reason?: string; preference?: string }[]
): Promise<AIMenuItem | null> {
  const offersSummary = offers.slice(0, 15).map(o => 
    `- ${o.name} (${o.offer_price} kr)`
  ).join('\n');

  // Build feedback context
  let feedbackContext = '';
  if (userPreference) {
    feedbackContext += `\nANVÄNDARENS ÖNSKEMÅL: ${userPreference}\n`;
  }
  if (feedbackHistory && feedbackHistory.length > 0) {
    const recentFeedback = feedbackHistory.slice(0, 5);
    feedbackContext += '\nTIDIGARE FEEDBACK (ta hänsyn till detta):\n';
    for (const fb of recentFeedback) {
      if (fb.reason) feedbackContext += `- Ogillade: ${fb.reason}\n`;
      if (fb.preference) feedbackContext += `- Föredrar: ${fb.preference}\n`;
    }
  }

  const prompt = `Skapa ETT nytt middagsrecept för ${preferences.householdSize} personer.
${feedbackContext}

Max tid: ${preferences.maxCookTime} min
Ogillar: ${preferences.dislikes.join(', ') || 'inget'}
Undvik dessa recept (redan i menyn): ${existingRecipeNames.join(', ')}

Erbjudanden att använda:
${offersSummary}

Svara i JSON:
{
  "name": "...",
  "description": "...",
  "servings": ${preferences.householdSize},
  "prepTime": 10,
  "cookTime": 20,
  "totalTime": 30,
  "difficulty": "lätt",
  "ingredients": [{"amount": "500", "unit": "g", "item": "...", "isOffer": false}],
  "instructions": ["..."],
  "tips": "...",
  "nutrition": {"calories": 400, "protein": 30, "carbs": 40, "fat": 15},
  "tags": ["..."]
}`;

  try {
    const result = await chat([
      { role: 'system', content: 'Du är en svensk kock. Svara i JSON.' },
      { role: 'user', content: prompt },
    ], {
      model: 'google/gemini-3-flash-preview',
      temperature: 0.9,
      max_tokens: 1500,
      json_mode: true,
    });

    const recipe: AIRecipe = JSON.parse(result);

    // Match with offers
    const matchedOffers: AIMenuItem['matchedOffers'] = [];
    for (const ing of recipe.ingredients) {
      if (ing.isOffer) {
        const offer = offers.find(o => 
          o.name.toLowerCase().includes(ing.item.toLowerCase())
        );
        if (offer) {
          matchedOffers.push({
            offerId: offer.id,
            offerName: offer.name,
            price: offer.offer_price,
            store: offer.store_name,
          });
        }
      }
    }

    return {
      day: DAYS_SWEDISH[dayIndex],
      dayIndex,
      meal,
      recipe,
      matchedOffers,
    };
  } catch (error) {
    console.error('[AI-MenuGen] Regenerate error:', error);
    return null;
  }
}
