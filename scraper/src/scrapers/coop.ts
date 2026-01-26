import { Page } from 'playwright';
import { BaseScraper } from './base';
import type { Store, Offer, ScraperResult, StoreSearchResult, OffersResult, ValidationResult, ChainId } from '../types';
import { getCategory } from '../categories';

/**
 * Coop Scraper
 * 
 * Coop has both online offers and store-specific offers.
 * Store finder: https://www.coop.se/butiker-erbjudanden/
 * Online offers: https://www.coop.se/handla/aktuella-erbjudanden/
 */
export class CoopScraper extends BaseScraper {
  readonly chainId: ChainId = 'coop';
  readonly chainName = 'Coop';
  
  private readonly baseUrl = 'https://www.coop.se';
  private readonly storeFinderUrl = 'https://www.coop.se/butiker-erbjudanden/';

  async searchStores(query: string): Promise<ScraperResult<StoreSearchResult>> {
    return this.withTiming(async () => {
      const page = await this.newPage();
      
      try {
        await page.goto(this.storeFinderUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);
        
        // Accept cookies if present
        await this.acceptCookies(page);
        
        // Try to find and use the search input
        const searchInput = await page.$('input[type="search"], input[placeholder*="Sök"], input[name*="search"]');
        if (searchInput) {
          await searchInput.fill(query);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(3000);
        }
        
        // Extract stores from the page
        const stores = await this.extractStoresFromPage(page, query);
        
        return { stores, query };
      } finally {
        await page.close();
      }
    });
  }

  private async extractStoresFromPage(page: Page, query: string): Promise<Store[]> {
    const stores: Store[] = [];
    
    // Coop lists stores with links to their pages
    const storeLinks = await page.$$('a[href*="/butiker-erbjudanden/"]');
    
    for (const link of storeLinks) {
      try {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        
        if (!href || !text) continue;
        
        // Extract store slug from URL
        const match = href.match(/\/butiker-erbjudanden\/([^/]+)\/([^/]+)/);
        if (match) {
          const storeType = match[1]; // coop, stora-coop, etc.
          const storeSlug = match[2];
          
          // Filter by query if provided
          const textLower = text.toLowerCase();
          const queryLower = query.toLowerCase();
          if (query && !textLower.includes(queryLower)) continue;
          
          stores.push({
            id: `coop-${storeSlug}`,
            name: text.trim(),
            chain: 'coop',
            externalId: storeSlug,
            profile: storeType,
            offersUrl: `${this.baseUrl}${href}`,
          });
        }
      } catch (e) {
        // Skip malformed elements
      }
    }
    
    return stores;
  }

  async getOffers(store: Store): Promise<ScraperResult<OffersResult>> {
    return this.withTiming(async () => {
      const page = await this.newPage();
      
      try {
        const offerUrl = store.offersUrl || `${this.storeFinderUrl}${store.profile || 'coop'}/${store.externalId}/`;
        console.log(`[Coop] Loading ${offerUrl}`);
        
        await page.goto(offerUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000); // Wait for JS to render
        
        // Accept cookies FIRST before any interaction
        await this.acceptCookies(page);
        await page.waitForTimeout(1000);
        
        // Scroll to load all content
        await this.scrollToLoadAll(page);
        
        // Try to find offer elements
        const offers = await this.extractOffers(page, store);
        console.log(`[Coop] Found ${offers.length} offers`);
        
        return { offers, store };
      } finally {
        await page.close();
      }
    });
  }

