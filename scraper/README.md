# SmartaMenyn Scraper Service 🏷️

Headless browser-based scraper for Swedish grocery store offers.

## Supported Chains

| Chain | Status | Notes |
|-------|--------|-------|
| ICA | ✅ | Store search + offers |
| Hemköp | ✅ | Store-specific offers |
| Coop | 🚧 | Coming soon |
| Lidl | 🚧 | Coming soon |
| Willys | 🚧 | Coming soon |

## Quick Start

### With Docker (recommended)

```bash
docker-compose up -d
```

### Local Development

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run tests
npm test

# Start API server
npm start

# Development mode (auto-reload)
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

### List Chains
```
GET /chains
```

### Search Stores
```
GET /chains/:chain/stores?q=stockholm
```

### Get Offers
```
POST /chains/:chain/offers
Content-Type: application/json

{
  "id": "ica-12345",
  "name": "ICA Maxi Stockholm",
  "chain": "ica",
  "externalId": "12345"
}
```

### Validate Scrapers
```
GET /validate
GET /validate/:chain
```

## CLI Usage

```bash
# Search for stores
npx tsx src/cli.ts stores ica stockholm

# Get offers for a specific store
npx tsx src/cli.ts offers hemkop 4147

# Validate scrapers
npx tsx src/cli.ts validate
npx tsx src/cli.ts validate ica
```

## Testing

```bash
# Run all tests
npm test

# Output:
# 🧪 Running SmartaMenyn Scraper Tests
# 
# 📍 ICA Tests:
#   ✅ ICA validation
#   ✅ ICA store search (stockholm)
#   ✅ ICA offers (national)
# 
# 📍 Hemköp Tests:
#   ✅ Hemköp validation
#   ✅ Hemköp offers (store 4147)
```

## Monitoring

Set up a cron job or scheduled task to run validation:

```bash
# Every hour, check if scrapers are working
0 * * * * curl -s http://localhost:3001/validate | jq .
```

If validation fails, the page structure may have changed and scrapers need updating.

## Adding New Chains

1. Create a new scraper in `src/scrapers/`:
   ```typescript
   export class NewChainScraper extends BaseScraper {
     readonly chainId: ChainId = 'newchain';
     readonly chainName = 'New Chain';
     
     async searchStores(query: string) { ... }
     async getOffers(store: Store) { ... }
     async validate() { ... }
   }
   ```

2. Register it in `src/scrapers/index.ts`

3. Add tests in `src/test.ts`

4. Update this README

## Architecture

```
scraper/
├── src/
│   ├── types.ts          # Shared types
│   ├── index.ts          # Express API server
│   ├── cli.ts            # CLI tool
│   ├── test.ts           # Test suite
│   └── scrapers/
│       ├── base.ts       # Base scraper class
│       ├── ica.ts        # ICA scraper
│       ├── hemkop.ts     # Hemköp scraper
│       └── index.ts      # Scraper registry
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Troubleshooting

### Scraper returns no offers

1. Run validation: `npx tsx src/cli.ts validate <chain>`
2. Check if the site structure has changed
3. Update selectors in the scraper

### Playwright issues

```bash
# Install dependencies (Linux)
npx playwright install-deps chromium

# Or use Docker which includes everything
docker-compose up -d
```

### Rate limiting

The scrapers include delays to avoid rate limiting. If you hit issues:
- Increase wait times in scraper code
- Add proxy rotation
- Cache results in Supabase

---

Made for SmartaMenyn 🥗
