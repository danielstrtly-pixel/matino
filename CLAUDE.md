# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartaMenyn ("Matino") is a Swedish meal planning service. It scrapes grocery store offers from ICA, Hemköp, Lidl (and Coop WIP), then uses AI to generate personalized weekly menus that leverage those deals. The entire UI and all AI-generated content is in Swedish.

**Live:** https://smartamenyn-two.vercel.app/ | **Domain:** www.smartamenyn.se

## Commands

### Web App (root directory)
```bash
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
```

### Scraper Service (scraper/ directory)
```bash
cd scraper
npm run dev          # Express API dev server with tsx watch (port 3001)
npm test             # Run scraper validation tests (tsx src/test.ts)
npm run scrape:ica   # CLI: scrape ICA offers
npm run scrape:hemkop # CLI: scrape Hemköp offers
```

### Sync
Offer syncing runs automatically at 03:00 Stockholm time via `node-cron` inside the scraper service.
Manual trigger: `curl -X POST http://localhost:3001/api/sync-all -H "X-API-Key: $SYNC_API_KEY"`

## Architecture

Two separate services with independent `package.json` and `tsconfig.json`:

### 1. Web App (Next.js 16 + React 19)
- **Frontend pages:** `src/app/` — Next.js App Router. Dashboard at `/dashboard/*` is auth-protected.
- **API routes:** `src/app/api/` — serverless functions handling auth, offers, AI menu generation, Stripe payments.
- **Core libraries:** `src/lib/`
  - `ai-meal-suggester.ts` — Main menu generation logic. Two modes: `taste` (preference-first) and `budget` (offer-first). Calls OpenRouter then searches real recipe links.
  - `openrouter.ts` — LLM client wrapping OpenRouter API (default model: `openai/gpt-4o-mini`).
  - `recipe-search.ts` — Brave Search API integration to find real Swedish recipe links (ICA, Tasteline, Arla, etc.).
  - `supabase/` — Three client variants: `client.ts` (browser), `server.ts` (SSR with cookies), `admin.ts` (service role key).
  - `stripe.ts` — Stripe customer/session management.
  - `access.ts` — Trial/subscription access control.
  - `scraper-client.ts` — HTTP client for communicating with the scraper service.
- **UI components:** `src/components/` — shadcn/ui (New York style) + Radix UI primitives.
- **Path alias:** `@/*` → `./src/*`

### 2. Scraper Service (Express + Playwright + Cheerio)
- `scraper/src/scrapers/` — Chain-specific scrapers extending `BaseScraper`. Each implements `searchStores()`, `getOffers()`, `validate()`.
- `scraper/src/index.ts` — Express API server.
- `scraper/src/sync-scheduler.ts` — Daily sync scheduler (node-cron) + transactional sync logic.
- `scraper/src/cli.ts` — CLI for manual scraping/testing.
- Runs in Docker container (Playwright image) in production.
- Adding a new chain: create scraper in `src/scrapers/`, register in `src/scrapers/index.ts`.

### Data Flow
```
Scraper (Docker, port 3001) → node-cron daily sync (03:00) → Supabase (PostgreSQL)
                                                              ↓
User selects stores → API fetches offers + preferences → OpenRouter (GPT-4o-mini) generates meals
                                                              ↓
                                                    Brave Search finds recipe links
                                                              ↓
                                                    Menu saved to database
```

### Key Database Tables
- `stores`, `chains`, `offers` — grocery data
- `user_stores`, `user_preferences` — user selections
- `menus`, `menu_items` — generated meal plans with recipes and matched offers
- `customers`, `subscriptions` — Stripe billing

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY` — for LLM calls via OpenRouter
- `BRAVE_SEARCH_API_KEY` — for recipe search
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `SCRAPER_URL` — scraper service endpoint (default: `http://localhost:3001`)

## Design System

- **Colors:** Cream (`#F8F4EE`) backgrounds, Orange (`#E86A33`) CTAs, Green (`#4A7C59`) health/success accents, Charcoal (`#2D2D2D`) text. Never use stark white backgrounds.
- **Typography:** Playfair Display (serif) for headings, Inter (sans) for body.
- **Components:** shadcn/ui with pill-shaped buttons, 16px border-radius cards, soft warm shadows.
- Full details in `DESIGN-SYSTEM.md`.

## Important Conventions

- All user-facing text and AI prompts must be in **Swedish**.
- The `scraper/` directory is excluded from the main `tsconfig.json` — it has its own TypeScript config.
- Auth uses Supabase Magic Link (email OTP), not social login.
- Offers are synced nightly at 03:00 Stockholm time via `node-cron` in the scraper service (not fetched in real-time).
- Scraper-specific rules (selector details for ICA, Hemköp, Lidl) are documented in `README.md` under "Scraper-regler".
- Menu generation enforces "fredagsmys" (Friday cozy meal: tacos, pizza, burgers) and validates that offer matches are relevant to the suggested meal.
