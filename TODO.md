# Matino - TODO

## 🔴 Scraping & Data

### Price Scraping
- [ ] **Inkomplett täckning** - Bara ICA och Hemköp fungerar
  - [ ] Lägg till Coop-scraper
  - [ ] Lägg till Lidl-scraper
  - [ ] Lägg till Willys-scraper

### Prishantering
- [ ] **Felaktiga priser** - Behöver robust regelverk för pristolkning
  - [ ] Hantera "X för Y kr" korrekt
  - [ ] Hantera "kr/kg" vs "kr/st"
  - [ ] Hantera jämförpriser vs erbjudandepris
  - [ ] Hantera "Ord. pris" / "Klubbpris" skillnad
  - [ ] Validera att priser är rimliga (inte negativa, inte absurt höga)

### Kategorisering
- [ ] **Gruppera matvaror bättre**
  - [ ] Skapa kategorier (Mejeri, Kött, Frukt & Grönt, etc.)
  - [ ] Auto-kategorisera baserat på produktnamn
  - [ ] Filtrera per kategori i UI

---

## 🟡 Butiker & Användarval

### Butiksval
- [ ] **Se över hur vi väljer butiker**
  - [x] ICA butikssökning med alla typer (Maxi, Kvantum, etc.)
  - [ ] Hemköp butikssökning
  - [ ] Spara användarens valda butiker till Supabase
  - [ ] Visa erbjudanden från valda butiker

---

## 🟢 Auth & Användare

### Inloggning
- [ ] **Snygga till magic-link inloggningen**
  - [ ] Bättre UX-flöde
  - [ ] Bekräftelse-email design
  - [ ] Felhantering

### Logga ut
- [ ] **Implementera utloggning**
  - [ ] Logout-knapp i menyn
  - [ ] Rensa session

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
- [ ] **Snygga till gränssnittet**
  - [ ] Responsiv design
  - [ ] Bättre kort-layout för erbjudanden
  - [ ] Loading states
  - [ ] Empty states
  - [ ] Error handling

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
