import { Page } from 'playwright';
import { BaseScraper } from './base';
import type { Store, Offer, ScraperResult, StoreSearchResult, OffersResult, ValidationResult, ChainId } from '../types';
import { getCategory } from '../categories';

/**
 * Lidl Scraper
 * 
 * Lidl has national offers (same across all stores).
 * Weekly offers: https://www.lidl.se/
 * Offers section: Look for "Reklamblad" or "Erbjudanden"
 */
export class LidlScraper extends BaseScraper {
  readonly chainId: ChainId = 'lidl';
  readonly chainName = 'Lidl';
  
  private readonly baseUrl = 'https://www.lidl.se';

  async searchStores(query: string): Promise<ScraperResult<StoreSearchResult>> {
    return this.withTiming(async () => {
      // Lidl has national offers, but we can list stores for user selection
      const page = await this.newPage();
      
      try {
        await page.goto(`${this.baseUrl}/butiker`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);
        await this.acceptCookies(page);
        
        // Try to search for stores
        const searchInput = await page.$('input[type="search"], input[placeholder*="Sök"]');
        if (searchInput) {
          await searchInput.fill(query);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(3000);
        }
        
        const stores = await this.extractStoresFromPage(page, query);
        
        return { stores, query };
      } finally {
        await page.close();
      }
    });
  }

