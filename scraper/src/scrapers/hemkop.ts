import { Page } from 'playwright';
import { BaseScraper } from './base';
import type { Store, Offer, ScraperResult, StoreSearchResult, OffersResult, ValidationResult, ChainId } from '../types';
import { getCategory } from '../categories';

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
        
        // Check for tabs and click each one to find product containers
        try {
          const tabs = await page.$$('[role="tab"], [data-testid*="tab"], button[class*="tab"]');
          console.log(`[Hemköp] Found ${tabs.length} tabs`);
          
          for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const tabText = (await tab.textContent())?.trim() || '';
            console.log(`[Hemköp] Tab ${i}: "${tabText}"`);
            
            // Click the tab
            try {
              await tab.click();
              await page.waitForTimeout(2000);
              
              // Check if product containers appeared
              const containers = await page.$$('[data-testid="product-container"]');
              console.log(`[Hemköp] After clicking tab "${tabText}": ${containers.length} containers`);
              
              if (containers.length > 0) {
                console.log(`[Hemköp] Found products in tab "${tabText}"!`);
                break;
              }
            } catch (e) {
              console.log(`[Hemköp] Could not click tab: ${e}`);
            }
          }
        } catch (e) {
          // Ignore
        }

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
   * Extract offers from Hemköp's product cards
   * Uses data-testid="product-container" which has axfood.se images
   */
  private async extractOffersWithDataRole(page: Page, store: Store): Promise<Offer[]> {
    const offers: Offer[] = [];
    
    // Debug: Check what testids exist on the page
    const testIds = await page.evaluate(() => {
      const ids = new Set<string>();
      document.querySelectorAll('[data-testid]').forEach(el => {
        ids.add(el.getAttribute('data-testid') || '');
      });
      return Array.from(ids).filter(id => id.includes('product') || id.includes('offer') || id.includes('price'));
    });
    console.log(`[Hemköp] Relevant data-testids found:`, testIds.slice(0, 15));
    
    // First try the product-container elements (better quality, axfood images)
    const productContainers = await page.$$('[data-testid="product-container"]');
    console.log(`[Hemköp] Found ${productContainers.length} product containers`);
    
    if (productContainers.length > 0) {
      for (const container of productContainers) {
        try {
          // Get product title
          const titleEl = await container.$('[data-testid="product-title"]');
          const name = titleEl ? (await titleEl.textContent())?.trim() : null;
          if (!name) continue;
          
          // Get image from axfood CDN
          const imgEl = await container.$('img[src*="assets.axfood.se"]');
          const imageUrl = imgEl ? await imgEl.getAttribute('src') : undefined;
          
          // Get price
          const priceEl = await container.$('[data-testid="price-text"], [data-testid="price-container"]');
          const priceText = priceEl ? (await priceEl.textContent())?.trim() : '';
          const priceMatch = priceText?.match(/(\d+)[,.]?(\d*)/);
          if (!priceMatch) continue;
          
          const whole = parseInt(priceMatch[1]);
          const decimal = priceMatch[2] ? parseInt(priceMatch[2].padEnd(2, '0')) / 100 : 0;
          const offerPrice = whole + decimal;
          
          if (offerPrice < 1 || offerPrice > 10000) continue;
          
          // Get brand/manufacturer
          const brandEl = await container.$('[data-testid="display-manufacturer"]');
          const brand = brandEl ? (await brandEl.textContent())?.trim().replace(/,\s*$/, '') : undefined;
          
          // Get unit
          const unitEl = await container.$('[data-testid="price-unit"]');
          const unit = unitEl ? (await unitEl.textContent())?.trim().replace('/', '') : undefined;
          
          // Check for membership requirement (Klubbpris)
          const fullText = (await container.textContent()) || '';
          const requiresMembership = /klubbpris/i.test(fullText);
          
          // Classify category based on product name
          const category = getCategory(undefined, name, 'hemkop');
          
          const offer: Offer = {
            id: this.generateOfferId('hemkop', store.externalId, name),
            name,
            brand,
            offerPrice,
            unit,
            imageUrl: imageUrl || undefined,
            storeId: store.id,
            chain: 'hemkop',
            category,
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
        }
      }
      
      console.log(`[Hemköp] Extracted ${offers.length} offers from product containers`);
      if (offers.length > 0) {
        return offers;
      }
    }
    
    // Fallback to data-role="offer" elements if no product containers found
    console.log('[Hemköp] Falling back to data-role="offer" extraction');
    
    // Debug: Check ALL image sources on the page
    const debugImages = await page.evaluate(() => {
      const sources: Record<string, number> = {};
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        try {
          const url = new URL(src);
          const host = url.hostname;
          sources[host] = (sources[host] || 0) + 1;
        } catch {
          if (src.startsWith('data:')) {
            sources['data:'] = (sources['data:'] || 0) + 1;
          }
        }
      });
      return sources;
    });
    console.log(`[Hemköp] Image sources on page:`, debugImages);
    
    // Also check for axfood images specifically
    const axfoodImages = await page.evaluate(() => {
      const results: string[] = [];
      document.querySelectorAll('img[src*="axfood"], img[src*="assets.axfood"]').forEach(img => {
        results.push(img.getAttribute('src') || '');
      });
      return results.slice(0, 5);
    });
    console.log(`[Hemköp] Axfood images found:`, axfoodImages);
    
    // First, build a map of all product images on the page
    const imageMap = await page.evaluate(() => {
      const map: Record<string, string> = {};
      
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt')?.toLowerCase().trim() || '';
        
        // Prioritize axfood.se images, then tjek.com, then cloudinary
        if (alt && (src.includes('axfood') || src.includes('tjek.com') || src.includes('cloudinary'))) {
          // Only update if we don't have an axfood image already
          if (!map[alt] || (src.includes('axfood') && !map[alt].includes('axfood'))) {
            map[alt] = src;
          }
        }
      });
      
      return map;
    });
    console.log(`[Hemköp] Found ${Object.keys(imageMap).length} product images in map`);
    
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
        let quantityFromLabel: number | undefined;
        let quantityPriceFromLabel: number | undefined;
        
        if (sekMatch) {
          name = sekMatch[1].trim();
          priceFromLabel = parseFloat(sekMatch[2]);
          
          // Check if this is a "X FÖR" deal
          // Look for pattern like "2 FÖR" in the full text
          const forMatch = fullText.match(/(\d+)\s*FÖR\s*$/i) || fullText.match(/(\d+)\s*FÖR\s/i);
          if (forMatch) {
            const qty = parseInt(forMatch[1]);
            if (qty > 1) {
              // priceFromLabel is the TOTAL/PACKAGE price - keep it!
              // Calculate per-unit price for comparison
              quantityFromLabel = qty;
              quantityPriceFromLabel = Math.round((priceFromLabel / qty) * 100) / 100;
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
        let quantity: number | undefined = quantityFromLabel;
        let quantityPrice: number | undefined = quantityPriceFromLabel;
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
              // offerPrice = package price (e.g., 50 for "2 för 50 kr")
              // quantityPrice = per-unit price for comparison
              offerPrice = totalPrice;
              quantityPrice = Math.round((totalPrice / quantity) * 100) / 100;
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
        
        // Try to get image - Hemköp uses tjek.com image transformer API
        let imageUrl: string | undefined;
        
        // Find all images in the offer element
        const imgElements = await element.$$('img');
        for (const imgEl of imgElements) {
          const src = await imgEl.getAttribute('src');
          
          // Accept tjek.com image transformer URLs (product images)
          if (src && src.includes('image-transformer-api.tjek.com')) {
            imageUrl = src;
            break;
          }
          
          // Also accept Axfood CDN URLs
          if (src && src.includes('assets.axfood.se') && !src.includes('placeholder')) {
            imageUrl = src;
            break;
          }
          
          // Accept cloudinary URLs (some product images)
          if (src && src.includes('cloudinary') && src.includes('hemkop')) {
            imageUrl = src;
            break;
          }
        }
        
        // Also check for background-image in style
        if (!imageUrl) {
          const bgDiv = await element.$('[style*="background-image"]');
          if (bgDiv) {
            const style = await bgDiv.getAttribute('style') || '';
            const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
            if (bgMatch && (bgMatch[1].includes('tjek.com') || bgMatch[1].includes('axfood') || bgMatch[1].includes('cloudinary'))) {
              imageUrl = bgMatch[1];
            }
          }
        }
        
        // Last resort: match by product name from the pre-built image map
        if (!imageUrl && name) {
          const nameLower = name.toLowerCase().trim();
          if (imageMap[nameLower]) {
            imageUrl = imageMap[nameLower];
          } else {
            for (const [alt, url] of Object.entries(imageMap)) {
              if (alt.includes(nameLower) || nameLower.includes(alt)) {
                imageUrl = url;
                break;
              }
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
        
        // Classify category based on product name
        const category = getCategory(undefined, name, 'hemkop');
        
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
          category,
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
    
    // Keep scrolling until we can't scroll anymore
    let lastHeight = 0;
    let scrollAttempts = 0;
    const maxScrolls = 50;
    
    while (scrollAttempts < maxScrolls) {
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      // Scroll to the bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);
      
      // Check for "Visa mer" or "Ladda fler" buttons and click them
      try {
        const loadMoreBtn = await page.$('button:has-text("Visa mer"), button:has-text("Ladda"), button:has-text("Fler")');
        if (loadMoreBtn) {
          console.log('[Hemköp] Found "load more" button, clicking...');
          await loadMoreBtn.click();
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        // No button found
      }
      
      // Check if product containers appeared
      const containers = await page.$$('[data-testid="product-container"]');
      if (containers.length > 0) {
        console.log(`[Hemköp] Found ${containers.length} product containers after ${scrollAttempts} scrolls`);
        break;
      }
      
      // Check if we've stopped growing
      if (currentHeight === lastHeight) {
        scrollAttempts++;
        if (scrollAttempts > 3) break; // Give up after 3 attempts with no growth
      } else {
        scrollAttempts = 0;
      }
      
      lastHeight = currentHeight;
    }
    
    // Final check
    const finalContainers = await page.$$('[data-testid="product-container"]');
    console.log(`[Hemköp] Final product containers: ${finalContainers.length}`);
    
    // Also log the page height
    const finalHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`[Hemköp] Final page height: ${finalHeight}px`);
    
    // Wait and scroll back to top
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
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
