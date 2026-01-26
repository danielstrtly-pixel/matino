import { Page } from 'playwright';
import { BaseScraper } from './base';
import type { Store, Offer, ScraperResult, StoreSearchResult, OffersResult, ValidationResult, ChainId } from '../types';

/**
 * Hemköp Scraper
 * 
 * Hemköp is part of Axfood (along with Willys).
 * Store-specific offers are shown on: https://www.hemkop.se/erbjudanden/{store-id}
 * 
 * The offers page uses a "tjek-incito" framework with:
 * - data-role="offer" elements for each product
 * - aria-label contains product name and price (e.g., "Munkar, SEK 5")
 * - Price may be split across multiple <p> elements
 */
export class HemkopScraper extends BaseScraper {
  readonly chainId: ChainId = 'hemkop';
  readonly chainName = 'Hemköp';
  
  private readonly baseUrl = 'https://www.hemkop.se';
  private readonly storeFinderUrl = 'https://www.hemkop.se/hitta-butik';

  async searchStores(query: string): Promise<ScraperResult<StoreSearchResult>> {
    return this.withTiming(async () => {
      const page = await this.newPage();
      
      try {
        await page.goto(this.storeFinderUrl, { waitUntil: 'domcontentloaded' });
        await this.waitForNetworkIdle(page);
        await this.acceptCookies(page);

        await page.waitForTimeout(3000);

        const searchInput = await page.$('input[type="text"], input[placeholder*="Sök"], input[name*="search"]');
        if (searchInput) {
          await searchInput.fill(query);
          await page.keyboard.press('Enter');
          await this.waitForNetworkIdle(page);
          await page.waitForTimeout(2000);
        }

        const stores = await this.extractStoresFromPage(page);
        return { stores, query };
      } finally {
        await page.close();
      }
    });
  }

  private async extractStoresFromPage(page: Page): Promise<Store[]> {
    const stores: Store[] = [];

    const storeElements = await page.$$('[class*="store-card"], [class*="store-item"], .store-result, li[class*="store"]');
    
    for (const element of storeElements) {
      try {
        const nameEl = await element.$('h2, h3, [class*="name"], [class*="title"], strong');
        const name = nameEl ? await nameEl.textContent() : null;
        
        const addressEl = await element.$('[class*="address"], address, .address, p');
        const address = addressEl ? await addressEl.textContent() : null;

        const link = await element.$('a[href*="/erbjudanden/"], a[href*="storeId"]');
        let externalId = '';
        
        if (link) {
          const href = await link.getAttribute('href');
          const match = href?.match(/\/erbjudanden\/(\d+)/) || href?.match(/storeId[=:](\d+)/);
          externalId = match ? match[1] : '';
        }

        if (!externalId) {
          const dataId = await element.getAttribute('data-store-id') || 
                         await element.getAttribute('data-id');
          externalId = dataId || '';
        }

        if (name && externalId) {
          stores.push({
            id: `hemkop-${externalId}`,
            name: name.trim(),
            address: address?.trim(),
            chain: 'hemkop',
            externalId,
          });
        }
      } catch (e) {
        // Skip malformed elements
      }
    }

    if (stores.length === 0) {
      const links = await page.$$('a[href*="/erbjudanden/"]');
      const seen = new Set<string>();
      
      for (const link of links) {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        const match = href?.match(/\/erbjudanden\/(\d+)/);
        
        if (match && text && !seen.has(match[1])) {
          seen.add(match[1]);
          stores.push({
            id: `hemkop-${match[1]}`,
            name: text.trim() || `Hemköp ${match[1]}`,
            chain: 'hemkop',
            externalId: match[1],
          });
        }
      }
    }

    return stores;
  }

  async getOffers(store: Store): Promise<ScraperResult<OffersResult>> {
    return this.withTiming(async () => {
      const page = await this.newPage();
      
      try {
        const offerUrl = `${this.baseUrl}/erbjudanden/${store.externalId}`;
        console.log(`[Hemköp] Loading ${offerUrl}`);
        await page.goto(offerUrl, { waitUntil: 'domcontentloaded' });
        await this.waitForNetworkIdle(page);
        await this.acceptCookies(page);

        // Wait for page to render
        await page.waitForTimeout(3000);

        // Scroll to load lazy content
        await this.scrollToLoadAll(page);

        // Extract offers using the data-role="offer" approach
        const offers = await this.extractOffersWithDataRole(page, store);

        console.log(`[Hemköp] Found ${offers.length} offers`);

        return {
          offers,
          store,
        };
      } finally {
        await page.close();
      }
    });
  }

