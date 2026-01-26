/**
 * Shared types for all store scrapers
 */

export interface Store {
  id: string;
  name: string;
  address?: string;
  city?: string;
  chain: ChainId;
  externalId: string;
  /** ICA store profile: Maxi, Kvantum, Supermarket, Nära */
  profile?: string;
  /** Direct URL to offers page */
  offersUrl?: string;
}

export interface Offer {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  originalPrice?: number;
  offerPrice: number;
  /** For "X för Y" deals: how many items */
  quantity?: number;
  /** For "X för Y" deals: total price for quantity */
  quantityPrice?: number;
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
  baseUrl: string;
  color: string;
  logo: string;
}

export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  ica: {
    id: 'ica',
    name: 'ICA',
    baseUrl: 'https://www.ica.se',
    color: '#e3000b',
    logo: '🔴',
  },
  hemkop: {
    id: 'hemkop',
    name: 'Hemköp',
    baseUrl: 'https://www.hemkop.se',
    color: '#ff6600',
    logo: '🟠',
  },
  coop: {
    id: 'coop',
    name: 'Coop',
    baseUrl: 'https://www.coop.se',
    color: '#00aa46',
    logo: '🟢',
  },
  lidl: {
    id: 'lidl',
    name: 'Lidl',
    baseUrl: 'https://www.lidl.se',
    color: '#0050aa',
    logo: '🔵',
  },
  willys: {
    id: 'willys',
    name: 'Willys',
    baseUrl: 'https://www.willys.se',
    color: '#e4002b',
    logo: '🔴',
  },
};

export interface ScraperResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  scrapedAt: Date;
  duration: number;
}

export interface StoreSearchResult {
  stores: Store[];
  query?: string;
  /** Total number of stores matching (if paginated) */
  totalCount?: number;
}

export interface OffersResult {
  offers: Offer[];
  store: Store;
  validFrom?: Date;
  validUntil?: Date;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  chain: ChainId;
  timestamp: Date;
}
