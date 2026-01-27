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
    
    // Debug page first - look for Coop-specific structure
    const pageDebug = await page.evaluate(() => {
      // Look for offer elements
      const offerElements = document.querySelectorAll('[class*="Offer"], [class*="offer"]');
      const offerClasses = Array.from(offerElements).slice(0, 5).map(e => e.getAttribute('class'));
      
      // Look for any images with product info
      const images = document.querySelectorAll('img[alt]');
      const imgAlts = Array.from(images).slice(0, 10).map(i => i.getAttribute('alt')).filter(a => a && a.length > 3);
      
      // Look for price-like text - Coop uses "X för Y kr" and "Y kr/st" formats
      const allText = document.body?.innerText || '';
      const priceMatches = allText.match(/(\d+\s*för\s*\d+\s*kr|\d+\s*kr\/st|\d+[,.]\d+\s*kr)/gi)?.slice(0, 10) || [];
      
      return {
        url: window.location.href,
        title: document.title,
        offerElementCount: offerElements.length,
        offerClasses,
        imgAlts,
        priceMatches,
      };
    });
    console.log('[Coop] Page debug:', JSON.stringify(pageDebug));
    
    // Extract products using Coop-specific selectors
    const rawProducts = await page.evaluate(() => {
      const products: any[] = [];
      
      // Coop uses PointOfferTeaser for offer cards
      // Also look for product images with alt text and nearby price text
      
      // Method 1: Find PointOfferTeaser elements
      const offerTeasers = document.querySelectorAll('[class*="PointOfferTeaser"], [class*="OfferTeaser"], [class*="ProductCard"]');
      
      offerTeasers.forEach(item => {
        try {
          const heading = item.querySelector('[class*="heading"], h2, h3, h4');
          const name = heading?.textContent?.trim();
          
          // Get all text to find price - Coop uses various formats
          const allText = item.textContent || '';
          
          // Try different price patterns
          let priceText: string | null = null;
          let quantity: number | null = null;
          
          // "X för Y kr" format (e.g., "4 för 50 kr")
          const multiMatch = allText.match(/(\d+)\s*för\s*(\d+)\s*kr/i);
          if (multiMatch) {
            quantity = parseInt(multiMatch[1]);
            priceText = multiMatch[2] + ' kr';
          }
          
          // "Y kr/st" format (e.g., "25 kr/st")
          if (!priceText) {
            const perUnitMatch = allText.match(/(\d+)\s*kr\/st/i);
            if (perUnitMatch) {
              priceText = perUnitMatch[1] + ' kr';
            }
          }
          
          // Regular "X,XX kr" format
          if (!priceText) {
            const regularMatch = allText.match(/(\d+)[,.](\d+)\s*kr/i);
            if (regularMatch) {
              priceText = regularMatch[0];
            }
          }
          
          const img = item.querySelector('img');
          const imageUrl = img?.getAttribute('src') || img?.getAttribute('data-src');
          
          if (name && priceText) {
            products.push({ name, priceText, imageUrl, quantity });
          }
        } catch (e) {}
      });
      
      // Method 2: Find product images with prices nearby
      if (products.length === 0) {
        const productImages = document.querySelectorAll('img[alt]');
        productImages.forEach(img => {
          const alt = img.getAttribute('alt')?.trim();
          if (!alt || alt.length < 3 || alt.includes('Butiks') || alt.includes('Ladda')) return;
          
          // Look for price in nearby elements
          let parent = img.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const text = parent.textContent || '';
            
            let priceText: string | null = null;
            let quantity: number | null = null;
            
            // "X för Y kr" format
            const multiMatch = text.match(/(\d+)\s*för\s*(\d+)\s*kr/i);
            if (multiMatch) {
              quantity = parseInt(multiMatch[1]);
              priceText = multiMatch[2] + ' kr';
            }
            
            // "Y kr/st" format
            if (!priceText) {
              const perUnitMatch = text.match(/(\d+)\s*kr\/st/i);
              if (perUnitMatch) {
                priceText = perUnitMatch[1] + ' kr';
              }
            }
            
            // Regular format
            if (!priceText) {
              const regularMatch = text.match(/(\d+)[,.](\d+)\s*kr/i);
              if (regularMatch) {
                priceText = regularMatch[0];
              }
            }
            
            if (priceText) {
              const imageUrl = img.getAttribute('src') || img.getAttribute('data-src');
              products.push({ name: alt, priceText, imageUrl, quantity });
              break;
            }
            parent = parent.parentElement;
          }
        });
      }
      
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