  /**
   * Extract offers using data-role="offer" elements
   * This is the primary method for Hemköp's tjek-incito based offer pages
   */
  private async extractOffersWithDataRole(page: Page, store: Store): Promise<Offer[]> {
    const offers: Offer[] = [];
    
    // Find all offer elements
    const offerElements = await page.$$('[data-role="offer"]');
    console.log(`[Hemköp] Found ${offerElements.length} offer elements`);

    for (const element of offerElements) {
      try {
        // Get aria-label which often contains name and price
        const ariaLabel = await element.getAttribute('aria-label') || '';
        const fullText = (await element.textContent()) || '';
        
        // Extract name from aria-label (everything before ", SEK" or the full label)
        let name = ariaLabel;
        let priceFromLabel: number | undefined;
        
        // Try to extract price from aria-label: "Munkar, SEK 5" or "Blandfärs, SEK 49.95"
        const sekMatch = ariaLabel.match(/^(.+?),\s*SEK\s*([\d.]+)$/i);
        if (sekMatch) {
          name = sekMatch[1].trim();
          priceFromLabel = parseFloat(sekMatch[2]);
          
          // Check if this is a "X FÖR" deal - if so, divide by X
          // Look for pattern like "2 FÖR" in the full text
          const forMatch = fullText.match(/(\d+)\s*FÖR\s*$/i) || fullText.match(/(\d+)\s*FÖR\s/i);
          if (forMatch) {
            const quantity = parseInt(forMatch[1]);
            if (quantity > 1) {
              // priceFromLabel is the TOTAL price, divide by quantity
              priceFromLabel = Math.round((priceFromLabel / quantity) * 100) / 100;
            }
          }
        }
        
        // If no name from aria-label, try to find it in paragraphs
        if (!name || name.length < 2) {
          const paragraphs = await element.$$('p');
          for (const p of paragraphs) {
            const text = (await p.textContent())?.trim() || '';
            // Skip price-like paragraphs, KLUBBPRIS, KAMPANJPRIS, etc.
            if (text && 
                text.length > 2 && 
                !text.match(/^\d/) && 
                !text.match(/^\//) &&
                !text.match(/^KLUBBPRIS$/i) &&
                !text.match(/^KAMPANJPRIS$/i) &&
                !text.match(/^veckans/i) &&
                !text.match(/jfr-pris/i)) {
              name = text;
              break;
            }
          }
        }
        
        if (!name || name.length < 2) continue;
        
        // Get the offer price
        let offerPrice: number | undefined = priceFromLabel;
        let quantity: number | undefined;
        let quantityPrice: number | undefined;
        let unit: string | undefined;
        
        // If no price from aria-label, extract from paragraphs
        if (!offerPrice) {
          const paragraphs = await element.$$('p');
          const texts: string[] = [];
          
          for (const p of paragraphs) {
            const text = (await p.textContent())?.trim() || '';
            if (text) texts.push(text);
          }
          
          // Look for patterns in the collected texts
          for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            const nextText = texts[i + 1] || '';
            
            // "X FÖR" pattern AFTER price (e.g., "50:-" followed by "2 FÖR")
            // This is the common Hemköp pattern for multi-buy deals
            const priceBeforeFor = text.match(/^(\d+)(?::-|,(\d{2}))$/);
            const forAfterPrice = nextText.match(/^(\d+)\s*FÖR$/i);
            if (priceBeforeFor && forAfterPrice) {
              const whole = parseInt(priceBeforeFor[1]);
              const decimal = priceBeforeFor[2] ? parseInt(priceBeforeFor[2]) : 0;
              const totalPrice = whole + decimal / 100;
              quantity = parseInt(forAfterPrice[1]);
              quantityPrice = totalPrice;
              offerPrice = Math.round((totalPrice / quantity) * 100) / 100;
              break;
            }
            
            // Price with unit in next element (e.g., "10:-" followed by "/st")
            const priceMatch = text.match(/^(\d+)(?::-|,(\d{2}))$/);
            if (priceMatch && nextText.match(/^\/(?:st|kg|l|förp)$/i)) {
              const whole = parseInt(priceMatch[1]);
              const decimal = priceMatch[2] ? parseInt(priceMatch[2]) : 0;
              offerPrice = whole + decimal / 100;
              unit = nextText.replace('/', '');
              break;
            }
            
            // Combined price like "149:-/kg"
            const combinedMatch = text.match(/^(\d+)(?::-|,(\d{2}))?\/(st|kg|l|förp)$/i);
            if (combinedMatch) {
              const whole = parseInt(combinedMatch[1]);
              const decimal = combinedMatch[2] ? parseInt(combinedMatch[2]) : 0;
              offerPrice = whole + decimal / 100;
              unit = combinedMatch[3];
              break;
            }
          }
        }
        
        if (!offerPrice || offerPrice < 1 || offerPrice > 10000) continue;
        
        // Try to get image
        const imgEl = await element.$('img');
        let imageUrl = imgEl ? await imgEl.getAttribute('src') : undefined;
        
        // Also check for background-image in style
        if (!imageUrl) {
          const bgDiv = await element.$('[style*="background-image"]');
          if (bgDiv) {
            const style = await bgDiv.getAttribute('style') || '';
            const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
            if (bgMatch) {
              imageUrl = bgMatch[1];
            }
          }
        }
        
        // Check for membership requirement (fullText already declared above)
        const requiresMembership = /KLUBBPRIS/i.test(fullText);
        
        // Check for max per household
        let maxPerHousehold: number | undefined;
        const maxMatch = fullText.match(/Max\s*(\d+)\s*köp/i);
        if (maxMatch) {
          maxPerHousehold = parseInt(maxMatch[1]);
        }
        
        // Extract brand/description from the info text
        let brand: string | undefined;
        let description: string | undefined;
        
        // The info usually follows the product name in a separate paragraph
        const paragraphs = await element.$$('p');
        for (const p of paragraphs) {
          const text = (await p.textContent())?.trim() || '';
          // Look for pattern like "Brand, XXXg, ..." or product info
          if (text.match(/^\w+,\s*(?:\d+|ca\s*\d+)/i) && !text.includes('jfr-pris')) {
            const parts = text.split(',');
            if (parts.length >= 1) {
              brand = parts[0].trim();
              description = text;
            }
            break;
          }
        }
        
        // Clean up name
        name = name
          .replace(/^Klubbpris/i, '')
          .replace(/^Kampanjpris/i, '')
          .trim();
        
        // Create offer
        const offer: Offer = {
          id: this.generateOfferId('hemkop', store.externalId, name),
          name,
          brand,
          description,
          offerPrice,
          quantity,
          quantityPrice,
          unit,
          imageUrl: imageUrl || undefined,
          storeId: store.id,
          chain: 'hemkop',
          maxPerHousehold,
          requiresMembership,
          scrapedAt: new Date(),
        };
        
        // Check for duplicates
        const isDupe = offers.some(o => o.name === name && o.offerPrice === offerPrice);
        if (!isDupe) {
          offers.push(offer);
        }
        
      } catch (e) {
        // Skip problematic elements
        console.log(`[Hemköp] Error processing offer:`, e);
      }
    }

    return offers;
  }

  private async scrollToLoadAll(page: Page): Promise<void> {
    console.log('[Hemköp] Scrolling to load all content...');
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => {
        (globalThis as any).scrollBy(0, (globalThis as any).innerHeight);
      });
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      (globalThis as any).scrollTo(0, 0);
    });
  }

  private async acceptCookies(page: Page): Promise<void> {
    try {
      const acceptBtn = await page.$('#onetrust-accept-btn-handler, button:has-text("Acceptera"), button:has-text("Godkänn")');
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
      await page.goto(`${this.baseUrl}/erbjudanden/4147`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      const offers = await page.$$('[data-role="offer"]');
      
      if (offers.length > 0) {
        return {
          valid: true,
          message: `Hemköp scraper validation passed - found ${offers.length} offers`,
          chain: 'hemkop',
          timestamp: new Date(),
        };
      }
      
      return {
        valid: false,
        message: 'Hemköp page structure may have changed - no offers found',
        chain: 'hemkop',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        valid: false,
        message: `Hemköp validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        chain: 'hemkop',
        timestamp: new Date(),
      };
    } finally {
      await page.close();
    }
  }
}
