# SmartaMenyn

**Domän:** www.smartamenyn.se
**Live URL:** https://smartamenyn-two.vercel.app/

## Om projektet

SmartaMenyn är en svensk måltidsplaneringstjänst. Den skannar matbutikserbjudanden från ICA, Hemköp och Lidl, och genererar sedan personliga veckomenyer som utnyttjar veckans deals. AI föreslår måltider och riktiga receptlänkar hittas via Brave Search från svenska receptsajter (ICA, Tasteline, Arla m.fl.).

## Arkitektur

Två separata applikationer:

### 1. Web App (root `/`)
- **Next.js 16** + React 19 + TypeScript
- TailwindCSS v4 + shadcn/ui (New York style)
- Supabase (Auth med Magic Link + PostgreSQL)
- Stripe (prenumerationer)
- OpenRouter (Gemini 3 Flash via API) för AI-menygenrering
- Brave Search API för receptlänkar
- Deployas till **Vercel**

### 2. Scraper Service (`scraper/`)
- Express + Playwright + Cheerio
- Docker-container (`mcr.microsoft.com/playwright:v1.50.1-jammy`)
- Exponerar REST API på port 3001
- Eget `package.json` och `tsconfig.json`

### Dataflöde
```
Scraper (Docker, port 3001) → scripts/sync-offers.js → Supabase (PostgreSQL)
                                                              ↓
User väljer butiker → API hämtar erbjudanden + preferenser → OpenRouter (Gemini 3 Flash) genererar måltidsförslag
                                                              ↓
                                                    Brave Search hittar receptlänkar
                                                              ↓
                                                    Meny sparas i databas
```

## Stödda butiker

| Butik  | Status        | Kommentar                           |
|--------|---------------|-------------------------------------|
| ICA    | ✅ Fungerar   | Playwright-baserad, scrollar lazy-loaded content |
| Hemköp | ✅ Fungerar   | Playwright-baserad, klickar "Se alla erbjudanden" |
| Lidl   | ✅ Fungerar   | Cheerio-baserad, nationella erbjudanden |
| Coop   | 🚧 WIP       | Butiker seedade, scraper behöver implementation |

## Funktioner

- ✅ Landing page
- ✅ Magic Link-autentisering (email OTP)
- ✅ Användare väljer butiker (ICA, Hemköp, Lidl, Coop)
- ✅ Visa erbjudanden från valda butiker med kategorifilter
- ✅ AI-genererad veckomeny (två lägen: "smak" och "budget")
- ✅ Riktiga receptlänkar från svenska sajter
- ✅ Matprofilintervju (AI-chattbaserad)
- ✅ Swap-måltider med feedback
- ✅ Spara favoritrecept
- ✅ Användarpreferenser (allergier, dieter, matkulturer, likes/dislikes)
- ✅ Stripe-betalning (69 kr/mån, 499 kr/år, 1 vecka gratis trial)
- 🚧 Inköpslista med butiksgruppering
- 🚧 Dela meny / familjegrupper
- 🚧 Coop-scraper

## Scraper

### API Endpoints
```
GET  /health                    — Hälsostatus + stödda kedjor
GET  /chains                    — Lista stödda kedjor
GET  /chains/:chain/stores?q=   — Sök butiker
POST /chains/:chain/offers      — Hämta erbjudanden för en butik
GET  /validate[/:chain]         — Validera scraper(s)
POST /api/sync                  — Synka erbjudanden för en användares butiker (auth krävs)
```

### Rebuild efter kodändringar
```bash
cd scraper
docker stop smartamenyn-scraper && docker rm smartamenyn-scraper
docker build -t smartamenyn-scraper .
docker run -d --name smartamenyn-scraper -p 3001:3001 --restart unless-stopped smartamenyn-scraper
```

### Synka erbjudanden till Supabase
```bash
# Kräver DATABASE_URL miljövariabel
node scripts/sync-offers.js
```

## Scraper-regler

### ICA
- Klicka på "I butik"-fliken för alla erbjudanden
- Använd scrollning för lazy-loading

### Hemköp
- Klicka på "Se alla erbjudanden"-fliken (inte reklamblad!)
- Pris från `aria-label` är mest pålitligt
- Bilder från `assets.axfood.se`

### Lidl
- Produktcontainer: `.product-grid-box`
- Produktbild: `img.odsc-image-gallery__image`
- UNDVIK: `img.seal__badge` (kvalitetsmärken)
- **MODIFIERA INTE URL:er** — imgproxy har signerade hashar

## Databasschema

### Matdata
- `chains` — butikskedjor (ICA, Hemköp, Lidl, Coop)
- `stores` — alla butiker
- `offers` — erbjudanden med pris, bild, kategori m.m.

### Användardata
- `user_stores` — användarens valda butiker
- `user_preferences` — likes/dislikes, allergier, matprofil
- `user_feedback` — swap-feedback för att lära sig preferenser
- `saved_recipes` — sparade favoritrecept

### Menyer
- `menus` — genererade veckomenyer
- `menu_items` — individuella måltider med recept och matchade erbjudanden

### Betalning
- `customers` — Stripe-kundkoppling
- `subscriptions` — Stripe-prenumerationer
- `products`, `prices` — Stripe-produktkatalog

## Miljövariabler

### Web App (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY` — för AI-anrop via OpenRouter
- `BRAVE_SEARCH_API_KEY` — för receptsökning
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SCRAPER_URL` — scraper-tjänstens URL (default: `http://localhost:3001`)
- `COOP_API_KEY` — för Coop butiks-API

### Scraper (`scraper/.env`)
- `DATABASE_URL` — PostgreSQL-anslutning
- `SUPABASE_URL` — Supabase-projektets URL
- `SYNC_API_KEY` — API-nyckel för server-till-server-autentisering

## Utveckling

### Web App
```bash
npm install
npm run dev          # Next.js dev server (port 3000)
npm run build        # Produktionsbygge
npm run lint         # ESLint
```

### Scraper
```bash
cd scraper
npm install
npm run dev          # Express API dev server med tsx watch (port 3001)
npm test             # Kör scraper-valideringstester
npm run scrape:ica   # CLI: skrapa ICA-erbjudanden
npm run scrape:hemkop # CLI: skrapa Hemköp-erbjudanden
```

## Cron

- **05:00 Stockholm** daglig sync — synkar erbjudanden för alla butiker med aktiva användare
- Script: `node scripts/sync-offers.js`
- Kräver `DATABASE_URL` och `SCRAPER_URL` miljövariabler

## Beslut

1. **Auth:** Magic Link (inte social login)
2. **Arkitektur:** Scraper → Supabase → Web (inte real-time scraping)
3. **AI-modell:** Gemini 3 Flash via OpenRouter
4. **Recept:** Riktiga receptlänkar via Brave Search (inte AI-genererade recept)
5. **Fredagsmys:** Fredagar föreslår alltid tacos, pizza eller hamburgare
6. **Pris:** 69 kr/mån eller 499 kr/år, 1 vecka gratis trial

---
*Senast uppdaterad: 2026-02-07*
