/**
 * Client for the Matino Scraper API
 */

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:3001';

export interface Store {
  id: string;
  name: string;
  address?: string;
  city?: string;
  chain: ChainId;
  externalId: string;
}

export interface Offer {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  originalPrice?: number;
  offerPrice: number;
  unit?: string;
  savings?: string;
  imageUrl?: string;
  validFrom?: Date;
  validUntil?: Date;
  storeId: string;
  chain: ChainId;
  category?: string;
  maxPerHousehold?: number;
  requiresMembership?: boolean;
  scrapedAt: Date;
}

export type ChainId = 'ica' | 'hemkop' | 'coop' | 'lidl' | 'willys';

export interface ChainConfig {
  id: ChainId;
  name: string;
  color: string;
  logo: string;
  supported: boolean;
}

export const CHAINS: ChainConfig[] = [
  { id: 'ica', name: 'ICA', color: '#e3000b', logo: '🔴', supported: true },
  { id: 'hemkop', name: 'Hemköp', color: '#ff6600', logo: '🟠', supported: true },
  { id: 'coop', name: 'Coop', color: '#00aa46', logo: '🟢', supported: false },
  { id: 'lidl', name: 'Lidl', color: '#0050aa', logo: '🔵', supported: false },
];

export async function getHealth(): Promise<{ status: string; supportedChains: string[] }> {
  const res = await fetch(`${SCRAPER_URL}/health`);
  return res.json();
}

export async function searchStores(chain: ChainId, query: string): Promise<{ stores: Store[] }> {
  const res = await fetch(`${SCRAPER_URL}/chains/${chain}/stores?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Failed to search stores: ${res.statusText}`);
  return res.json();
}

export async function getOffers(store: Store): Promise<{ offers: Offer[]; store: Store }> {
  const res = await fetch(`${SCRAPER_URL}/chains/${store.chain}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(store),
  });
  if (!res.ok) throw new Error(`Failed to get offers: ${res.statusText}`);
  return res.json();
}

export async function validateScrapers(): Promise<{ valid: boolean; results: any[] }> {
  const res = await fetch(`${SCRAPER_URL}/validate`);
  return res.json();
}

// Predefined stores for quick selection
export const PREDEFINED_STORES: Store[] = [
  // ICA stores
  { id: 'ica-maxi-nacka', name: 'ICA Maxi Nacka', chain: 'ica', externalId: 'ica-maxi-nacka-forum', city: 'Nacka' },
  { id: 'ica-kvantum-liljeholmen', name: 'ICA Kvantum Liljeholmen', chain: 'ica', externalId: 'ica-kvantum-liljeholmen', city: 'Stockholm' },
  
  // Hemköp stores
  { id: 'hemkop-4147', name: 'Hemköp Östermalmstorg', chain: 'hemkop', externalId: '4147', city: 'Stockholm' },
  { id: 'hemkop-2070', name: 'Hemköp Fridhemsplan', chain: 'hemkop', externalId: '2070', city: 'Stockholm' },
  { id: 'hemkop-2123', name: 'Hemköp Odenplan', chain: 'hemkop', externalId: '2123', city: 'Stockholm' },
];
