# Matino 🥗

Smartare matplanering. Billigare vardag.

Matino hittar veckans bästa erbjudanden från dina favoritbutiker och skapar en personlig veckomeny med AI.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **Auth & Database:** Supabase
- **Hosting:** Vercel

## Features

- 🏪 Välj butiker (ICA, Coop, Hemköp, Lidl)
- 🏷️ Se veckans erbjudanden
- 🤖 AI-genererad veckomeny
- 📝 Smart inköpslista
- 👨‍👩‍👧‍👦 Dela med familjen
- 💳 Prenumeration: 69 kr/mån

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable Email Auth with Magic Links
3. Copy your project URL and anon key

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials.

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Login (Magic Link)
│   ├── signup/               # Signup
│   ├── demo/                 # Demo without login
│   ├── auth/
│   │   ├── callback/         # Auth callback handler
│   │   └── signout/          # Logout handler
│   └── dashboard/
│       ├── page.tsx          # Dashboard home
│       ├── stores/           # Select stores
│       ├── deals/            # View deals
│       ├── menu/             # Generate/view menu
│       ├── shopping-list/    # Shopping list
│       └── settings/         # User settings
├── components/
│   └── ui/                   # shadcn/ui components
└── lib/
    ├── utils.ts
    └── supabase/
        ├── client.ts         # Browser client
        ├── server.ts         # Server client
        └── middleware.ts     # Session refresh
```

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

## Roadmap

- [ ] Fas 1: Landing + Auth ✅
- [ ] Fas 2: Butiksval + Deals scraping
- [ ] Fas 3: AI Menu generation
- [ ] Fas 4: Shopping list
- [ ] Fas 5: Sharing & Groups
- [ ] Fas 6: Stripe payments

---

Made with 🥗 in Stockholm
