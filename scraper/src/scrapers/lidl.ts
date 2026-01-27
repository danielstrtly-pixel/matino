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
    
    // Extract Lidl products - try JSON data first, then fallback to text parsing
    const rawProducts = await page.evaluate(() => {
      const products: any[] = [];
      
      // Method 1: Try parsing JSON from data-grid-data attributes (most reliable)
      const jsonElements = document.querySelectorAll('[data-grid-data]');
      jsonElements.forEach(item => {
        try {
          const jsonStr = item.getAttribute('data-grid-data');
          if (!jsonStr) return;
          
          const data = JSON.parse(jsonStr);
          
          const name = data.fullTitle || data.title || data.keyfacts?.title;
          if (!name) return;
          
          const priceData = data.price;
          if (!priceData) return;
          
          // Price can be in price.price or at top level
          // Ensure we get a numeric value - sometimes it's a string like "89,90"
          let rawPrice = priceData.price;
          let offerPrice: number;
          if (typeof rawPrice === 'string') {
            // Handle Swedish price format: "89,90" or "1 för 89,90"
            const priceMatch = rawPrice.match(/(\d+)[,.](\d{2})|(\d+)/);
            if (priceMatch) {
              if (priceMatch[1] && priceMatch[2]) {
                offerPrice = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
              } else {
                offerPrice = parseFloat(priceMatch[3] || priceMatch[0]);
              }
            } else {
              return; // Skip if we can't parse the price
            }
          } else {
            offerPrice = rawPrice;
          }
          
          let quantity: number | undefined;
          let originalPrice: number | undefined = priceData.oldPrice || undefined;
          
          // Check for "X FÖR" deals in discountText
          const discountText = priceData.discount?.discountText || '';
          const forMatch = discountText.match(/(\d+)\s*FÖR/i);
          if (forMatch) {
            quantity = parseInt(forMatch[1]);
            // When it's "2 FÖR 15", price.price IS the total (15), not per-unit
            // originalPrice.oldPrice is the normal price (2 × single price)
          }
          
          // Also check if discountText has price info like "2 FÖR 89,90"
          const discountPriceMatch = discountText.match(/(\d+)\s*FÖR\s*(\d+)[,.]?(\d{0,2})/i);
          if (discountPriceMatch) {
            quantity = parseInt(discountPriceMatch[1]);
            const whole = discountPriceMatch[2];
            const decimal = discountPriceMatch[3] || '00';
            offerPrice = parseFloat(`${whole}.${decimal}`);
          }
          
          let unit = priceData.basePrice?.text || undefined;
          let imageUrl = data.image || data.image_V1?.image || null;
          
          // Check for Lidl Plus price
          if (data.lidlPlus && data.lidlPlus.length > 0) {
            const lidlPlusPrice = data.lidlPlus[0]?.price?.price;
            if (lidlPlusPrice && lidlPlusPrice < offerPrice) {
              originalPrice = offerPrice;
              offerPrice = lidlPlusPrice;
            }
          }
          
          // Skip items without valid price
          if (!offerPrice || offerPrice <= 0) return;
          
          // Return raw debug data for products with suspiciously low prices
          const debugData = (offerPrice <= 10) 
            ? JSON.stringify({ rawPrice, priceRaw: priceData.price, discountText }) 
            : undefined;
          
          products.push({ name, offerPrice, imageUrl, quantity, originalPrice, unit, debugData });
        } catch (e) {}
      });
      
      // Method 2: If JSON didn't work, fallback to .product-grid-box parsing
      if (products.length === 0) {
        const productBoxes = document.querySelectorAll('.product-grid-box, .AProductGridbox__GridTilePlaceholder');
        productBoxes.forEach(item => {
          try {
            // Try to get JSON from this element or parent
            let jsonStr = item.getAttribute('data-grid-data');
            if (!jsonStr) {
              const parent = item.closest('[data-grid-data]');
              jsonStr = parent?.getAttribute('data-grid-data') || null;
            }
            
            if (jsonStr) {
              const data = JSON.parse(jsonStr);
              const name = data.fullTitle || data.title;
              const priceData = data.price;
              if (name && priceData?.price) {
                // Parse price properly (may be string like "89,90")
                let rawPrice = priceData.price;
                let offerPrice: number;
                if (typeof rawPrice === 'string') {
                  const priceMatch = rawPrice.match(/(\d+)[,.](\d{2})|(\d+)/);
                  if (priceMatch) {
                    if (priceMatch[1] && priceMatch[2]) {
                      offerPrice = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
                    } else {
                      offerPrice = parseFloat(priceMatch[3] || priceMatch[0]);
                    }
                  } else {
                    return;
                  }
                } else {
                  offerPrice = rawPrice;
                }
                
                let quantity: number | undefined;
                const discountText = priceData.discount?.discountText || '';
                const forMatch = discountText.match(/(\d+)\s*FÖR/i);
                if (forMatch) quantity = parseInt(forMatch[1]);
                
                // Check for price in discountText like "2 FÖR 89,90"
                const discountPriceMatch = discountText.match(/(\d+)\s*FÖR\s*(\d+)[,.]?(\d{0,2})/i);
                if (discountPriceMatch) {
                  quantity = parseInt(discountPriceMatch[1]);
                  const whole = discountPriceMatch[2];
                  const decimal = discountPriceMatch[3] || '00';
                  offerPrice = parseFloat(`${whole}.${decimal}`);
                }
                
                products.push({
                  name,
                  offerPrice,
                  imageUrl: data.image,
                  quantity,
                  originalPrice: priceData.oldPrice,
                  unit: priceData.basePrice?.text,
                });
              }
              return;
            }
            
            // Fallback to text parsing
            const titleEl = item.querySelector('.odsc-tile__link, [class*="name"], [class*="title"], h2, h3, h4');
            const name = titleEl?.textContent?.trim();
            if (!name) return;
            
            const fullText = item.textContent || '';
            
            // Extract price
            let offerPrice: number | undefined;
            const priceMatch = fullText.match(/(\d+)[,.](\d{2})|(\d+):-/);
            if (priceMatch) {
              if (priceMatch[1] && priceMatch[2]) {
                offerPrice = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
              } else if (priceMatch[3]) {
                offerPrice = parseFloat(priceMatch[3]);
              }
            }
            
            // Extract quantity from "X för Y kr" - handle decimals properly
            let quantity: number | undefined;
            const forMatch = fullText.match(/(\d+)\s*för\s*(\d+)[,.]?(\d{0,2})/i);
            if (forMatch) {
              quantity = parseInt(forMatch[1]);
              // Build proper decimal price
              const whole = forMatch[2];
              const decimal = forMatch[3] || '00';
              offerPrice = parseFloat(`${whole}.${decimal}`);
            }
            
            // Extract image
            let imageUrl: string | null = null;
            const img = item.querySelector('img.odsc-image-gallery__image, img[src*="assets.schwarz"]') as HTMLImageElement;
            if (img) imageUrl = img.src || img.getAttribute('data-src');
            
            // Extract unit
            const unitMatch = fullText.match(/(\d+\s*g|\d+\s*ml|\d+\s*l|\/kg|\/st)/i);
            const unit = unitMatch ? unitMatch[1] : undefined;
            
            if (name && offerPrice && offerPrice > 0) {
              products.push({ name, offerPrice, imageUrl, quantity, unit });
            }
          } catch (e) {}
        });
      }
      
      return products;
    });
    
    console.log(`[Lidl] Raw products extracted: ${rawProducts.length}`);
    
    // Process raw products
    for (const raw of rawProducts) {
      try {
        // Log debug data for problematic products
        if (raw.debugData) {
          console.log(`[Lidl Debug] ${raw.name}:`, raw.debugData);
        }
        
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
