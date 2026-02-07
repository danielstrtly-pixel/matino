import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { PricingSection } from "@/components/PricingSection";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileNav } from "@/components/MobileNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SmartaMenyn – Veckomeny baserad på veckans erbjudanden | Spara tid & pengar på maten",
  description: "Slipp frågan 'vad ska vi äta?' för alltid. SmartaMenyn skapar personliga veckomenyer baserade på erbjudanden från ICA, Coop, Hemköp och Lidl. Spara 800-1200 kr/mån.",
  keywords: "veckomeny, matplanering, veckans erbjudanden, spara pengar mat, inköpslista, recept budget, måltidsplanering",
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const dashboardNavItems = [
    { href: "/dashboard", label: "Översikt", icon: "🏠" },
    { href: "/dashboard/stores", label: "Butiker", icon: "🏪" },
    { href: "/dashboard/deals", label: "Erbjudanden", icon: "🏷️" },
    { href: "/dashboard/menu", label: "Veckomeny", icon: "🍽️" },
    { href: "/dashboard/recipes", label: "Receptsamling", icon: "❤️" },
    { href: "/dashboard/settings", label: "Inställningar", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      {isLoggedIn ? (
        <nav className="bg-cream-light border-b border-cream-dark sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🥗</span>
              <span className="text-xl font-serif font-bold text-charcoal">SmartaMenyn</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {dashboardNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-charcoal/70 hover:text-charcoal transition-colors flex items-center gap-1.5"
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              <span className="text-cream-dark">|</span>
              <LogoutButton />
            </div>
            <MobileNav items={dashboardNavItems} />
          </div>
        </nav>
      ) : (
        <nav className="container mx-auto px-4 py-4 md:py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="text-xl font-serif font-bold text-charcoal">SmartaMenyn</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#hur-det-funkar" className="text-charcoal/70 hover:text-charcoal transition-colors">
              Hur det funkar
            </Link>
            <Link href="#fordelar" className="text-charcoal/70 hover:text-charcoal transition-colors">
              Fördelar
            </Link>
            <Link href="#butiker" className="text-charcoal/70 hover:text-charcoal transition-colors">
              Butiker
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-charcoal/70 hover:text-charcoal transition-colors hidden sm:block text-sm">
              Logga in
            </Link>
            <Button asChild className="bg-orange hover:bg-[#D55A25] text-white rounded-full px-5 md:px-6">
              <Link href="/signup">Prova gratis</Link>
            </Button>
          </div>
        </nav>
      )}

      {/* Hero - Start med smärtpunkten */}
      <section className="container mx-auto px-4 pt-8 md:pt-16 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-orange font-medium mb-4 text-sm md:text-base">
            För dig som är trött på att planera veckans mat
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-charcoal mb-6 leading-tight">
            Slipp &quot;vad ska vi äta?&quot;<br className="hidden md:block" />
            <span className="text-fresh">varje dag, för alltid</span>
          </h1>
          <p className="text-lg md:text-xl text-charcoal/70 mb-8 max-w-2xl mx-auto leading-relaxed">
            SmartaMenyn skapar din veckomeny automatiskt – baserad på veckans 
            bästa erbjudanden från butikerna du faktiskt handlar i. 
            Du sparar tid, pengar och slipper huvudvärken.
          </p>
          
          {!isLoggedIn && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button asChild size="lg" className="bg-orange hover:bg-[#D55A25] text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-shadow">
                <Link href="/signup">Prova gratis i 7 dagar</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-6 text-lg border-charcoal/20 hover:bg-cream-dark">
                <Link href="#hur-det-funkar">Se hur det funkar</Link>
              </Button>
            </div>
          )}
          
          {!isLoggedIn && (
            <p className="text-sm text-charcoal/50">
              Inget betalkort krävs · Avsluta när du vill
            </p>
          )}
        </div>

        {/* Stats - Social proof med siffror */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-4 md:gap-8">
          <div className="text-center p-4 md:p-6 bg-cream-light rounded-2xl">
            <div className="text-2xl md:text-4xl font-bold text-charcoal mb-1">2-3h</div>
            <div className="text-xs md:text-sm text-charcoal/60">sparad tid per vecka</div>
          </div>
          <div className="text-center p-4 md:p-6 bg-cream-light rounded-2xl">
            <div className="text-2xl md:text-4xl font-bold text-charcoal mb-1">800kr</div>
            <div className="text-xs md:text-sm text-charcoal/60">lägre matkostnad/mån</div>
          </div>
          <div className="text-center p-4 md:p-6 bg-cream-light rounded-2xl">
            <div className="text-2xl md:text-4xl font-bold text-charcoal mb-1">0st</div>
            <div className="text-xs md:text-sm text-charcoal/60">&quot;vad ska vi äta?&quot;</div>
          </div>
        </div>
      </section>

      {/* Problemet vi löser */}
      <section className="bg-charcoal text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-serif font-bold mb-8 text-center">
              Känner du igen det här?
            </h2>
            <div className="space-y-4 md:space-y-6">
              {[
                "Klockan är 17:30 och du har ingen aning om vad du ska laga till middag",
                "Du handlar samma tråkiga rätter vecka efter vecka för att du inte orkar tänka nytt",
                "Erbjudanden passerar förbi utan att du hinner utnyttja dem",
                "Halva maten i kylen slängs för att du inte hade en plan",
                "Du vet att du borde planera – men vem har tid med det?"
              ].map((problem, i) => (
                <div key={i} className="flex items-start gap-3 md:gap-4 bg-white/5 rounded-xl p-4 md:p-5">
                  <span className="text-orange text-xl">✗</span>
                  <p className="text-white/90 text-sm md:text-base">{problem}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <p className="text-xl md:text-2xl font-serif text-fresh">
                Det finns ett enklare sätt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hur det funkar */}
      <section id="hur-det-funkar" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-charcoal mb-4">
            Så funkar SmartaMenyn
          </h2>
          <p className="text-charcoal/60 max-w-xl mx-auto">
            Tre steg – sedan är du fri från matplaneringen för alltid
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {[
            { 
              num: "1", 
              title: "Välj dina butiker", 
              desc: "Markera vilka butiker du brukar handla i. Vi stödjer ICA, Coop, Hemköp och Lidl – de stora kedjorna där du redan handlar.",
              icon: "🏪"
            },
            { 
              num: "2", 
              title: "AI skapar din veckomeny", 
              desc: "Varje vecka analyserar vi tusentals erbjudanden och skapar en komplett veckomeny med recept som passar din familj och budget.",
              icon: "🤖"
            },
            { 
              num: "3", 
              title: "Handla med din smarta lista", 
              desc: "Få en inköpslista sorterad per butik. Du vet exakt vad du ska köpa, var du köper det, och vad det kostar.",
              icon: "📱"
            },
          ].map((step, i) => (
            <Card key={i} className="bg-cream-light border-0 rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 bg-orange text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {step.num}
                  </span>
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-charcoal mb-3">{step.title}</h3>
                <p className="text-charcoal/70 leading-relaxed">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Fördelar - Vad du får */}
      <section id="fordelar" className="bg-fresh text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-serif font-bold mb-4">
              Vad du får med SmartaMenyn
            </h2>
            <p className="text-white/70 max-w-xl mx-auto">
              Allt du behöver för att äta gott, varierat och billigt – utan att lägga tid på planering
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            {[
              { 
                icon: "📅", 
                title: "Komplett veckomeny varje vecka", 
                desc: "Lunch och middag för hela veckan, med recept som funkar för vardagen. Varierade rätter som hela familjen gillar."
              },
              { 
                icon: "💰", 
                title: "Recept baserade på veckans deals", 
                desc: "Vi bygger menyn på det som faktiskt är billigt just nu. Inte slumpmässiga recept – utan smart planering."
              },
              { 
                icon: "📝", 
                title: "Inköpslista sorterad per butik", 
                desc: "Vet exakt vad du ska köpa och var. Slipp springa runt i butiken och fundera. Slipp glömma saker."
              },
              { 
                icon: "🔄", 
                title: "Byt ut rätter du inte gillar", 
                desc: "Allergier? Ogillar fisk? Byt enkelt ut enskilda rätter så AI föreslår alternativ som passar dig."
              },
              { 
                icon: "👨‍👩‍👧‍👦", 
                title: "Anpassat för din familj", 
                desc: "Ange antal personer, allergier och preferenser. Menyn anpassas efter er – inte tvärtom."
              },
              { 
                icon: "📱", 
                title: "Funkar överallt", 
                desc: "Ta fram menyn och inköpslistan på mobilen i butiken. Ingen app att ladda ner – funkar direkt i webbläsaren."
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-6 hover:bg-white/15 transition-colors">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Butiker */}
      <section id="butiker" className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-charcoal mb-4">
          Erbjudanden från butikerna du handlar i
        </h2>
        <p className="text-charcoal/60 mb-10 md:mb-12 max-w-lg mx-auto">
          Vi hämtar veckans erbjudanden automatiskt från Sveriges största matkedjor
        </p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center">
          <div className="text-3xl md:text-4xl font-bold text-[#E3000F]">ICA</div>
          <div className="text-3xl md:text-4xl font-bold text-[#00AA46]">Coop</div>
          <div className="text-3xl md:text-4xl font-bold text-[#E57200]">Hemköp</div>
          <div className="text-3xl md:text-4xl font-bold text-[#0050AA]">Lidl</div>
        </div>
        <p className="text-charcoal/40 mt-8 text-sm">
          Willys, City Gross och fler butiker kommer snart
        </p>
      </section>

      {/* Pris */}
      <PricingSection isLoggedIn={isLoggedIn} />

      {/* Sista CTA */}
      <section className="bg-orange py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-white mb-4">
            Redo att slippa matplaneringen?
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            Testa SmartaMenyn gratis i 7 dagar. Om du inte sparar tid och pengar – 
            avsluta när du vill, helt utan kostnad.
          </p>
          {!isLoggedIn && (
            <Button asChild size="lg" className="bg-white text-orange hover:bg-cream-light rounded-full px-10 py-6 text-lg font-semibold shadow-lg">
              <Link href="/signup">Kom igång gratis →</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🥗</span>
              <span className="font-serif font-bold text-lg">SmartaMenyn</span>
            </div>
            <p className="text-white/50 text-sm">
              © 2026 SmartaMenyn · Gjord i Stockholm 🇸🇪
            </p>
            <div className="flex gap-6 text-sm text-white/50">
              <Link href="/privacy" className="hover:text-white transition-colors">Integritetspolicy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Användarvillkor</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
