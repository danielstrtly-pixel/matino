import express from 'express';
import { createScraper, getSupportedChains } from './scrapers';
import type { ChainId, Store } from './types';
import { CHAIN_CONFIGS } from './types';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supportedChains: getSupportedChains(),
  });
});

// List supported chains
app.get('/chains', (req, res) => {
  const chains = getSupportedChains().map(id => CHAIN_CONFIGS[id]);
  res.json({ chains });
});

// Search stores for a chain
app.get('/chains/:chain/stores', async (req, res) => {
  const chain = req.params.chain as ChainId;
  const query = req.query.q as string || '';

  if (!getSupportedChains().includes(chain)) {
    return res.status(400).json({ error: `Chain ${chain} not supported` });
  }

  const scraper = createScraper(chain);
  
  try {
    await scraper.init();
    const result = await scraper.searchStores(query);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  } finally {
    await scraper.close();
  }
});

// Get offers for a specific store
app.post('/chains/:chain/offers', async (req, res) => {
  const chain = req.params.chain as ChainId;
  const store = req.body as Store;

  if (!getSupportedChains().includes(chain)) {
    return res.status(400).json({ error: `Chain ${chain} not supported` });
  }

  if (!store || !store.externalId) {
    return res.status(400).json({ error: 'Store with externalId required in body' });
  }

  const scraper = createScraper(chain);
  
  try {
    await scraper.init();
    const result = await scraper.getOffers(store);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  } finally {
    await scraper.close();
  }
});

// Validate scrapers
app.get('/validate', async (req, res) => {
  const results = [];
  
  for (const chain of getSupportedChains()) {
    const scraper = createScraper(chain);
    try {
      await scraper.init();
      const result = await scraper.validate();
      results.push(result);
    } catch (error) {
      results.push({
        valid: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        chain,
        timestamp: new Date(),
      });
    } finally {
      await scraper.close();
    }
  }
  
  const allValid = results.every(r => r.valid);
  res.status(allValid ? 200 : 500).json({ 
    valid: allValid,
    results,
  });
});

// Validate specific chain
app.get('/validate/:chain', async (req, res) => {
  const chain = req.params.chain as ChainId;

  if (!getSupportedChains().includes(chain)) {
    return res.status(400).json({ error: `Chain ${chain} not supported` });
  }

  const scraper = createScraper(chain);
  
  try {
    await scraper.init();
    const result = await scraper.validate();
    res.status(result.valid ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({
      valid: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      chain,
      timestamp: new Date(),
    });
  } finally {
    await scraper.close();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Matino Scraper API running on port ${PORT}`);
  console.log(`   Supported chains: ${getSupportedChains().join(', ')}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
