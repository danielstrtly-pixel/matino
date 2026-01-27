#!/usr/bin/env node

import { createScraper, getSupportedChains } from './scrapers';
import type { ChainId, Store } from './types';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const chain = args[1] as ChainId;
  const query = args.slice(2).join(' ');

  if (!command || command === 'help') {
    console.log(`
SmartaMenyn Scraper CLI

Usage:
  npx tsx src/cli.ts <command> <chain> [options]

Commands:
  stores <chain> <query>   Search for stores
  offers <chain> <storeId> Get offers for a store
  validate [chain]         Validate scrapers
  chains                   List supported chains

Supported chains: ${getSupportedChains().join(', ')}

Examples:
  npx tsx src/cli.ts stores ica stockholm
  npx tsx src/cli.ts offers ica 12345
  npx tsx src/cli.ts offers hemkop 4147
  npx tsx src/cli.ts validate
  npx tsx src/cli.ts validate ica
`);
    return;
  }

  if (command === 'chains') {
    console.log('Supported chains:', getSupportedChains().join(', '));
    return;
  }

  if (command === 'validate') {
    if (chain) {
      if (!getSupportedChains().includes(chain)) {
        console.error(`Chain ${chain} not supported`);
        process.exit(1);
      }
      const scraper = createScraper(chain);
      try {
        await scraper.init();
        const result = await scraper.validate();
        console.log(`\n${result.valid ? '✅' : '❌'} ${result.chain}: ${result.message}`);
        process.exit(result.valid ? 0 : 1);
      } finally {
        await scraper.close();
      }
    } else {
      // Validate all
      console.log('Validating all scrapers...\n');
      let allValid = true;
      
      for (const c of getSupportedChains()) {
        const scraper = createScraper(c);
        try {
          await scraper.init();
          const result = await scraper.validate();
          console.log(`${result.valid ? '✅' : '❌'} ${result.chain}: ${result.message}`);
          if (!result.valid) allValid = false;
        } catch (error) {
          console.log(`❌ ${c}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          allValid = false;
        } finally {
          await scraper.close();
        }
      }
      
      process.exit(allValid ? 0 : 1);
    }
    return;
  }

  if (!chain || !getSupportedChains().includes(chain)) {
    console.error(`Invalid or missing chain. Supported: ${getSupportedChains().join(', ')}`);
    process.exit(1);
  }

  const scraper = createScraper(chain);

  try {
    await scraper.init();
    console.log(`Initialized ${chain} scraper\n`);

    if (command === 'stores') {
      if (!query) {
        console.error('Usage: stores <chain> <query>');
        process.exit(1);
      }
      
      console.log(`Searching for stores matching "${query}"...\n`);
      const result = await scraper.searchStores(query);
      
      if (result.success && result.data) {
        console.log(`Found ${result.data.stores.length} stores:\n`);
        for (const store of result.data.stores) {
          console.log(`  📍 ${store.name}`);
          console.log(`     ID: ${store.externalId}`);
          if (store.address) console.log(`     ${store.address}`);
          console.log('');
        }
        console.log(`Duration: ${result.duration}ms`);
      } else {
        console.error('Failed:', result.error);
      }
    }

    if (command === 'offers') {
      const storeId = query;
      if (!storeId) {
        console.error('Usage: offers <chain> <storeId>');
        process.exit(1);
      }
      
      const store: Store = {
        id: `${chain}-${storeId}`,
        name: `Store ${storeId}`,
        chain,
        externalId: storeId,
      };
      
      console.log(`Getting offers for store ${storeId}...\n`);
      const result = await scraper.getOffers(store);
      
      if (result.success && result.data) {
        console.log(`Found ${result.data.offers.length} offers:\n`);
        for (const offer of result.data.offers.slice(0, 20)) {
          console.log(`  🏷️  ${offer.name}`);
          if (offer.brand) console.log(`     Brand: ${offer.brand}`);
          console.log(`     Price: ${offer.offerPrice} kr${offer.unit ? '/' + offer.unit : ''}`);
          if (offer.originalPrice) console.log(`     Was: ${offer.originalPrice} kr`);
          if (offer.savings) console.log(`     Save: ${offer.savings}`);
          console.log('');
        }
        if (result.data.offers.length > 20) {
          console.log(`  ... and ${result.data.offers.length - 20} more\n`);
        }
        console.log(`Duration: ${result.duration}ms`);
      } else {
        console.error('Failed:', result.error);
      }
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

main();
