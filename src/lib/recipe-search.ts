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
    // Return only the single best recipe match.
    // The carousel UI supports multiple recipes if we want to expand later —
    // just change the limit here and the carousel will handle it automatically.
    const MAX_RECIPES = 1;
    const results: RecipeLink[] = [];

    for (const item of data.web?.results || []) {
      const source = sources.find(s => item.url.includes(s.domain.split('/')[0]));
      if (!source) continue;

      // Skip collection/category pages (not specific recipes)
      if (isCollectionUrl(item.url)) continue;

      results.push({
        title: cleanTitle(item.title),
        url: item.url,
        description: stripHtml(item.description || ''),
        source: source.name,
        imageUrl: item.thumbnail?.original || item.thumbnail?.src || undefined,
      });

      if (results.length >= MAX_RECIPES) break;
    }

    // Add a fallback link if no results found
    if (results.length === 0) {
      results.push(buildSearchLink(mealName, sources[0]));
    }

    return results;
  } catch (error) {
    console.error('[RecipeSearch] Error:', error);
    return buildFallbackLinks(mealName, sourceIds);
  }
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

/** Check if URL is a collection/category page rather than a specific recipe */
function isCollectionUrl(url: string): boolean {
  try {
    const u = new URL(url);
    // Arla collection pages (/recept/samling/...)
    if (u.pathname.includes('/samling/')) return true;
    // Search result pages
    if (u.search.includes('q=') || u.search.includes('query=')) return true;
    // ICA category pages (no digits = no recipe ID, e.g. /recept/kyckling/gryta/)
    if (u.hostname.includes('ica.se') && u.pathname.includes('/recept/') && u.pathname.split('/').length > 3 && !/\d/.test(u.pathname)) return true;
    return false;
  } catch {
    return false;
  }
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
