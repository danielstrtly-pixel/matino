/**
 * Standard category mapping for Matino
 * Maps various store-specific categories to our unified categories
 */

export type StandardCategory = 
  | 'frukt-gront'
  | 'mejeri'
  | 'kott-chark'
  | 'fisk'
  | 'brod-bageri'
  | 'fryst'
  | 'skafferi'
  | 'dryck'
  | 'godis-snacks'
  | 'hygien-hushall'
  | 'ovrigt';

export const CATEGORY_LABELS: Record<StandardCategory, string> = {
  'frukt-gront': 'Frukt & Grönt',
  'mejeri': 'Mejeri & Ost',
  'kott-chark': 'Kött & Chark',
  'fisk': 'Fisk & Skaldjur',
  'brod-bageri': 'Bröd & Bageri',
  'fryst': 'Fryst',
  'skafferi': 'Skafferi',
  'dryck': 'Dryck',
  'godis-snacks': 'Godis & Snacks',
  'hygien-hushall': 'Hygien & Hushåll',
  'ovrigt': 'Övrigt',
};

// ICA category mappings
const ICA_CATEGORY_MAP: Record<string, StandardCategory> = {
  'färskvaror': 'kott-chark',
  'kött': 'kott-chark',
  'chark': 'kott-chark',
  'fågel': 'kott-chark',
  'kyckling': 'kott-chark',
  'mejeri': 'mejeri',
  'ost': 'mejeri',
  'ägg': 'mejeri',
  'frukt': 'frukt-gront',
  'grönt': 'frukt-gront',
  'grönsaker': 'frukt-gront',
  'bär': 'frukt-gront',
  'fisk': 'fisk',
  'skaldjur': 'fisk',
  'bröd': 'brod-bageri',
  'bageri': 'brod-bageri',
  'kex': 'brod-bageri',
  'fryst': 'fryst',
  'djupfryst': 'fryst',
  'glass': 'fryst',
  'skafferi': 'skafferi',
  'skafferivaror': 'skafferi',
  'pasta': 'skafferi',
  'ris': 'skafferi',
  'konserv': 'skafferi',
  'dryck': 'dryck',
  'läsk': 'dryck',
  'vatten': 'dryck',
  'juice': 'dryck',
  'kaffe': 'dryck',
  'te': 'dryck',
  'godis': 'godis-snacks',
  'snacks': 'godis-snacks',
  'chips': 'godis-snacks',
  'choklad': 'godis-snacks',
  'hem': 'hygien-hushall',
  'fritid': 'hygien-hushall',
  'hygien': 'hygien-hushall',
  'hushåll': 'hygien-hushall',
  'städ': 'hygien-hushall',
  'tvätt': 'hygien-hushall',
  'djur': 'ovrigt',
  'barn': 'ovrigt',
};

// Hemköp uses similar categories
const HEMKOP_CATEGORY_MAP: Record<string, StandardCategory> = {
  ...ICA_CATEGORY_MAP,
  // Add Hemköp-specific mappings here if needed
};

