---
title: "feat: Landing Page Redesign"
type: feat
date: 2026-02-07
brainstorm: docs/brainstorms/2026-02-07-landing-page-redesign-brainstorm.md
---

# Landing Page Redesign

## Overview

Komplett redesign av SmartaMenyns landningssida med fokus på konvertering. Nuvarande monolitisk `page.tsx` (330 rader) bryts upp i komponentbaserad arkitektur med nya sektioner (Pain, ProductDemo, Trust, FAQ), scroll-reveal-animationer, och globala förbättringar (delad header/footer, fontfix, dark mode-borttagning).

## Proposed Solution

### Nya landing-sektioner (12 st)

| # | Sektion | Komponent | Fil | Server/Client |
|---|---------|-----------|-----|---------------|
| 1 | NavBar | `NavBar` | `components/NavBar.tsx` | Server (wrapper) + Client (MobileMenu) |
| 2 | Hero | `HeroSection` | `components/landing/HeroSection.tsx` | Server |
| 3 | Stores Strip | inline i page.tsx | — | Server |
| 4 | Pain Points | `PainSection` | `components/landing/PainSection.tsx` | Server |
| 5 | How It Works | `HowItWorks` | `components/landing/HowItWorks.tsx` | Server |
| 6 | Product Demo | `ProductDemo` | `components/landing/ProductDemo.tsx` | Server |
| 7 | Features | `FeaturesSection` | `components/landing/FeaturesSection.tsx` | Server |
| 8 | Trust Signals | inline i page.tsx | — | Server |
| 9 | FAQ | `FaqSection` | `components/landing/FaqSection.tsx` | Client |
| 10 | Pricing | `PricingSection` | `components/PricingSection.tsx` (befintlig) | Client |
| 11 | Final CTA | inline i page.tsx | — | Server |
| 12 | Footer | `Footer` | `components/Footer.tsx` | Server |

### Globala förändringar

1. **Typsnitt**: Ta bort Geist + CSS @import. Lägg till Playfair Display + Inter via `next/font/google` i `layout.tsx`.
2. **Delad NavBar**: Ny komponent med `variant: "marketing" | "dashboard"`. Ersätter inline-nav i `page.tsx` OCH `dashboard/layout.tsx`. Ersätter `MobileNav.tsx`.
3. **Delad Footer**: Ny komponent. Används på alla sidor (inkl. dashboard).
4. **Dark mode bort**: Ta bort `.dark`-block och `@custom-variant dark` från `globals.css`. Audit `dark:`-prefix i shadcn-komponenter.
5. **Smooth scroll**: `scroll-behavior: smooth` + `scroll-padding-top: 80px` på `html`.
6. **Scroll-reveal**: `RevealOnScroll` client component med IntersectionObserver.

## Technical Considerations

### Arkitektur

- **Server components default**: Alla landing-sektioner är server components utom FAQ (accordion-interaktion) och RevealOnScroll (IntersectionObserver).
- **Auth-prop**: `isLoggedIn` bestäms i `page.tsx` (server) och passas ner till NavBar, HeroSection, FinalCta.
- **NavBar i layout.tsx vs page.tsx**: NavBar kan INTE ligga i root `layout.tsx` eftersom marketing-mode kräver anchor-länkar som bara finns på landningssidan. NavBar renderas i respektive sida/layout som behöver den.

### Font-migration

```tsx
// layout.tsx
import { Playfair_Display, Inter } from "next/font/google";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
```

Ta bort rad 1 i `globals.css` (`@import url('https://fonts.googleapis.com/...')`).
Ta bort Geist-imports (rad 2, 5-13 i `layout.tsx`).

### Animationer

CSS-only med IntersectionObserver, INGEN Framer Motion (undviker ~30KB bundle):

```tsx
// components/landing/RevealOnScroll.tsx ("use client")
// IntersectionObserver, threshold 0.1
// CSS: opacity 0→1, translateY(24px→0)
// Transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1)
// Stagger via CSS transition-delay prop
// prefers-reduced-motion: instant visibility, no animation
// Animate once (unobserve after first intersection)
```

### Anchor-IDs

| Sektion | ID | NavBar-länk |
|---------|----|------------|
| HowItWorks | `how` | "Hur det funkar" |
| FeaturesSection | `features` | — |
| PricingSection | `pricing` | "Priser" |
| FaqSection | `faq` | "FAQ" |

NavBar marketing-läge: "Hur det funkar" → `#how`, "Priser" → `#pricing`, "FAQ" → `#faq`.

### Ny shadcn-komponent behövs

```bash
npx shadcn@latest add accordion
```

### Ny färgvariabel

FeaturesSection behåller `#4A7C59` (befintlig `bg-fresh`), inte specens `#2D4A3E`.

## FAQ-innehåll (svenska)

Dessa texter används i `FaqSection`:

**1. Vilka butiker stöds?**
Just nu hämtar vi erbjudanden från ICA, Hemköp och Lidl. Stöd för Coop är på väg, och Willys och City Gross kommer senare.

**2. Kan jag välja bort rätter jag inte gillar?**
Ja! Du kan enkelt byta ut vilken rätt som helst med ett klick. AI:n föreslår en ny rätt baserad på samma veckans erbjudanden.

