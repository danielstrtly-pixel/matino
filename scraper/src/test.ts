#!/usr/bin/env node

/**
 * Scraper test suite
 * 
 * Run with: npx tsx src/test.ts
 * 
 * These tests verify that:
 * 1. Scrapers can connect to stores' websites
 * 2. Store search returns valid results
 * 3. Offer scraping returns valid data
 * 4. The page structure hasn't changed (validation)
 */

import { createScraper, getSupportedChains } from './scrapers';
import type { ChainId } from './types';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`  ✅ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration: Date.now() - start, error: message });
    console.log(`  ❌ ${name}: ${message}`);
  }
}

async function runTests(): Promise<void> {
  console.log('\n🧪 Running SmartaMenyn Scraper Tests\n');
  console.log('=' .repeat(50));

  // Test ICA
  console.log('\n📍 ICA Tests:\n');
  {
    const scraper = createScraper('ica');
    try {
      await scraper.init();

      await test('ICA validation', async () => {
        const result = await scraper.validate();
        if (!result.valid) throw new Error(result.message);
      });

      await test('ICA store search (stockholm)', async () => {
        const result = await scraper.searchStores('stockholm');
        if (!result.success) throw new Error(result.error || 'Search failed');
        // We may or may not find stores depending on page structure
        console.log(`    Found ${result.data?.stores.length || 0} stores`);
      });

      await test('ICA offers (national)', async () => {
        // Test with a mock store to get national offers
        const result = await scraper.getOffers({
          id: 'ica-test',
          name: 'Test Store',
          chain: 'ica',
          externalId: 'test',
        });
        if (!result.success) throw new Error(result.error || 'Failed to get offers');
        console.log(`    Found ${result.data?.offers.length || 0} offers`);
      });

    } finally {
      await scraper.close();
    }
  }

  // Test Hemköp
  console.log('\n📍 Hemköp Tests:\n');
  {
    const scraper = createScraper('hemkop');
    try {
      await scraper.init();

      await test('Hemköp validation', async () => {
        const result = await scraper.validate();
        if (!result.valid) throw new Error(result.message);
      });

      await test('Hemköp offers (store 4147 - Östermalmstorg)', async () => {
        const result = await scraper.getOffers({
          id: 'hemkop-4147',
          name: 'Hemköp Östermalmstorg',
          chain: 'hemkop',
          externalId: '4147',
        });
        if (!result.success) throw new Error(result.error || 'Failed to get offers');
        console.log(`    Found ${result.data?.offers.length || 0} offers`);
      });

    } finally {
      await scraper.close();
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary:\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`  Total:  ${results.length}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log(`  Time:   ${(totalDuration / 1000).toFixed(2)}s`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  - ${r.name}: ${r.error}`);
    }
  }

  console.log('\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
