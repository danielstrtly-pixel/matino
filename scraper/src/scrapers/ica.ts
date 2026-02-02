import { Page } from 'playwright';
import { BaseScraper } from './base';
import type { Store, Offer, ScraperResult, StoreSearchResult, OffersResult, ValidationResult, ChainId } from '../types';
import { getCategory } from '../categories';

/**
 * ICA Scraper
 * 
 * ICA has both national offers (TV-erbjudanden) and store-specific offers.
 * Users need to select a store to see all offers.
 * 
 * Store search: https://www.ica.se/butiker/
 * Offers: https://www.ica.se/erbjudanden/ (requires store selection for full list)
 */
export class ICAScraper extends BaseScraper {
  readonly chainId: ChainId = 'ica';
  readonly chainName = 'ICA';
  
  private readonly baseUrl = 'https://www.ica.se';
  private readonly storeSearchUrl = 'https://www.ica.se/butiker/';
  private readonly offersUrl = 'https://www.ica.se/erbjudanden/';

  async searchStores(query: string): Promise<ScraperResult<StoreSearchResult>> {
    return this.withTiming(async () => {
      // Use ICA's mdsastoresearch API - requires a browser session to get auth token
      const page = await this.newPage();
      
      try {
        let authToken: string | null = null;
        let firstPageData: any = null;
        let apiUrlParam: string | null = null; // Capture the actual URL param used by ICA
        
        // Intercept API requests to get auth token and URL param
        page.on('request', (req) => {
          const url = req.url();
          if (url.includes('mdsastoresearch')) {
            authToken = req.headers()['authorization'] || null;
            // Extract the url parameter (ICA converts special chars to ASCII)
            const match = url.match(/url=([^&]+)/);
            if (match) {
              apiUrlParam = match[1];
            }
          }
        });
        
        page.on('response', async (res) => {
          if (res.url().includes('mdsastoresearch')) {
            try {
              firstPageData = await res.json();
            } catch(e) {}
          }
        });
        
        // Go to store search page and search
        await page.goto(this.storeSearchUrl, { waitUntil: 'domcontentloaded' });
        await this.waitForNetworkIdle(page);
        
        // Find search input and enter query
        const input = await page.$('input[type="search"]');
        if (input) {
          await input.fill(query);
          await page.keyboard.press('Enter');
          // Wait for search results
          await page.waitForTimeout(4000);
        }
        
        if (firstPageData?.storeCards && authToken && apiUrlParam) {
          const allStoreCards: any[] = [...firstPageData.storeCards];
          const totalStores = firstPageData.totalNrOfStores || allStoreCards.length;
          const pageSize = 20;
          
          // Fetch remaining pages if needed
          if (totalStores > pageSize) {
            const baseApiUrl = `https://apim-pub.gw.ica.se/sverige/digx/mdsastoresearch/v1/page-and-filters`;
            
            for (let skip = pageSize; skip < totalStores; skip += pageSize) {
              try {
                const apiUrl = `${baseApiUrl}?url=${apiUrlParam}&take=${pageSize}&skip=${skip}`;
                const res = await fetch(apiUrl, {
                  headers: {
                    'Authorization': authToken,
                    'Accept': 'application/json',
                  }
                });
                if (res.ok) {
                  const pageData = await res.json() as any;
                  if (pageData?.storeCards) {
                    allStoreCards.push(...pageData.storeCards);
                  }
                }
              } catch (e) {
                console.log(`[ICA] Failed to fetch page at skip=${skip}:`, e);
              }
            }
          }
          
          const stores: Store[] = allStoreCards.map((s: any) => ({
            id: `ica-${s.accountNumber}`,
            name: s.storeName,
            address: s.address ? `${s.address.street}, ${s.address.postalCode} ${s.address.city}` : undefined,
            city: s.address?.city,
            chain: 'ica' as ChainId,
            externalId: s.accountNumber,
            profile: s.profile, // Maxi, Kvantum, Supermarket, Nära
            offersUrl: s.highlightUrls?.offers?.url,
          }));
          
          return { 
            stores, 
            query,
            totalCount: totalStores 
          };
        }
        
        // Fallback to old scraper method if API didn't work
        console.log('[ICA] mdsastoresearch API did not return data, falling back');
        return this.searchStoresWithScraper(query);
      } finally {
        await page.close();
      }
    });
  }
  
