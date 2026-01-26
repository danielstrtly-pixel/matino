import { Page } from 'playwright';
import { BaseScraper } from './base';
import type { Store, Offer, ScraperResult, StoreSearchResult, OffersResult, ValidationResult, ChainId } from '../types';

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
        // Go directly to store's offer page
        const storeOfferUrl = `${this.baseUrl}/butiker/${store.externalId}/erbjudanden`;
        await page.goto(storeOfferUrl, { waitUntil: 'domcontentloaded' });
        await this.waitForNetworkIdle(page);

        // Accept cookies
        await this.acceptCookies(page);

        // Wait for offers to load
        await page.waitForTimeout(3000);

        // Extract offers
        const offers = await this.extractOffersFromPage(page, store);

        // Also get national offers
        await page.goto(this.offersUrl, { waitUntil: 'domcontentloaded' });
        await this.waitForNetworkIdle(page);
        const nationalOffers = await this.extractOffersFromPage(page, store);

        // Combine and dedupe
        const allOffers = [...offers, ...nationalOffers];
        const uniqueOffers = this.dedupeOffers(allOffers);

        return {
          offers: uniqueOffers,
          store,
        };
      } finally {
        await page.close();
      }
    });
  }

  private async extractOffersFromPage(page: Page, store: Store): Promise<Offer[]> {
    const offers: Offer[] = [];

    // Find offer cards/items
    const offerElements = await page.$$('[data-testid*="offer"], [class*="offer-card"], [class*="product-card"], article[class*="offer"]');

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

    // Alternative: extract from structured content
    if (offers.length === 0) {
      const sections = await page.$$('section, div[class*="offers"]');
      for (const section of sections) {
        const items = await section.$$('article, div[class*="item"], li');
        for (const item of items) {
          const offer = await this.parseOfferElement(item, store);
          if (offer) {
            offers.push(offer);
          }
        }
      }
    }

    return offers;
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

      // Extract price
      const priceEl = await element.$('[class*="price"], [class*="pris"]');
      const priceText = priceEl ? (await priceEl.textContent())?.trim() : '';
      const offerPrice = this.parsePrice(priceText || '');
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

      // Check for membership requirement
      const memberEl = await element.$('[class*="stammis"], [class*="member"]');
      const requiresMembership = !!memberEl;

      return {
        id: this.generateOfferId('ica', store.externalId, name),
        name,
        brand,
        description,
        originalPrice,
        offerPrice,
        unit: this.parseUnit(priceText || ''),
        savings,
        imageUrl: imageUrl || undefined,
        storeId: store.id,
        chain: 'ica',
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
