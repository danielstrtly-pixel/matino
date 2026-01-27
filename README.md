# SmartaMenyn

**Slack-kanal:** #smartamenyn (C0AAWCFR1F0)
**Domän:** www.smartamenyn.se
**Live URL:** https://smartamenyn-two.vercel.app/
**Repo:** `/home/admin/clawd/projects/smartamenyn`

## Om projektet

Tjänst som skannar närliggande butiker efter mat-erbjudanden och genererar en veckomeny baserad på deals. Användare kan diskutera och förfina menyn utifrån preferenser.

## Tech Stack

- Next.js 14 + TypeScript
- TailwindCSS + shadcn/ui
- Supabase (Auth + DB)
- Vercel hosting
- Docker scraper på cb1 (port 3001)

## Stödda butiker

| Butik | Status | Antal erbjudanden |
|-------|--------|-------------------|
| ICA | ✅ Fungerar | ~54 |
| Hemköp | ✅ Fungerar | ~55 |
| Lidl | ✅ Fungerar | ~114 |
| Coop | 🚧 Butiker seedade, scraper behöver fix | 0 |

## Kärnfunktioner (MVP)

1. ✅ Landing page med value prop
2. ✅ Magic Link auth
3. ✅ Användare väljer butiker
4. ✅ Visa erbjudanden från valda butiker
5. 🚧 Generera X luncher/middagar (AI) — **NÄSTA**
6. ✅ Användarpreferenser (likes/dislikes, allergier)
7. 🚧 Swap måltider med feedback
8. 🚧 Inköpslista med butiksgruppering
9. 🚧 Dela meny / familjegrupper
10. 🚧 Stripe: 69 kr/mån, 1 vecka gratis

## Scraper

**Container:** `smartamenyn-scraper` på port 3001
**Image:** `mcr.microsoft.com/playwright:v1.50.1-jammy`

### API Endpoints
```
GET  /health
GET  /chains
GET  /chains/:chain/stores?q=query
POST /chains/:chain/offers
GET  /validate[/:chain]
```

### Rebuild efter kodändringar
```bash
cd /home/admin/clawd/projects/smartamenyn/scraper
sg docker -c "docker stop smartamenyn-scraper && docker rm smartamenyn-scraper && docker build -t smartamenyn-scraper . && docker run -d --name smartamenyn-scraper -p 3001:3001 --restart unless-stopped smartamenyn-scraper"
```

### Synka erbjudanden till Supabase
```bash
cd /home/admin/clawd/projects/smartamenyn
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

## Databasschema (viktiga tabeller)

- `stores` — alla butiker (1287 ICA + 725 Coop + Hemköp + Lidl)
- `offers` — erbjudanden med `quantity`, `quantity_price` fält
- `user_stores` — användarens valda butiker
- `user_preferences` — likes/dislikes/allergier

## Cron

- **03:00 nattlig sync** — synkar alla användares butikers erbjudanden

## Beslut

1. **Auth:** Magic Link (inte Google/social)
2. **Arkitektur:** Scraper → Supabase → Web (inte direkt scraper-anrop)
3. **Pris:** 69 kr/mån, 1 vecka gratis trial

## Lärdomar

1. **Docker rebuild krävs** efter scraper-kodändringar
2. **Verifiera build** efter varje push — anta inte att deploy funkar
3. **tsconfig exclude** — lägg till scraper-mappen så Vercel inte bygger den
4. **Vercel kan inte nå localhost** — använd nattlig cron istället för real-time

## Edamam Recipe API

**Dokumentation:** https://developer.edamam.com/edamam-docs-recipe-api

### Aktivera

1. Skapa konto på https://developer.edamam.com/
2. Skapa en Recipe Search API-applikation
3. Lägg till credentials i `.env.local`:
   ```
   EDAMAM_APP_ID=din_app_id
   EDAMAM_APP_KEY=din_app_key
   ```

### Features
- Söker recept baserat på användarens erbjudanden
- Filtrerar på allergier/dieter (gluten-free, vegan, etc.)
- Filtrerar på kostmål (high-protein, low-carb, etc.)
- Filtrerar på matkulturer (nordic, italian, asian, etc.)
- Översätter receptnamn till svenska via OpenRouter
- Matchar recept med aktuella erbjudanden

### Inställningar (Settings-sidan)
- Hushållsstorlek + barn
- Kostrestriktioner (11 val)
- Kostmål (5 val)
- Matkulturer (10 val)
- Favoriter & ogillade ingredienser
- Antal middagar/vecka (3-7)
- Max tillagningstid (15-90 min)
- Inkludera lunch

## TODO

### Hög prio
- [x] **Meny-generering (Edamam + OpenRouter)** — implementerat!
- [ ] Inköpslista med butiksgruppering

### Medium prio
- [ ] Coop scraper fix
- [ ] Spara genererade menyer i databas
- [ ] Swap-feedback loop (lär sig preferenser)

### Låg prio
- [ ] Förbättra kategori-klassificering
- [ ] Dela meny / familjegrupper
- [ ] Stripe-betalning

---
*Senast uppdaterad: 2026-01-27*