**3. Hur sparar jag 800 kr per månad?**
Genom att bygga veckomenyns recept runt veckans erbjudanden och minska matsvinn. De flesta familjer sparar mellan 600 och 1 000 kr per månad.

**4. Hur fungerar gratisperioden?**
Du testar gratis i 7 dagar utan att ange betalkort. Inga automatiska debiteringar – du väljer själv om du vill fortsätta efter provperioden.

**5. Behöver jag ladda ner en app?**
Nej, SmartaMenyn fungerar direkt i webbläsaren på din mobil, surfplatta eller dator. Ingen installation behövs.

**6. Hur säger jag upp?**
Gå till Kontoinställningar och klicka "Avsluta prenumeration". Inga uppsägningstider, inga dolda avgifter.

## Acceptance Criteria

### Funktionella krav

- [x] Alla 12 sektioner renderas korrekt på `/`
- [x] NavBar fungerar i marketing-mode (anchor-länkar + Login + Prova gratis CTA)
- [x] NavBar fungerar i dashboard-mode (6 nav-items + Logout + MobileMenu)
- [x] NavBar är sticky med korrekt z-index
- [x] Hamburger-meny fungerar i båda modes på mobil
- [x] "Se hur det funkar" smooth-scrollar till `#how` med offset för sticky NavBar
- [x] FAQ accordion expanderar/kollapsar (single mode, collapsible)
- [x] Befintlig PricingSection med Stripe-integration fungerar oförändrad
- [x] Alla CTA-knappar länkar till `/signup` (logged out)
- [x] Inloggade användare: Hero CTA-knappar dolda (som idag)
- [x] Footer visas på alla sidor (landing + dashboard)
- [x] Typsnitt: Playfair Display för rubriker, Inter för brödtext, inga Geist-fonter laddas
- [x] Inga dark mode-variabler i CSS

### Responsivitet

- [x] Desktop (≥1024px): Full 2-kolumns layout i Hero, ProductDemo
- [x] Tablet (768-1023px): Staplad layout
- [x] Mobil (<768px): Hamburger-meny, staplad, mindre typsnitt

### Animationer

- [x] RevealOnScroll på alla sektionsrubriker och cards
- [x] Hero fade-in-up med staggered delay
- [x] `prefers-reduced-motion` respekteras (inga animationer)

### Tillgänglighet

- [x] Korrekt heading-hierarki (H1 i Hero, H2 per sektion)
- [x] `scroll-padding-top` för sticky NavBar offset
- [x] Tillräcklig kontrast på alla bakgrunder (orange på mörkt, vit på grönt)
- [x] ARIA-labels på nav-element

### Tekniska krav

- [x] `npx next build` lyckas utan fel
- [x] Inga nya `"use client"` utöver: RevealOnScroll, FaqSection, NavBar MobileMenu
- [x] `MobileNav.tsx` kan tas bort efter migration
- [x] Geist-fonter borta från layout.tsx
- [x] CSS @import url(...) borttagen från globals.css

## Dependencies & Risks

**Dependencies:**
- shadcn Accordion-komponent behöver installeras (`npx shadcn@latest add accordion`)
- Placeholder-bild/CSS-box för Hero högerkolumn behöver designas

**Risker:**
- **NavBar-refaktor**: Rör både `page.tsx` och `dashboard/layout.tsx`. Om auth-logiken bryts försvinner dashboard-navigationen.
  - *Mitigation*: Testa auth-flöde (inloggad/utloggad) på båda sidor efter ändring.
- **Dark mode-borttagning**: shadcn-komponenter (button, dialog) har `dark:`-prefix. Borttagning kan orsaka oväntade stiländringar om `.dark` class sätts av browser/OS.
  - *Mitigation*: Se till att `<html>` aldrig får `class="dark"`. Behåll `dark:`-prefix i shadcn-filer (de gör ingen skada om klassen aldrig appliceras).
- **Font-byte**: Om Playfair Display laddas sent → layout shift (CLS).
  - *Mitigation*: Använd `display: "swap"` och `next/font/google` (self-hosted, ingen extern CDN).

## References & Research

### Interna filer som ändras

- `src/app/page.tsx` — Komplett omskrivning
- `src/app/layout.tsx:2,5-13` — Font-imports
- `src/app/globals.css:1,5,103-135` — CSS @import, dark mode
- `src/app/dashboard/layout.tsx:23-61` — Nav-extraktion
- `src/components/MobileNav.tsx` — Ersätts av NavBar
- `DESIGN-SYSTEM.md` — Uppdatera fontsektion (ta bort Geist-referens om den finns)

### Nya filer

- `src/components/NavBar.tsx`
- `src/components/Footer.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/PainSection.tsx`
- `src/components/landing/HowItWorks.tsx`
- `src/components/landing/ProductDemo.tsx`
- `src/components/landing/FeaturesSection.tsx`
- `src/components/landing/FaqSection.tsx`
- `src/components/landing/RevealOnScroll.tsx`
- `src/components/ui/accordion.tsx` (via shadcn CLI)

### Brainstorm

- `docs/brainstorms/2026-02-07-landing-page-redesign-brainstorm.md`
