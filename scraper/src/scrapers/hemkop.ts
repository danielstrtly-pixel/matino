import { Page } from 'playwright';
import { BaseScraper } from './base';
import type { Store, Offer, ScraperResult, StoreSearchResult, OffersResult, ValidationResult, ChainId } from '../types';

/**
 * Hemköp Scraper
 * 
 * Hemköp is part of Axfood (along with Willys).
 * Store-specific offers are shown on: https://www.hemkop.se/erbjudanden/{store-id}
 * 
 * Store finder: https://www.hemkop.se/hitta-butik
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

        // Wait for the Angular app to load
        await page.waitForTimeout(3000);

        // Search for stores
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

    // Hemköp uses Angular - look for store cards
    const storeElements = await page.$$('[class*="store-card"], [class*="store-item"], .store-result, li[class*="store"]');
    
    for (const element of storeElements) {
      try {
        const nameEl = await element.$('h2, h3, [class*="name"], [class*="title"], strong');
        const name = nameEl ? await nameEl.textContent() : null;
        
        const addressEl = await element.$('[class*="address"], address, .address, p');
        const address = addressEl ? await addressEl.textContent() : null;

        // Extract store ID from link
        const link = await element.$('a[href*="/erbjudanden/"], a[href*="storeId"]');
        let externalId = '';
        
        if (link) {
          const href = await link.getAttribute('href');
          // URLs like /erbjudanden/4147 or ?storeId=4147
          const match = href?.match(/\/erbjudanden\/(\d+)/) || href?.match(/storeId[=:](\d+)/);
          externalId = match ? match[1] : '';
        }

        // Alternative: check data attributes
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

    // Fallback: extract from any links to offer pages
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
        // Try the direct offers URL first
        const offerUrl = `${this.baseUrl}/erbjudanden/${store.externalId}`;
        console.log(`[Hemköp] Loading ${offerUrl}`);
        await page.goto(offerUrl, { waitUntil: 'domcontentloaded' });
        await this.waitForNetworkIdle(page);
        await this.acceptCookies(page);

        // Wait for page to render
        await page.waitForTimeout(3000);

        // Look for "Se alla erbjudanden" or similar button and click it
        const showAllButton = await page.$('button:has-text("Se alla"), a:has-text("Se alla"), [class*="show-all"], [class*="view-all"]');
        if (showAllButton) {
          console.log('[Hemköp] Clicking "Se alla erbjudanden"');
          await showAllButton.click();
          await page.waitForTimeout(3000);
        }

        // Scroll to load lazy content
        await this.scrollToLoadAll(page);

        // Try to get page content for debugging
        const pageContent = await page.content();
        console.log(`[Hemköp] Page loaded, content length: ${pageContent.length}`);

        // Extract offers
        let offers = await this.extractOffersFromPage(page, store);

        // If no offers found, try alternative approach - look for product grids
        if (offers.length === 0) {
          console.log('[Hemköp] Trying alternative extraction...');
          offers = await this.extractFromProductGrid(page, store);
        }

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

  private async extractFromProductGrid(page: Page, store: Store): Promise<Offer[]> {
    const offers: Offer[] = [];

    // Hemköp uses a grid layout - look for common product card patterns
    const productSelectors = [
      '[data-testid*="product"]',
      '[class*="ProductCard"]',
      '[class*="product-card"]',
      '[class*="offer-card"]',
      '[class*="campaign"]',
      'article',
      '.product',
      '[class*="Product_"]',
      '[class*="Offer_"]',
    ];

    for (const selector of productSelectors) {
      const elements = await page.$$(selector);
      console.log(`[Hemköp] Selector "${selector}" found ${elements.length} elements`);
      
      if (elements.length > 3 && elements.length < 500) {
        // This looks like a product grid
        let debugCount = 0;
        let skippedEmpty = 0;
        let skippedNoPrice = 0;
        let skippedNoName = 0;
        
        for (const element of elements) {
          try {
            // Get all text content
            const text = await element.textContent() || '';

            // Log first 3 elements for debugging
            if (debugCount < 3) {
              console.log(`[Hemköp] Sample element ${debugCount + 1}: "${text.substring(0, 200).replace(/\n/g, ' ')}..."`);
              
              // Test price patterns
              const patterns = [
                /(\d+)[,.](\d{2})\/(?:st|kg|l|förp)/i,
                /(\d+)[,:](\d{2})\s*(?:kr|:-)/i,
                /(\d+)\s*(?:kr|:-)/i,
              ];
              for (const p of patterns) {
                const m = text.match(p);
                if (m) console.log(`[Hemköp]   Pattern ${p} matched: "${m[0]}"`);
              }
              debugCount++;
            }
            
            // Look for Swedish price patterns - Hemköp uses "5,00/st" format
            const pricePatterns = [
              /(\d+)[,.](\d{2})\/(?:st|kg|l|förp)/i,  // 5,00/st, 29,90/kg
              /(\d+)\s*för\s*(\d+)/i,                  // 2 för 79, 2 för 129
              /(\d+)[,:](\d{2})\s*(?:kr|:-)/i,        // 29,90 kr or 29:90:-
              /(\d+)\s*(?:kr|:-)/i,                    // 29 kr or 29:-
            ];
            
            let priceMatch = null;
            for (const pattern of pricePatterns) {
              priceMatch = text.match(pattern);
              if (priceMatch) break;
            }
            if (!priceMatch) {
              skippedNoPrice++;
              // Log first few skipped items for debugging
              if (skippedNoPrice <= 5) {
                console.log(`[Hemköp] No price match in: "${text.substring(0, 100).replace(/\n/g, ' ')}..."`);
              }
              continue;
            }
            
            // Skip empty/placeholder elements
            if (text.trim().length < 10) {
              skippedEmpty++;
              continue;
            }

            // Get potential product name
            // Hemköp format: "5,00/st5,00/stMunkarDafgårds, 63g..."
            // Name usually follows the double price pattern
            let name: string | null = null;
            
            // Handle "Välj och blanda" format: "Välj och blandaKaffe..."
            const valjOchBlandaMatch = text.match(/Välj och blanda\s*([A-ZÅÄÖ][a-zåäö]+[^0-9]*?)(?:\d|Jmf|Gäller)/i);
            if (valjOchBlandaMatch) {
              name = 'Välj och blanda: ' + valjOchBlandaMatch[1].trim();
            }
            
            // Try to extract name from after the price pattern
            if (!name || name.length < 2) {
              const afterPriceMatch = text.match(/(?:\d+[,.]?\d*\/(?:st|kg|l|förp)){1,2}(.+?)(?:Lägsta|Erbjudandets|\d+\s*dgr)/i);
              if (afterPriceMatch) {
                name = afterPriceMatch[1].trim();
              }
            }
            
            // Try "X för Y" pattern extraction
            if (!name || name.length < 2) {
              const forPatternMatch = text.match(/\d+\s*för\s*\d+\s*kr\s*([A-ZÅÄÖ][^0-9]+?)(?:\d|Jmf|Gäller|$)/i);
              if (forPatternMatch) {
                name = forPatternMatch[1].trim();
              }
            }
            
            // Try heading elements as fallback
            if (!name || name.length < 2) {
              const nameEl = await element.$('h1, h2, h3, h4, strong, [class*="name"], [class*="title"]');
              name = nameEl ? (await nameEl.textContent())?.trim() || null : null;
            }
            
            // Log debug info
            if (debugCount <= 3) {
              console.log(`[Hemköp]   Extracted name: "${name}"`);
            }
            
            if (!name || name.length < 2) {
              skippedNoName++;
              continue;
            }

            // Get price - construct proper price string
            let priceStr = priceMatch[0];
            let price: number | undefined;
            
            // Handle "X för Y" format (e.g., "2 för 79")
            const forMatch = priceStr.match(/(\d+)\s*för\s*(\d+)/i);
            if (forMatch) {
              const count = parseInt(forMatch[1]);
              const total = parseInt(forMatch[2]);
              price = Math.round((total / count) * 100) / 100;
            } else {
              price = this.parsePrice(priceStr);
            }
            
            if (!price || price < 1 || price > 10000) continue;

            // Get image
            const imgEl = await element.$('img');
            const imageUrl = imgEl ? await imgEl.getAttribute('src') : undefined;

            // Clean up the name - remove "Klubbpris" prefix and extra info
            name = name.replace(/^Klubbpris/i, '').trim();
            name = name.replace(/Ordinarie pris.*$/i, '').trim();
            name = name.replace(/Ord pris.*$/i, '').trim();
            
            // Check for duplicates
            const existingOffer = offers.find(o => o.name === name && o.offerPrice === price);
            if (existingOffer) continue;

            offers.push({
              id: this.generateOfferId('hemkop', store.externalId, name),
              name,
              offerPrice: price,
              imageUrl: imageUrl || undefined,
              storeId: store.id,
              chain: 'hemkop',
              scrapedAt: new Date(),
            });

          } catch (e) {
            // Skip problematic elements
          }
        }

        if (offers.length > 0) {
          console.log(`[Hemköp] Stats: ${elements.length} elements, ${skippedEmpty} empty, ${skippedNoPrice} no price, ${skippedNoName} no name, ${offers.length} offers`);
          break; // Found offers, stop trying selectors
        }
      }
    }

    return offers;
  }

  private async scrollToLoadAll(page: Page): Promise<void> {
    // Scroll down multiple times to trigger lazy loading
    console.log('[Hemköp] Scrolling to load all content...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        (globalThis as any).scrollBy(0, (globalThis as any).innerHeight);
      });
      await page.waitForTimeout(800);
    }
    // Wait for any final content to load
    await page.waitForTimeout(2000);
    // Scroll back to top
    await page.evaluate(() => {
      (globalThis as any).scrollTo(0, 0);
    });
  }

  private async extractOffersFromPage(page: Page, store: Store): Promise<Offer[]> {
    const offers: Offer[] = [];

    // Try to find offer elements with various selectors
    const selectors = [
      '[class*="offer-card"]',
      '[class*="product-card"]',
      '[class*="campaign-product"]',
      'article[class*="offer"]',
      '.offer-item',
      '[data-testid*="offer"]',
    ];

    let offerElements: any[] = [];
    for (const selector of selectors) {
      offerElements = await page.$$(selector);
      if (offerElements.length > 0) break;
    }

    for (const element of offerElements) {
      try {
        const offer = await this.parseOfferElement(element, store);
        if (offer) {
          offers.push(offer);
        }
      } catch (e) {
        // Skip malformed elements
      }
    }

    // If no offers found, try to find them in the page content
    if (offers.length === 0) {
      // Look for text-based offer patterns
      const pageContent = await page.content();
      console.log(`[Hemköp] No offers found for store ${store.externalId}, checking page structure...`);
      
      // Try alternative extraction
      const altOffers = await this.extractOffersAlternative(page, store);
      offers.push(...altOffers);
    }

    return offers;
  }

  private async extractOffersAlternative(page: Page, store: Store): Promise<Offer[]> {
    const offers: Offer[] = [];
    
    // Look for any cards/items with price information
    const items = await page.$$('[class*="card"], [class*="item"], article, li');
    
    for (const item of items) {
      const text = await item.textContent();
      
      // Look for price patterns
      if (text && /\d+\s*(kr|:-|,\d{2})/i.test(text)) {
        const priceMatch = text.match(/(\d+(?:[,\.]\d+)?)\s*(kr|:-)/i);
        if (priceMatch) {
          const name = text.split(/\d+\s*(kr|:-)/i)[0].trim().slice(0, 100);
          if (name.length > 3) {
            offers.push({
              id: this.generateOfferId('hemkop', store.externalId, name),
              name,
              offerPrice: this.parsePrice(priceMatch[0]) || 0,
              storeId: store.id,
              chain: 'hemkop',
              scrapedAt: new Date(),
            });
          }
        }
      }
    }
    
    return offers.slice(0, 50); // Limit to prevent noise
  }

  private async parseOfferElement(element: any, store: Store): Promise<Offer | null> {
    try {
      // Extract name
      const nameEl = await element.$('h2, h3, h4, [class*="name"], [class*="title"], .product-name');
      const name = nameEl ? (await nameEl.textContent())?.trim() : null;
      if (!name || name.length < 2) return null;

      // Extract brand
      const brandEl = await element.$('[class*="brand"], [class*="manufacturer"]');
      const brand = brandEl ? (await brandEl.textContent())?.trim() : undefined;

      // Extract price
      const priceEl = await element.$('[class*="price"], [class*="pris"], .campaign-price');
      const priceText = priceEl ? (await priceEl.textContent())?.trim() : '';
      const offerPrice = this.parsePrice(priceText || '');
      if (!offerPrice) return null;

      // Extract original price
      const origPriceEl = await element.$('[class*="original"], [class*="ordinary"], s, del, .was-price');
      const origPriceText = origPriceEl ? (await origPriceEl.textContent())?.trim() : '';
      const originalPrice = this.parsePrice(origPriceText || '');

      // Extract savings
      const savingsEl = await element.$('[class*="discount"], [class*="savings"], [class*="badge"], .save');
      const savings = savingsEl ? (await savingsEl.textContent())?.trim() : undefined;

      // Extract image
      const imgEl = await element.$('img');
      const imageUrl = imgEl ? await imgEl.getAttribute('src') : undefined;

      // Extract description
      const descEl = await element.$('[class*="description"], [class*="info"], .details');
      const description = descEl ? (await descEl.textContent())?.trim() : undefined;

      // Check for max per household
      const limitEl = await element.$('[class*="limit"], [class*="max"]');
      const limitText = limitEl ? await limitEl.textContent() : '';
      const maxMatch = limitText?.match(/max\s*(\d+)/i);
      const maxPerHousehold = maxMatch ? parseInt(maxMatch[1]) : undefined;

      return {
        id: this.generateOfferId('hemkop', store.externalId, name),
        name,
        brand,
        description,
        originalPrice,
        offerPrice,
        unit: this.parseUnit(priceText || ''),
        savings,
        imageUrl: imageUrl || undefined,
        storeId: store.id,
        chain: 'hemkop',
        maxPerHousehold,
        scrapedAt: new Date(),
      };
    } catch (e) {
      return null;
    }
  }

  private async acceptCookies(page: Page): Promise<void> {
    try {
      // Look for cookie consent buttons
      const acceptBtn = await page.$('button:has-text("Acceptera"), button:has-text("Godkänn"), [class*="accept"], #onetrust-accept-btn-handler');
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
      // Test with a known store ID
      await page.goto(`${this.baseUrl}/erbjudanden/4147`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      const hasContent = await page.$('body');
      const pageText = await page.textContent('body');
      
      // Check for expected content
      if (pageText && (pageText.includes('erbjudanden') || pageText.includes('Hemköp'))) {
        return {
          valid: true,
          message: 'Hemköp scraper validation passed',
          chain: 'hemkop',
          timestamp: new Date(),
        };
      }
      
      return {
        valid: false,
        message: 'Hemköp page structure may have changed',
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
