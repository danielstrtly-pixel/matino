import { chromium, Browser, BrowserContext, Page } from 'playwright';
import type { ChainId, Store, ScraperResult, StoreSearchResult, OffersResult, ValidationResult } from '../types';

/**
 * Base class for all store scrapers
 */
export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  abstract readonly chainId: ChainId;
  abstract readonly chainName: string;

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

  protected async newPage(): Promise<Page> {
    if (!this.context) {
      await this.init();
    }
    return this.context!.newPage();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }

  abstract searchStores(query: string): Promise<ScraperResult<StoreSearchResult>>;
  abstract getOffers(store: Store): Promise<ScraperResult<OffersResult>>;
  abstract validate(): Promise<ValidationResult>;

  protected async withTiming<T>(fn: () => Promise<T>): Promise<ScraperResult<T>> {
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

  protected async waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout });
    } catch {
      // Timeout acceptable
    }
  }

  protected parsePrice(priceStr: string): number | undefined {
    if (!priceStr) return undefined;
    
    const multiMatch = priceStr.match(/(\d+)\s*för\s*(\d+(?:[,\.]\d+)?)/i);
    if (multiMatch) {
      const count = parseInt(multiMatch[1]);
      const total = parseFloat(multiMatch[2].replace(',', '.'));
      return Math.round((total / count) * 100) / 100;
    }

    const match = priceStr.match(/(\d+(?:[,\.]\d+)?)/);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }

    return undefined;
  }

  protected parseUnit(priceStr: string): string | undefined {
    const match = priceStr.match(/\/(\w+)/);
    return match ? match[1] : undefined;
  }

  private _idCounter = 0;

  protected generateOfferId(chain: ChainId, storeId: string, name: string): string {
    const hash = name.toLowerCase().replace(/[^a-zåäö0-9]/g, '').slice(0, 20);
    this._idCounter++;
    return `${chain}-${storeId}-${hash}-${Date.now()}-${this._idCounter}`;
  }
}