  private async extractStoresFromPage(page: Page, query: string): Promise<Store[]> {
    const stores: Store[] = [];
    
    // Try to find store list items
    const storeElements = await page.$$('[class*="store"], [data-testid*="store"], li[class*="location"]');
    
    for (const element of storeElements) {
      try {
        const nameEl = await element.$('h2, h3, [class*="name"], [class*="title"]');
        const name = nameEl ? (await nameEl.textContent())?.trim() : null;
        if (!name) continue;
        
        const addressEl = await element.$('[class*="address"], address');
        const address = addressEl ? (await addressEl.textContent())?.trim() : undefined;
        
        // Generate a simple ID from the name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        stores.push({
          id: `lidl-${slug}`,
          name,
          address,
          chain: 'lidl',
          externalId: slug,
        });
      } catch (e) {
        // Skip malformed elements
      }
    }
    
    // If no stores found via scraping, return a default "national" store
    if (stores.length === 0) {
      stores.push({
        id: 'lidl-national',
        name: 'Lidl Sverige',
        chain: 'lidl',
        externalId: 'national',
      });
    }
    
    return stores;
  }

  async getOffers(store: Store): Promise<ScraperResult<OffersResult>> {
    return this.withTiming(async () => {
      const page = await this.newPage();
      
      try {
        // Start at Lidl's main page
        console.log(`[Lidl] Loading ${this.baseUrl}`);
        
        await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        // Accept cookies FIRST
        await this.acceptCookies(page);
        await page.waitForTimeout(1000);
        
        // Find offer links in week-panel-0 (Lidl's weekly offers section)
        const offerUrls = await page.evaluate(() => {
          const weekPanel = document.getElementById('week-panel-0');
          if (!weekPanel) return [];
          
          const links = weekPanel.querySelectorAll('a[href*="/c/"]');
          return Array.from(links)
            .map(a => (a as HTMLAnchorElement).href)
            .filter(href => href.includes('/c/') && href.includes('/a'));
        });
        
        console.log(`[Lidl] Found ${offerUrls.length} offer category links`);
        
        let allOffers: Offer[] = [];
        
        // Scrape each offer category (limit to avoid too many requests)
        for (const url of offerUrls.slice(0, 5)) {
          console.log(`[Lidl] Scraping category: ${url}`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(2000);
          
          await this.scrollToLoadAll(page);
          
          const categoryOffers = await this.extractOffers(page, store);
          console.log(`[Lidl] Found ${categoryOffers.length} offers in category`);
          allOffers = allOffers.concat(categoryOffers);
        }
        
        // Deduplicate
        const uniqueOffers = allOffers.filter((o, i, arr) => 
          arr.findIndex(x => x.name === o.name && x.offerPrice === o.offerPrice) === i
        );
        
        console.log(`[Lidl] Total unique offers: ${uniqueOffers.length}`);
        return { offers: uniqueOffers, store };
      } finally {
        await page.close();
      }
    });
  }

  private async extractOffers(page: Page, store: Store): Promise<Offer[]> {
    const offers: Offer[] = [];
    
    // Extract Lidl products using page.evaluate for better performance
    const rawProducts = await page.evaluate(() => {
      const products: any[] = [];
      
      // Use Lidl's specific product grid structure
      let items: Element[] = [];
      
      // Primary: Look for .product-grid-box (Lidl's product container)
      const productBoxes = document.querySelectorAll('.product-grid-box');
      if (productBoxes.length > 0) {
        items = Array.from(productBoxes);
      } else {
        // Fallback: older selectors
        const gridItems = document.querySelectorAll('[class*="AProductGrid"] > div, [class*="ProductGrid"] > div');
        items = Array.from(gridItems);
      }
      
      items.forEach(item => {
        try {
          // Find name - use Lidl's specific selectors
          let name: string | null = null;
          const titleEl = item.querySelector('.odsc-tile__link, [class*="name"], [class*="title"], h2, h3, h4');
          name = titleEl?.textContent?.trim() || null;
          
          // Find price
          const priceEl = item.querySelector('[class*="price"]:not([class*="original"]):not([class*="old"]), [class*="Price"]:not([class*="original"]):not([class*="old"])');
          const priceText = priceEl?.textContent?.trim();
          
          // Find image - use Lidl's specific selector: img.odsc-image-gallery__image
          // AVOID: img.seal__badge (quality badges)
          let imageUrl: string | null = null;
          
          // Primary: Lidl's main product image class
          const mainImg = item.querySelector('img.odsc-image-gallery__image') as HTMLImageElement;
          if (mainImg) {
            imageUrl = mainImg.getAttribute('src') || mainImg.getAttribute('data-src') || null;
          }
          
          // Fallback: any img that's not a badge
          if (!imageUrl) {
            const imgs = item.querySelectorAll('img:not(.seal__badge)');
            for (const img of Array.from(imgs)) {
              const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
              if (src && !src.startsWith('data:') && src.includes('assets.schwarz')) {
                imageUrl = src;
                break;
              }
            }
          }
          
          // Upgrade to larger image size if needed
          if (imageUrl) {
            imageUrl = imageUrl.replace(/\/w:\d+\//, '/w:400/');
          }
          
          if (name && priceText) {
            products.push({ name, priceText, imageUrl });
          }
        } catch (e) {
          // Skip problematic elements
        }
      });
      
      return products;
    });
    
    console.log(`[Lidl] Raw products extracted: ${rawProducts.length}`);
    
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
        const category = getCategory(undefined, name, 'lidl');
        
        const offer: Offer = {
          id: this.generateOfferId('lidl', store.externalId, name),
          name,
          offerPrice,
          imageUrl: raw.imageUrl || undefined,
          storeId: store.id,
          chain: 'lidl',
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
    console.log('[Lidl] Scrolling to load content...');
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  private async acceptCookies(page: Page): Promise<void> {
    try {
      // OneTrust cookie dialog - specific to Lidl
      const onetrustAccept = await page.$('#onetrust-accept-btn-handler');
      if (onetrustAccept) {
        console.log('[Lidl] Accepting OneTrust cookies...');
        await onetrustAccept.click();
        await page.waitForTimeout(2000);
        return;
      }
      
      // Generic cookie buttons
      const acceptBtn = await page.$('button:has-text("Acceptera"), button:has-text("Godkänn"), button[id*="accept"]');
      if (acceptBtn) {
        await acceptBtn.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('[Lidl] Cookie acceptance failed or not needed:', e);
    }
  }

  async validate(): Promise<ValidationResult> {
    const page = await this.newPage();
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const hasContent = await page.$('main, [class*="content"]');
      
      return {
        valid: !!hasContent,
        message: hasContent ? 'Lidl scraper validation passed' : 'Lidl page structure may have changed',
        chain: 'lidl',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        valid: false,
        message: `Lidl validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        chain: 'lidl',
        timestamp: new Date(),
      };
    } finally {
      await page.close();
    }
  }
}
