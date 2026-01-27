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
    
    // Extract Lidl products using HTML structure (.price-wrapper)
    const rawProducts = await page.evaluate(() => {
      const products: any[] = [];
      
      // Find all product grid boxes
      const productBoxes = document.querySelectorAll('.product-grid-box');
      
      productBoxes.forEach(item => {
        try {
          // Get product name from title link
          const titleEl = item.querySelector('.odsc-tile__link') as HTMLElement;
          const name = titleEl?.textContent?.trim();
          if (!name) return;
          
          // Get product image
          const img = item.querySelector('img.odsc-image-gallery__image') as HTMLImageElement;
          const imageUrl = img?.src || img?.getAttribute('data-src') || null;
          
          // Get price info from .price-wrapper structure
          const priceWrapper = item.querySelector('.price-wrapper');
          if (!priceWrapper) return;
          
          // Extract offer price from .ods-price__value (e.g., "15:-*" or "89,90")
          const priceValueEl = priceWrapper.querySelector('.ods-price__value');
          const priceText = priceValueEl?.textContent?.trim() || '';
          
          let offerPrice: number | undefined;
          // Match formats: "15:-", "15:-*", "89,90", "89.90"
          const priceMatch = priceText.match(/(\d+)[,.](\d{2})|(\d+):-/);
          if (priceMatch) {
            if (priceMatch[1] && priceMatch[2]) {
              offerPrice = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
            } else if (priceMatch[3]) {
              offerPrice = parseFloat(priceMatch[3]);
            }
          }
          
          if (!offerPrice || offerPrice <= 0) return;
          
          // Extract original price from .ods-price__stroke-price s (e.g., "19.80")
          let originalPrice: number | undefined;
          const strokePriceEl = priceWrapper.querySelector('.ods-price__stroke-price s');
          const strokeText = strokePriceEl?.textContent?.trim() || '';
          const strokeMatch = strokeText.match(/(\d+)[,.](\d{2})|(\d+)/);
          if (strokeMatch) {
            if (strokeMatch[1] && strokeMatch[2]) {
              originalPrice = parseFloat(`${strokeMatch[1]}.${strokeMatch[2]}`);
            } else if (strokeMatch[3]) {
              originalPrice = parseFloat(strokeMatch[3]);
            }
          }
          
          // Extract quantity from deal text (e.g., "2 FÖR:")
          let quantity: number | undefined;
          const dealTextEl = priceWrapper.querySelector('.ods-price__box-content-text-el');
          const dealText = dealTextEl?.textContent?.trim() || '';
          const quantityMatch = dealText.match(/(\d+)\s*FÖR/i);
          if (quantityMatch) {
            quantity = parseInt(quantityMatch[1]);
          }
          
          // Extract unit info from footer (e.g., "21 g, 24 g, 26 g/förp.")
          const footerEl = priceWrapper.querySelector('.ods-price__footer');
          const unit = footerEl?.textContent?.trim()?.split('\n')[0] || undefined;
          
          products.push({ 
            name, 
            offerPrice, 
            originalPrice,
            imageUrl, 
            quantity, 
            unit 
          });
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
        
        const offerPrice = raw.offerPrice;
        if (!offerPrice || offerPrice < 1 || offerPrice > 10000) continue;
        
        // Classify category
        const category = getCategory(undefined, name, 'lidl');
        
        // Handle quantity (X för Y kr) - offerPrice is total, calculate per-unit
        const quantity = raw.quantity && raw.quantity > 1 ? raw.quantity : undefined;
        const quantityPrice = quantity 
          ? Math.round((offerPrice / quantity) * 100) / 100 
          : undefined;
        
        // Build unit string
        let unit = raw.unit || undefined;
        if (quantity) {
          // Format as "2 för 15:- (7.50 kr/st)"
          unit = `${quantity} för ${offerPrice}:-` + (raw.unit ? ` (${raw.unit})` : '');
        }
        
        const offer: Offer = {
          id: this.generateOfferId('lidl', store.externalId, name),
          name,
          offerPrice,  // Total price for X items
          originalPrice: raw.originalPrice,
          quantity,
          quantityPrice,  // Per-unit price
          unit,
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
