export { BaseScraper } from './base';
export { ICAScraper } from './ica';
export { HemkopScraper } from './hemkop';

import { ICAScraper } from './ica';
import { HemkopScraper } from './hemkop';
import type { ChainId } from '../types';
import type { BaseScraper } from './base';

export function createScraper(chain: ChainId): BaseScraper {
  switch (chain) {
    case 'ica':
      return new ICAScraper();
    case 'hemkop':
      return new HemkopScraper();
    case 'coop':
    case 'lidl':
    case 'willys':
      throw new Error(`Scraper for ${chain} not implemented yet`);
    default:
      throw new Error(`Unknown chain: ${chain}`);
  }
}

export function getSupportedChains(): ChainId[] {
  return ['ica', 'hemkop'];
}
