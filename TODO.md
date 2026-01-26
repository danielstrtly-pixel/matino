# Matino - TODO

## 🔴 Scraping & Data

### Price Scraping
- [ ] **Inkomplett täckning** - Bara ICA och Hemköp fungerar
  - [ ] Lägg till Coop-scraper
  - [ ] Lägg till Lidl-scraper
  - [ ] Lägg till Willys-scraper

### Prishantering
- [x] **Hemköp prisregler** (95% accuracy)
  - [x] Använd `aria-label` för namn och pris
  - [x] Hantera "X för Y kr" korrekt (dividera totalpris)
  - [x] Skippa jämförpriser (jfr-pris X/kg)
  - [x] Hantera delade priselement ("10:-" + "/st")
- [ ] **ICA prisregler** - Behöver liknande fix
- [ ] Validera att priser är rimliga (inte negativa, inte absurt höga)

### Kategorisering
- [ ] **Gruppera matvaror bättre**
  - [ ] Skapa kategorier (Mejeri, Kött, Frukt & Grönt, etc.)
  - [ ] Auto-kategorisera baserat på produktnamn
  - [ ] Filtrera per kategori i UI

---

## 🟡 Butiker & Användarval

### Butiksval
- [x] **Se över hur vi väljer butiker**
  - [x] ICA butikssökning med alla typer (Maxi, Kvantum, etc.)
  - [ ] Hemköp butikssökning
  - [x] Spara användarens valda butiker till Supabase
  - [x] Visa erbjudanden från valda butiker

---

## 🟢 Auth & Användare

### Inloggning
- [ ] **Snygga till magic-link inloggningen**
  - [ ] Bättre UX-flöde
  - [ ] Bekräftelse-email design
  - [ ] Felhantering

### Logga ut
- [x] **Implementera utloggning**
  - [x] Logout-knapp i menyn
  - [x] Rensa session (via /auth/signout)

### Preferenser
- [ ] **Spara och förstå användarens preferenser**
  - [ ] Likes/dislikes
  - [ ] Allergier
  - [ ] Hushållsstorlek
  - [ ] Matpreferenser (vegetarisk, etc.)

---

## 🔵 AI & Recept

### Receptlogik
- [ ] **Fixa logiken för att skapa recept**
  - [ ] Datamodell för recept
  - [ ] Koppla recept till erbjudanden/ingredienser

### AI Menygenerering
- [ ] **Lägg till AI-stöd för att generera menyer**
  - [ ] Integration med LLM (OpenAI/Anthropic)
  - [ ] Generera veckomeny baserat på erbjudanden
  - [ ] Ta hänsyn till användarpreferenser
  - [ ] Generera inköpslista från meny

---

## 🟣 UI/UX

### Gränssnitt
- [x] **Snygga till gränssnittet** (delvis)
  - [x] Responsiv design (grid-baserad)
  - [x] Bättre kort-layout för erbjudanden (8 kolumner)
  - [x] Loading states (butiker, erbjudanden)
  - [x] Empty states (erbjudanden)
  - [x] Error handling (erbjudanden)
  - [x] Dashboard med stats och progress

---

## 💰 Betalning

### Stripe
- [ ] **Kunna ta betalt**
  - [ ] Stripe integration
  - [ ] Prenumerationsplan (69 kr/mån)
  - [ ] 1 vecka gratis provperiod
  - [ ] Hantera betalningsstatus

---

## ✅ Klart

- [x] Grundstruktur Next.js + Supabase
- [x] Landing page
- [x] ICA scraper med butikssökning
- [x] Hemköp scraper
- [x] Erbjudanden-visning
- [x] Stores synkas till Supabase
- [x] "X för Y" prishantering (delvis)

---

*Senast uppdaterad: 2026-01-26*