  // Fallback scraper-based search
  private async searchStoresWithScraper(query: string): Promise<StoreSearchResult> {
    const page = await this.newPage();
    
    try {
      await page.goto(this.storeSearchUrl, { waitUntil: 'domcontentloaded' });
      await this.waitForNetworkIdle(page);
      await this.acceptCookies(page);

      const searchInput = await page.waitForSelector('input[placeholder*="butik"], input[type="search"], input[name*="search"]', { timeout: 5000 });
      if (searchInput) {
        await searchInput.fill(query);
        await page.keyboard.press('Enter');
        await this.waitForNetworkIdle(page);
      }

      const stores = await this.extractStoresFromPage(page);
      return { stores, query };
    } finally {
      await page.close();
    }
  }

  private async extractStoresFromPage(page: Page): Promise<Store[]> {
    const stores: Store[] = [];

    // Wait for store list to load
    await page.waitForTimeout(2000);

    // Try different selectors for store listings
    const storeElements = await page.$$('[data-testid*="store"], .store-card, .store-item, article[class*="store"]');
    
    for (const element of storeElements) {
      try {
        const nameEl = await element.$('h2, h3, [class*="name"], [class*="title"]');
        const name = nameEl ? await nameEl.textContent() : null;
        
        const addressEl = await element.$('[class*="address"], address, p');
        const address = addressEl ? await addressEl.textContent() : null;

        // Try to extract store ID from link or data attribute
        const link = await element.$('a[href*="/butiker/"]');
        let externalId = '';
        if (link) {
          const href = await link.getAttribute('href');
          const match = href?.match(/\/butiker\/[^/]+\/([^/]+)/);
          externalId = match ? match[1] : '';
        }

        if (name && externalId) {
          stores.push({
            id: `ica-${externalId}`,
            name: name.trim(),
            address: address?.trim(),
            chain: 'ica',
            externalId,
          });
        }
      } catch (e) {
        // Skip malformed elements
      }
    }

    // If no stores found with complex selectors, try simpler approach
    if (stores.length === 0) {
      const links = await page.$$('a[href*="/butiker/ica"]');
      for (const link of links.slice(0, 20)) {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        const match = href?.match(/\/butiker\/([^/]+)\/([^/]+)/);
        
        if (match && text) {
          stores.push({
            id: `ica-${match[2]}`,
            name: text.trim(),
            chain: 'ica',
            externalId: match[2],
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
        // Use store's offers URL if available, otherwise construct it
        const storeOfferUrl = store.offersUrl || 
          `${this.baseUrl}/erbjudanden/ica-${store.externalId}/`;
        
        console.log(`[ICA] Loading offers from: ${storeOfferUrl}`);
        await page.goto(storeOfferUrl, { waitUntil: 'domcontentloaded' });
        await this.waitForNetworkIdle(page);

        // Accept cookies
        await this.acceptCookies(page);

        // Click on "I butik" tab to get store-specific offers (not just national)
        try {
          const inStoreTab = await page.$('button:has-text("I butik"), [role="tab"]:has-text("I butik")');
          if (inStoreTab) {
            console.log('[ICA] Clicking "I butik" tab');
            await inStoreTab.click();
            await page.waitForTimeout(2000);
          }
        } catch (e) {
          console.log('[ICA] No "I butik" tab found, continuing with default view');
        }

        // Scroll to load all offers (lazy loading)
        await this.scrollToLoadAll(page);

        // Extract offers
        const offers = await this.extractOffersFromPage(page, store);
        console.log(`[ICA] Extracted ${offers.length} offers`);

        return {
          offers,
          store,
        };
      } finally {
        await page.close();
      }
    });
  }

  private async scrollToLoadAll(page: Page): Promise<void> {
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrolls = 10;

    while (scrollAttempts < maxScrolls) {
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === previousHeight) {
        break; // No more content to load
      }
      
      previousHeight = currentHeight;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
      scrollAttempts++;
    }
    
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  private async extractOffersFromPage(page: Page, store: Store): Promise<Offer[]> {
    const offers: Offer[] = [];

    // ICA uses various card structures - try multiple selectors
    const selectors = [
      '[data-testid*="offer"]',
      '[data-testid*="product"]', 
      'article[class*="offer"]',
      'article[class*="product"]',
      'div[class*="OfferCard"]',
      'div[class*="ProductCard"]',
      'a[href*="/erbjudanden/"] > div',
      '[class*="offer-card"]',
      '[class*="product-card"]',
    ];

    let offerElements: any[] = [];
    
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      if (elements.length > offerElements.length) {
        offerElements = elements;
      }
    }

    console.log(`[ICA] Found ${offerElements.length} potential offer elements`);

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

    // If still no offers, try extracting from page content directly
    if (offers.length < 10) {
      console.log('[ICA] Trying alternative extraction method');
      const altOffers = await this.extractOffersAlternative(page, store);
      if (altOffers.length > offers.length) {
        return altOffers;
      }
    }

    return offers;
  }

  private async extractOffersAlternative(page: Page, store: Store): Promise<Offer[]> {
    // Extract offers by looking at the page structure directly
    const rawOffers = await page.evaluate((storeData: { id: string; externalId: string }) => {
      const offers: Array<{
        id: string;
        name: string;
        brand: string | undefined;
        offerPrice: number;
        quantity: number | undefined;
        quantityPrice: number | undefined;
        imageUrl: string | undefined;
        offerUrl: string | undefined;
        storeId: string;
        chain: string;
        requiresMembership: boolean;
        scrapedAt: string;
      }> = [];
      
      // Find all elements that look like offer cards (have price + name)
      const allElements = Array.from(document.querySelectorAll('article, [class*="card"], [class*="Card"]'));
      
      for (const el of allElements) {
        const text = el.textContent || '';
        
        let price: number | null = null;
        let quantity: number | undefined = undefined;
        let quantityPrice: number | undefined = undefined;
        
        // Check for "X för Y kr" format first (e.g., "3 för 89 kr")
        const multiMatch = text.match(/(\d+)\s*för\s*(\d+)\s*kr/i);
        if (multiMatch) {
          quantity = parseInt(multiMatch[1], 10);
          price = parseInt(multiMatch[2], 10);
          quantityPrice = Math.round((price / quantity) * 100) / 100;
        } else {
          // Regular price pattern (XX:- or XX kr)
          const priceMatch = text.match(/(\d+)[:\s]*[-–]?\s*(?:kr|\/)/i) || text.match(/(\d+)\s*kr/i);
          if (priceMatch) {
            price = parseInt(priceMatch[1], 10);
          }
        }
        
        if (!price) continue;
        
        // Get all text nodes
        const h2 = el.querySelector('h2, h3, h4');
        const name = h2?.textContent?.trim();
        if (!name || name.length < 2) continue;
        
        // Get image
        const img = el.querySelector('img');
        const imageUrl = img?.getAttribute('src') || undefined;
        
        // Get offer URL from link
        const link = el.querySelector('a[href]') as HTMLAnchorElement;
        const offerUrl = link?.href || undefined;
        
        // Check for Stammis (member) price
        const isStammis = text.toLowerCase().includes('stammis');
        
        // Get brand/description from paragraph
        const p = el.querySelector('p');
        const brand = p?.textContent?.trim();
        
        if (price > 0 && price < 10000) {
          offers.push({
            id: `ica-${storeData.externalId}-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name,
            brand,
            offerPrice: price,
            quantity,
            quantityPrice,
            imageUrl,
            offerUrl,
            storeId: storeData.id,
            chain: 'ica',
            requiresMembership: isStammis,
            scrapedAt: new Date().toISOString(),
          });
        }
      }
      
      return offers;
    }, { id: store.id, externalId: store.externalId });
    
    // Convert string dates to Date objects and add category
    return rawOffers.map(o => ({
      ...o,
      offerUrl: o.offerUrl || undefined,
      scrapedAt: new Date(o.scrapedAt),
      category: getCategory(undefined, o.name, 'ica'),
    })) as Offer[];
  }

  private async parseOfferElement(element: any, store: Store): Promise<Offer | null> {
    try {
      // Extract name
      const nameEl = await element.$('h2, h3, h4, [class*="name"], [class*="title"]');
      const name = nameEl ? (await nameEl.textContent())?.trim() : null;
      if (!name) return null;

      // Extract brand
      const brandEl = await element.$('[class*="brand"], [class*="manufacturer"], span:first-child');
      const brand = brandEl ? (await brandEl.textContent())?.trim() : undefined;

      // Extract price - check for "X för Y kr" format first
      const priceEl = await element.$('[class*="price"], [class*="pris"]');
      const priceText = priceEl ? (await priceEl.textContent())?.trim() : '';
      
      let offerPrice: number | undefined = undefined;
      let quantity: number | undefined = undefined;
      let quantityPrice: number | undefined = undefined;
      
      // Check for "X för Y kr" format (e.g., "3 för 89 kr")
      const multiMatch = priceText?.match(/(\d+)\s*för\s*(\d+)\s*kr/i);
      if (multiMatch) {
        quantity = parseInt(multiMatch[1], 10);
        offerPrice = parseInt(multiMatch[2], 10);
        quantityPrice = Math.round((offerPrice / quantity) * 100) / 100;
      } else {
        offerPrice = this.parsePrice(priceText || '');
      }
      
      if (!offerPrice) return null;

      // Extract original price (if on sale)
      const origPriceEl = await element.$('[class*="original"], [class*="ord-pris"], s, del');
      const origPriceText = origPriceEl ? (await origPriceEl.textContent())?.trim() : '';
      const originalPrice = this.parsePrice(origPriceText || '');

      // Extract savings badge
      const savingsEl = await element.$('[class*="discount"], [class*="savings"], [class*="badge"]');
      const savings = savingsEl ? (await savingsEl.textContent())?.trim() : undefined;

      // Extract image
      const imgEl = await element.$('img');
      const imageUrl = imgEl ? await imgEl.getAttribute('src') : undefined;

      // Extract description
      const descEl = await element.$('[class*="description"], [class*="info"], p');
      const description = descEl ? (await descEl.textContent())?.trim() : undefined;

      // Extract offer URL
      const linkEl = await element.$('a[href]');
      const offerUrl = linkEl ? await linkEl.getAttribute('href') : undefined;

      // Check for membership requirement
      const memberEl = await element.$('[class*="stammis"], [class*="member"]');
      const requiresMembership = !!memberEl;

      // Classify category based on product name
      const category = getCategory(undefined, name, 'ica');

      return {
        id: this.generateOfferId('ica', store.externalId, name),
        name,
        brand,
        description,
        originalPrice,
        offerPrice,
        quantity,
        quantityPrice,
        unit: this.parseUnit(priceText || ''),
        savings,
        imageUrl: imageUrl || undefined,
        offerUrl: offerUrl ? (offerUrl.startsWith('http') ? offerUrl : `https://www.ica.se${offerUrl}`) : undefined,
        storeId: store.id,
        chain: 'ica',
        category,
        requiresMembership,
        scrapedAt: new Date(),
      };
    } catch (e) {
      return null;
    }
  }

  private dedupeOffers(offers: Offer[]): Offer[] {
    const seen = new Set<string>();
    return offers.filter(offer => {
      const key = `${offer.name}-${offer.offerPrice}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async acceptCookies(page: Page): Promise<void> {
    try {
      const acceptBtn = await page.$('button[id*="accept"], button[class*="accept"], button:has-text("Acceptera")');
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
      await page.goto(this.offersUrl, { waitUntil: 'domcontentloaded' });
      
      // Check for essential elements
      const hasTitle = await page.$('h1, [class*="title"]');
      const hasContent = await page.$('main, [class*="content"]');
      
      if (hasTitle && hasContent) {
        return {
          valid: true,
          message: 'ICA scraper validation passed',
          chain: 'ica',
          timestamp: new Date(),
        };
      }
      
      return {
        valid: false,
        message: 'ICA page structure may have changed',
        chain: 'ica',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        valid: false,
        message: `ICA validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        chain: 'ica',
        timestamp: new Date(),
      };
    } finally {
      await page.close();
    }
  }
}
