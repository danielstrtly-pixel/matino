# Landing Page Redesign — Brainstorm

**Datum:** 2026-02-07
**Status:** Redo för planering

## Vad vi bygger

En komplett redesign av SmartaMenyns landningssida med fokus på konvertering. Sidan bryts upp i separata komponenter, får nya sektioner (Pain, ProductDemo, Trust, FAQ), förbättrade animationer (scroll-reveal, stagger), och en delad header/footer som används globalt.

## Varför detta approach

Nuvarande landningssida är en 330-raders monolitfil utan komponentuppdelning. Den saknar flera konverteringskritiska sektioner (pain points, FAQ, trust signals, produktdemo). Genom att bryta ut i komponenter och lägga till dessa sektioner ökar vi både underhållbarhet och konverteringspotential.

## Nyckelbeslut

### 1. Typsnitt: Playfair Display + Inter (ej DM Serif/DM Sans)
Behåller det befintliga design systemets typsnitt. Specens förslag på DM Serif Display + DM Sans avvisas. Geist-fontladdningen i layout.tsx ska tas bort och ersättas med korrekt Playfair+Inter via next/font/google.

**Påverkar hela sajten** — fontfix är globalt.

### 2. Filstruktur: Gruppera små sektioner
Stora sektioner (Hero, Pain, HowItWorks, ProductDemo, Features, FAQ) får egna filer under `components/landing/`. Små sektioner (StoresStrip, TrustSection, FinalCta) kan ligga inline i page.tsx eller grupperas i en gemensam fil.

### 3. Pricing: Behåll befintlig komponent
Nuvarande `PricingSection.tsx` har fungerande Stripe-integration. Behålls som den är — ingen restyling i denna iteration.

### 4. Animationer: Alla i första versionen
- RevealOnScroll (client component) med IntersectionObserver
- Fade-in-up med staggered delays i hero
- Floating cards med oändlig translateY-animation (läggs till när phone mockup byggs)
- CSS transitions: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1)`

### 5. Phone mockup: Skippas i v1
Hero-sektionen byggs med placeholder-bild i höger kolumn istället för CSS-baserad telefon-mockup. Mockupen läggs till i ett separat pass.

### 6. NavBar: Delad header-komponent
En gemensam header som anpassar sig baserat på context (marketing vs dashboard, inloggad vs ej). Ersätter nuvarande inbakade nav i page.tsx OCH dashboardens navigation.

**Påverkar hela sajten** — header refaktoreras globalt.

### 7. Footer: Global
Nya footern används på hela sajten, inte bara landningssidan.

**Påverkar hela sajten.**

### 8. Smooth scroll: Globalt
`scroll-behavior: smooth` på html-elementet. Påverkar hela sajten.

## Scope-sammanfattning

### Landningssida (huvudscope)
- 12 sektioner enligt spec (minus phone mockup → placeholder)
- Nya komponenter under `components/landing/`
- Behåll befintlig PricingSection
- Alla animationer (scroll-reveal, stagger, float)

### Globala förändringar (spill-over)
- **Typsnitt**: Ta bort Geist, säkerställ Playfair+Inter via next/font/google
- **Header**: Ny delad NavBar-komponent (marketing + dashboard)
- **Footer**: Ny delad Footer-komponent
- **Smooth scroll**: CSS scroll-behavior: smooth globalt

## Lösta frågor (tidigare öppna)

### Dark mode: Ta bort
Rensa ut dark mode-variablerna från globals.css. SmartaMenyn är alltid ljust tema. Inga dark mode-varianter behövs.

### MobileNav.tsx: Ersätts
Den nya delade headerns hamburger-meny ersätter befintliga MobileNav.tsx helt. En mobilmeny för hela sajten.

### Phone mockup: Direkt efter v1
Högsta prioritet efter att landningssidan är klar. Byggs som CSS-baserad mockup i ett separat pass.

## Nästa steg

Kör `/workflows:plan` för att skapa en implementationsplan baserad på dessa beslut.
