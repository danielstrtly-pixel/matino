export { BaseScraper } from './base';
export { ICAScraper } from './ica';
export { HemkopScraper } from './hemkop';
export { CoopScraper } from './coop';
export { LidlScraper } from './lidl';

import { ICAScraper } from './ica';
import { HemkopScraper } from './hemkop';
import { CoopScraper } from './coop';
import { LidlScraper } from './lidl';
import type { ChainId } from '../types';
import type { BaseScraper } from './base';

export function createScraper(chain: ChainId): BaseScraper {
  switch (chain) {
    case 'ica':
      return new ICAScraper();
    case 'hemkop':
      return new HemkopScraper();
    case 'coop':
      return new CoopScraper();
    case 'lidl':
      return new LidlScraper();
    case 'willys':
      throw new Error(`Scraper for ${chain} not implemented yet`);
    default:
      throw new Error(`Unknown chain: ${chain}`);
  }
}

export function getSupportedChains(): ChainId[] {
  return ['ica', 'hemkop', 'coop', 'lidl'];
}