// Keywords for AI-like classification based on product name
const KEYWORD_PATTERNS: Array<{ pattern: RegExp; category: StandardCategory }> = [
  // Kött & Chark
  { pattern: /(kött|fläsk|nöt|lamm|kyckling|fågel|korv|bacon|skinka|salami|leverpastej|falukorv|prinskorv|hamburgare|köttbullar|färs|biff|entrecote|filé|schnitzel|kassler|kycklingbröst|fläskfilé|nötfärs|blandfärs|högrev|bog|revben|kotlett|köttfärs|pulled|brisket|oxfilé|fläskkotlett|kalkon|anka|and|gris|griskött|nötkött|lammkött)/i, category: 'kott-chark' },
  // Mejeri
  { pattern: /\b(mjölk|fil|yoghurt|grädde|créme|ost|smör|margarin|ägg|kvarg|keso|feta|mozzarella|cheddar|brie|parmesan|gouda|edamer|grädd|crème|mascarpone|ricotta|halloumi|västerbotten|herrgård|prästost|gruyère|emmental|philadelph|laktosfri)\b/i, category: 'mejeri' },
  // Frukt & Grönt
  { pattern: /\b(äpple|päron|banan|apelsin|citron|lime|vindruva|melon|mango|ananas|avokado|tomat|gurka|paprika|lök|vitlök|morot|potatis|sallad|spenat|broccoli|blomkål|zucchini|aubergine|svamp|champinjon|dill|persilja|basilika|örter|kål|vitkål|rödkål|purjolök|selleri|rädisa|rädisor|ruccola|pak choi|bönor|ärtor|majs|sparris|kronärtskock|fänkål|rotselleri|palsternacka|jordärtskock|sötpotatis|squash|pumpa|cantaloupe|nektarin|persika|aprikos|plommon|kiwi|granatäpple|fikon|dadel|passionsfrukt|papaya|kokos|jordgubb|hallon|blåbär|björnbär)\b/i, category: 'frukt-gront' },
  // Fisk
  { pattern: /\b(lax|torsk|sill|makrill|tonfisk|räkor|krabba|musslor|fiskpinnar|fisk|skaldjur|kaviar|rom|alaska|hoki|sejlax|rödspätta|kolja|gös|abborre|öring|röding|sej|pangasius|tilapia)\b/i, category: 'fisk' },
  // Bröd & Bageri
  { pattern: /\b(bröd|limpa|fralla|bulle|croissant|kaka|tårta|muffins|kex|skorpa|knäckebröd|tunnbröd|tortilla|pita|munkar|munk|donut|wienerbröd|kanelbulle|kardemumma|vetebröd|rågbröd|ciabatta|baguette|focaccia|naan|pizza\s*deg|deg|bakelse|kanel|mazarin|prinsesstårta|kladdkaka|chokladboll|dammsugare)\b/i, category: 'brod-bageri' },
  // Fryst
  { pattern: /\b(fryst|frysta|glass|pizza|pommes|frityrstekt|frysdisk|djupfryst)\b/i, category: 'fryst' },
  // Skafferi
  { pattern: /\b(pasta|ris|spagetti|makaroner|nudlar|bulgur|couscous|quinoa|linser|bönor|kikärtor|krossade tomater|passerade|ketchup|senap|majonnäs|soja|olja|vinäger|mjöl|socker|salt|kryddor|buljong|fond|müsli|flingor|havregryn|cornflakes|granola|marmelad|sylt|honung|nutella|jordnötssmör|konserv|inlagd|oliver|kapris|pesto|tomatpuré|kokosmjölk|sambal|curry|tandoori)\b/i, category: 'skafferi' },
  // Dryck
  { pattern: /\b(läsk|cola|fanta|sprite|saft|juice|vatten|mineralvatten|kaffe|te|energidryck|öl|vin|cider|dricka|dryck|lemonad|nektar|smoothie|milkshake|apelsinjuice|äppeljuice|must|julmust|påskmust|tonic|ginger\s*ale|redbull|monster|nocco)\b/i, category: 'dryck' },
  // Godis & Snacks
  { pattern: /\b(godis|choklad|chips|popcorn|nötter|mandlar|russin|lakrits|tuggummi|lösgodis|kola|marshmallow|snacks|marabou|fazer|ahlgrens|bilar|gott|sötsaker|kexchoklad|daim|toblerone|twix|snickers|bounty|geisha|plopp|jordnöt|cashew|pistasch|hasselnöt|valnöt)\b/i, category: 'godis-snacks' },
  // Hygien & Hushåll
  { pattern: /\b(tvättmedel|diskmedel|städ|toalettpapper|hushållspapper|servett|påse|folie|plastpåse|tvål|schampo|balsam|tandkräm|deodorant|blöjor|rengöring|allrengöring|fönsterputs|wc|toalett|sköljmedel|parfym|hudkräm|handkräm|duschkräm|ansiktskräm|lotion|rakning|rakblad|munskölj|tandborste|tops|bomull|bindor|tamponger|trosskydd)\b/i, category: 'hygien-hushall' },
];

/**
 * Map a store-specific category to our standard category
 */
export function mapCategory(storeCategory: string | undefined, chain: string): StandardCategory {
  if (!storeCategory) return 'ovrigt';
  
  const normalized = storeCategory.toLowerCase().trim();
  
  const categoryMap = chain === 'ica' ? ICA_CATEGORY_MAP : HEMKOP_CATEGORY_MAP;
  
  // Try direct match
  if (categoryMap[normalized]) {
    return categoryMap[normalized];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(categoryMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return 'ovrigt';
}

/**
 * Classify a product by its name using keyword patterns
 */
export function classifyByName(productName: string): StandardCategory {
  const nameLower = productName.toLowerCase();
  
  for (const { pattern, category } of KEYWORD_PATTERNS) {
    if (pattern.test(nameLower)) {
      return category;
    }
  }
  
  return 'ovrigt';
}

/**
 * Get category for a product - tries store category first, then name classification
 */
export function getCategory(storeCategory: string | undefined, productName: string, chain: string): StandardCategory {
  // If we have a store category, use that
  if (storeCategory) {
    const mapped = mapCategory(storeCategory, chain);
    if (mapped !== 'ovrigt') {
      return mapped;
    }
  }
  
  // Fall back to name classification
  return classifyByName(productName);
}
