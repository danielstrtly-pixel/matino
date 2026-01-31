/**
 * Recipe Search - finds real recipes from Swedish recipe sites
 * Uses Brave Search API with site: filters
 */

export interface RecipeLink {
  title: string;
  url: string;
  description: string;
  source: string; // e.g. "ICA", "Tasteline", "Arla"
  imageUrl?: string; // recipe photo from the site
}

export interface RecipeSearchResult {
  mealName: string;
  recipes: RecipeLink[];
}

// Default recipe sources
export const DEFAULT_RECIPE_SOURCES = [
  { id: 'ica', name: 'ICA', domain: 'ica.se/recept' },
  { id: 'tasteline', name: 'Tasteline', domain: 'tasteline.com' },
  { id: 'arla', name: 'Arla', domain: 'arla.se/recept' },
] as const;

export type RecipeSourceId = typeof DEFAULT_RECIPE_SOURCES[number]['id'];

/**
 * Search for recipes across configured sources using Brave Search API
 */
export async function searchRecipes(
  mealName: string,
  sourceIds?: RecipeSourceId[]
): Promise<RecipeLink[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.error('[RecipeSearch] BRAVE_SEARCH_API_KEY not configured');
    return buildFallbackLinks(mealName, sourceIds);
  }

  const sources = DEFAULT_RECIPE_SOURCES.filter(
    s => !sourceIds || sourceIds.includes(s.id)
  );

  // Build site: filter query — one search covers all sources
  const siteFilter = sources.map(s => `site:${s.domain}`).join(' OR ');
  const query = `${mealName} recept ${siteFilter}`;

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?` +
      new URLSearchParams({
        q: query,
        count: '9', // Up to 3 per source
        search_lang: 'sv',
        country: 'SE',
      }),
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!res.ok) {
      console.error(`[RecipeSearch] Brave API error: ${res.status}`);
      return buildFallbackLinks(mealName, sourceIds);
    }

    const data = await res.json();
    const results: RecipeLink[] = [];

    // Track which sources we've found results for
    const foundSources = new Set<string>();

    for (const item of data.web?.results || []) {
      const source = sources.find(s => item.url.includes(s.domain.split('/')[0]));
      if (!source) continue;

      // Limit to 1 per source (best match)
      if (foundSources.has(source.id)) continue;
      foundSources.add(source.id);

      results.push({
        title: cleanTitle(item.title),
        url: item.url,
        description: stripHtml(item.description || ''),
        source: source.name,
        imageUrl: item.thumbnail?.original || item.thumbnail?.src || undefined,
      });

      // Stop once we have one per source
      if (foundSources.size >= sources.length) break;
    }

    // Add fallback links for any sources that didn't return results
    for (const source of sources) {
      if (!foundSources.has(source.id)) {
        results.push(buildSearchLink(mealName, source));
      }
    }

    return results;
  } catch (error) {
    console.error('[RecipeSearch] Error:', error);
    return buildFallbackLinks(mealName, sourceIds);
  }
}

/**
 * Search recipes for multiple meals sequentially (respects Brave free tier 1 req/sec)
 */
export async function searchRecipesForMeals(
  mealNames: string[],
  sourceIds?: RecipeSourceId[]
): Promise<RecipeSearchResult[]> {
  const results: RecipeSearchResult[] = [];
  for (let i = 0; i < mealNames.length; i++) {
    if (i > 0) await delay(1100); // 1.1s between requests for rate limit
    results.push({
      mealName: mealNames[i],
      recipes: await searchRecipes(mealNames[i], sourceIds),
    });
  }
  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build fallback links (direct search URLs) when API is unavailable
 */
function buildFallbackLinks(
  mealName: string,
  sourceIds?: RecipeSourceId[]
): RecipeLink[] {
  const sources = DEFAULT_RECIPE_SOURCES.filter(
    s => !sourceIds || sourceIds.includes(s.id)
  );
  return sources.map(source => buildSearchLink(mealName, source));
}

function buildSearchLink(
  mealName: string,
  source: { id: string; name: string; domain: string }
): RecipeLink {
  const encoded = encodeURIComponent(mealName);
  let url: string;

  switch (source.id) {
    case 'ica':
      url = `https://www.ica.se/recept/sok/${encoded}/`;
      break;
    case 'tasteline':
      url = `https://www.tasteline.com/sok/?query=${encoded}`;
      break;
    case 'arla':
      url = `https://www.arla.se/recept/?q=${encoded}`;
      break;
    default:
      url = `https://www.google.com/search?q=${encoded}+recept+site:${source.domain}`;
  }

  return {
    title: `Sök "${mealName}" på ${source.name}`,
    url,
    description: `Hitta recept på ${mealName} hos ${source.name}`,
    source: source.name,
  };
}

/** Strip HTML tags from Brave search descriptions */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

/** Clean search result titles (remove " | Recept ICA.se" etc.) */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\|\s*Recept\s*ICA\.se/i, '')
    .replace(/\s*–\s*Tasteline/i, '')
    .replace(/\s*-\s*Recept\s*\|\s*Arla/i, '')
    .trim();
}
