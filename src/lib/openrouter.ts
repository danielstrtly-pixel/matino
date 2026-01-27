/**
 * OpenRouter API client for SmartaMenyn
 * Uses GPT-4o-mini for recipe translation and menu generation
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function chat(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
  }
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://smartamenyn.se',
      'X-Title': 'SmartaMenyn',
    },
    body: JSON.stringify({
      model: options?.model || DEFAULT_MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
      ...(options?.json_mode && { response_format: { type: 'json_object' } }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data: OpenRouterResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Translate text from English to Swedish
 */
export async function translateToSwedish(text: string): Promise<string> {
  const result = await chat([
    {
      role: 'system',
      content: 'Du är en professionell översättare. Översätt texten från engelska till svenska. Behåll matlagningstermer naturliga på svenska. Svara endast med översättningen.',
    },
    {
      role: 'user',
      content: text,
    },
  ], { temperature: 0.3 });

  return result.trim();
}

/**
 * Translate a full recipe from English to Swedish
 */
export async function translateRecipe(recipe: {
  name: string;
  ingredients: string[];
  instructions: string[];
}): Promise<{
  name: string;
  ingredients: string[];
  instructions: string[];
}> {
  const result = await chat([
    {
      role: 'system',
      content: `Du är en professionell matöversättare. Översätt receptet från engelska till svenska.
Konvertera mått: cups → dl, oz → g, lbs → kg, fahrenheit → celsius.
Svara i JSON-format:
{
  "name": "Receptnamn på svenska",
  "ingredients": ["ingrediens 1", "ingrediens 2"],
  "instructions": ["steg 1", "steg 2"]
}`,
    },
    {
      role: 'user',
      content: JSON.stringify(recipe),
    },
  ], { temperature: 0.3, json_mode: true });

  return JSON.parse(result);
}

/**
 * Generate a weekly menu based on preferences and available offers
 */
export async function generateWeeklyMenu(params: {
  preferences: {
    dietary?: string[];
    cuisines?: string[];
    cookingTime?: number;
    skillLevel?: string;
    dislikes?: string[];
  };
  offers?: { name: string; price: number; store: string }[];
  previousRecipes?: string[];
}): Promise<{
  monday: { name: string; description: string };
  tuesday: { name: string; description: string };
  wednesday: { name: string; description: string };
  thursday: { name: string; description: string };
  friday: { name: string; description: string };
  saturday: { name: string; description: string };
  sunday: { name: string; description: string };
}> {
  const offersList = params.offers?.slice(0, 20).map(o => `${o.name} (${o.price} kr, ${o.store})`).join('\n') || 'Inga erbjudanden tillgängliga';
  
  const result = await chat([
    {
      role: 'system',
      content: `Du är en måltidsplanerare för svenska familjer. Skapa en veckomeny baserad på användarens preferenser och aktuella erbjudanden.

Regler:
- Variera rätterna (inte samma protein två dagar i rad)
- Ta hänsyn till matlagartid och svårighetsgrad
- Försök använda ingredienser från erbjudandena
- Ge svenska rättnamn
- Fredagar kan vara "fredagsmys" (tacos, pizza, hamburgare)
- Helger kan ha lite mer avancerade recept

Svara i JSON-format med veckodagar som nycklar.`,
    },
    {
      role: 'user',
      content: `Preferenser:
- Kosttyp: ${params.preferences.dietary?.join(', ') || 'Inga restriktioner'}
- Gillar: ${params.preferences.cuisines?.join(', ') || 'Allt'}
- Maxtid: ${params.preferences.cookingTime || 45} minuter
- Nivå: ${params.preferences.skillLevel || 'medel'}
- Ogillar: ${params.preferences.dislikes?.join(', ') || 'Inget speciellt'}

Aktuella erbjudanden:
${offersList}

Tidigare recept (undvik upprepning): ${params.previousRecipes?.join(', ') || 'Inga'}`,
    },
  ], { temperature: 0.8, json_mode: true });

  return JSON.parse(result);
}
