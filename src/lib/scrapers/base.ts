import { chromium, Browser, BrowserContext, Page } from 'playwright';
import type { ChainId, Store, Offer, ScraperResult, StoreSearchResult, OffersResult } from './types';

/**
 * Base class for all store scrapers
 */
export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  abstract readonly chainId: ChainId;
  abstract readonly chainName: string;

  /**
   * Initialize the browser instance
   */
  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'sv-SE',
      });
    }
  }

  /**
   * Create a new page
   */
  protected async newPage(): Promise<Page> {
    if (!this.context) {
      await this.init();
    }
    return this.context!.newPage();
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }

  /**
   * Search for stores by location/query
   */
  abstract searchStores(query: string): Promise<ScraperResult<StoreSearchResult>>;

  /**
   * Get offers for a specific store
   */
  abstract getOffers(store: Store): Promise<ScraperResult<OffersResult>>;

  /**
   * Validate that the scraper is working correctly
   * Used for health checks and monitoring
   */
  abstract validate(): Promise<{ valid: boolean; message: string }>;

  /**
   * Helper: wrap scraper function with timing and error handling
   */
  protected async withTiming<T>(
    fn: () => Promise<T>
  ): Promise<ScraperResult<T>> {
    const start = Date.now();
    try {
      const data = await fn();
      return {
        success: true,
        data,
        scrapedAt: new Date(),
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        scrapedAt: new Date(),
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Helper: wait for network to be idle
   */
  protected async waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout });
    } catch {
      // Timeout is acceptable, page might have long-polling
    }
  }

  /**
   * Helper: extract price from Swedish price string
   * "119 kr/kg" -> 119
   * "2 för 50 kr" -> 25
   */
  protected parsePrice(priceStr: string): number | undefined {
    if (!priceStr) return undefined;
    
    // Handle "X för Y kr" pattern
    const multiMatch = priceStr.match(/(\d+)\s*för\s*(\d+(?:[,\.]\d+)?)/i);
    if (multiMatch) {
      const count = parseInt(multiMatch[1]);
      const total = parseFloat(multiMatch[2].replace(',', '.'));
      return Math.round((total / count) * 100) / 100;
    }

    // Handle regular price
    const match = priceStr.match(/(\d+(?:[,\.]\d+)?)/);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }

    return undefined;
  }

  /**
   * Helper: extract unit from price string
   * "119 kr/kg" -> "kg"
   */
  protected parseUnit(priceStr: string): string | undefined {
    const match = priceStr.match(/\/(\w+)/);
    return match ? match[1] : undefined;
  }
}