  private async extractOffers(page: Page, store: Store): Promise<Offer[]> {
    const offers: Offer[] = [];
    
    // Debug page first
    const pageDebug = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyLength: document.body?.innerHTML?.length || 0,
        priceCount: document.querySelectorAll('[class*="price"], [class*="Price"]').length,
        productCount: document.querySelectorAll('[class*="product"], [class*="Product"]').length,
        offerCount: document.querySelectorAll('[class*="offer"], [class*="Offer"]').length,
        allClassNames: Array.from(new Set(
          Array.from(document.querySelectorAll('[class]'))
            .flatMap(e => (e.className || '').split(' '))
            .filter(c => c.length > 3)
        )).slice(0, 30),
      };
    });
    console.log('[Coop] Page debug:', JSON.stringify(pageDebug));
    
    // Extract products using page.evaluate
    const rawProducts = await page.evaluate(() => {
      const products: any[] = [];
      
      // Method 1: Find elements with price containers
      let items: Element[] = [];
      const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"]');
      
      priceElements.forEach(priceEl => {
        // Walk up to find a reasonable container
        let parent = priceEl.parentElement;
        for (let i = 0; i < 6 && parent; i++) {
          const className = parent.className || '';
          if (className.includes('product') || className.includes('Product') || 
              className.includes('offer') || className.includes('Offer') ||
              className.includes('item') || className.includes('Item') ||
              className.includes('card') || className.includes('Card')) {
            if (!items.includes(parent)) {
              items.push(parent);
            }
            break;
          }
          parent = parent.parentElement;
        }
      });
      
      items.forEach(item => {
        try {
          // Find name
          const nameEl = item.querySelector('[class*="name"], [class*="Name"], [class*="title"], [class*="Title"], h2, h3, h4, p');
          let name = nameEl?.textContent?.trim();
          
          // Skip if name is too short or looks like a price
          if (!name || name.length < 2 || /^\d+[,.]?\d*\s*(kr|:-|st)?$/i.test(name)) {
            // Try to find name from img alt
            const img = item.querySelector('img');
            name = img?.getAttribute('alt')?.trim();
          }
          
          // Find price
          const priceEl = item.querySelector('[class*="price"], [class*="Price"]');
          const priceText = priceEl?.textContent?.trim();
          
          // Find image
          const imgEl = item.querySelector('img');
          const imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src');
          
          if (name && priceText && name.length > 2) {
            products.push({ name, priceText, imageUrl });
          }
        } catch (e) {
          // Skip problematic elements
        }
      });
      
      return products;
    });
    
    console.log(`[Coop] Raw products extracted: ${rawProducts.length}`);
    
    // Process raw products
    for (const raw of rawProducts) {
      try {
        const name = raw.name;
        if (!name || name.length < 2 || name.length > 100) continue;
        
        // Parse price
        const priceMatch = raw.priceText?.match(/(\d+)[,.]?(\d*)/);
        if (!priceMatch) continue;
        
        const offerPrice = parseFloat(`${priceMatch[1]}.${priceMatch[2] || '0'}`);
        if (offerPrice < 1 || offerPrice > 10000) continue;
        
        // Classify category
        const category = getCategory(undefined, name, 'coop');
        
        const offer: Offer = {
          id: this.generateOfferId('coop', store.externalId, name),
          name,
          offerPrice,
          imageUrl: raw.imageUrl || undefined,
          storeId: store.id,
          chain: 'coop',
          category,
          scrapedAt: new Date(),
        };
        
        // Avoid duplicates
        if (!offers.some(o => o.name === name && o.offerPrice === offerPrice)) {
          offers.push(offer);
        }
      } catch (e) {
        // Skip problematic elements
      }
    }
    
    return offers;
  }

  private async scrollToLoadAll(page: Page): Promise<void> {
    console.log('[Coop] Scrolling to load content...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  private async acceptCookies(page: Page): Promise<void> {
    try {
      const acceptBtn = await page.$('button:has-text("Acceptera"), button:has-text("Godkänn"), #onetrust-accept-btn-handler');
      if (acceptBtn) {
        await acceptBtn.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Cookies already accepted or no dialog
    }
  }

  async validate(): Promise<ValidationResult> {
    const page = await this.newPage();
    
    try {
      await page.goto(this.storeFinderUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const hasContent = await page.$('main, [class*="content"]');
      
      return {
        valid: !!hasContent,
        message: hasContent ? 'Coop scraper validation passed' : 'Coop page structure may have changed',
        chain: 'coop',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        valid: false,
        message: `Coop validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        chain: 'coop',
        timestamp: new Date(),
      };
    } finally {
      await page.close();
    }
  }
}
