import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥗</span>
          <span className="text-xl font-serif font-bold text-charcoal">Matino</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link href="#how-it-works" className="text-charcoal/70 hover:text-charcoal transition-colors">
            Så funkar det
          </Link>
          <Link href="#features" className="text-charcoal/70 hover:text-charcoal transition-colors">
            Funktioner
          </Link>
          <Link href="#stores" className="text-charcoal/70 hover:text-charcoal transition-colors">
            Butiker
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-charcoal/70 hover:text-charcoal transition-colors hidden sm:block">
            Logga in
          </Link>
          <Button asChild className="bg-orange hover:bg-[#D55A25] text-white rounded-full px-6">
            <Link href="/signup">Kom igång</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="bg-orange-light text-orange border-0 mb-6">
              🥕 Matplanering gjort enkelt
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-charcoal mb-6 leading-tight">
              Gör det enkelt med{" "}
              <span className="text-fresh">färska</span>{" "}
              matplaner
            </h1>
            <p className="text-lg text-charcoal/70 mb-8 max-w-lg">
              Matino hittar veckans bästa erbjudanden från dina favoritbutiker och 
              skapar personliga veckomenyer med AI. Spara tid och pengar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="bg-orange hover:bg-[#D55A25] text-white rounded-full px-8 py-6 text-lg">
                <Link href="/demo">Prova nu</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-8 py-6 text-lg border-cream-dark hover:bg-cream-dark">
                <Link href="/signup">Skapa konto</Link>
              </Button>
            </div>
            <p className="text-sm text-charcoal/50 mt-4">
              ✨ Gratis i 7 dagar · 69 kr/mån · Avsluta när du vill
            </p>
          </div>
          
          {/* Feature cards floating */}
          <div className="relative hidden lg:block">
            <div className="bg-cream-light rounded-3xl p-8 shadow-lg overflow-hidden">
              {/* Food emoji grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                  <div className="text-4xl mb-2">🥦</div>
                  <p className="text-xs text-charcoal/50">Grönsaker</p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                  <div className="text-4xl mb-2">🍗</div>
                  <p className="text-xs text-charcoal/50">Protein</p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                  <div className="text-4xl mb-2">🍝</div>
                  <p className="text-xs text-charcoal/50">Kolhydrater</p>
                </div>
                <div className="bg-orange-light rounded-2xl p-4 text-center col-span-2">
                  <p className="text-sm font-medium text-orange">🏷️ 3 för 2</p>
                  <p className="text-xs text-charcoal/50">Veckans deal</p>
                </div>
                <div className="bg-fresh-light rounded-2xl p-4 text-center">
                  <div className="text-2xl">📋</div>
                  <p className="text-xs text-charcoal/50">Meny</p>
                </div>
              </div>
            </div>
            
            {/* Floating badge 1 */}
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-lg flex items-center gap-3">
              <div className="w-10 h-10 bg-fresh-light rounded-full flex items-center justify-center">
                <span className="text-fresh">✓</span>
              </div>
              <div>
                <p className="font-semibold text-charcoal text-sm">Alltid aktuellt</p>
                <p className="text-xs text-charcoal/50">Uppdateras dagligen</p>
              </div>
            </div>
            
            {/* Floating badge 2 */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl p-4 shadow-lg flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-light rounded-full flex items-center justify-center">
                <span className="text-orange">💰</span>
              </div>
              <div>
                <p className="font-semibold text-charcoal text-sm">Spara pengar</p>
                <p className="text-xs text-charcoal/50">Bästa erbjudanden</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <Badge className="bg-fresh-light text-fresh border-0 mb-4">Så funkar det</Badge>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-charcoal">
            Tre enkla steg till smartare matlagning
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: "🏪", num: "01", title: "Välj dina butiker", desc: "Välj vilka butiker du handlar i. Vi stödjer ICA, Coop, Hemköp och Lidl." },
            { icon: "🤖", num: "02", title: "AI skapar din meny", desc: "Vår AI analyserar erbjudanden och dina preferenser för den perfekta veckomenyn." },
            { icon: "📝", num: "03", title: "Handla smart", desc: "Få en smart inköpslista som visar var du köper vad – och sparar mest." },
          ].map((step, i) => (
            <Card key={i} className="bg-cream-light border-cream-dark rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{step.icon}</div>
                  <span className="text-5xl font-serif font-bold text-cream-dark">{step.num}</span>
                </div>
                <h3 className="text-xl font-serif font-semibold text-charcoal mb-2">{step.title}</h3>
                <p className="text-charcoal/70">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-fresh text-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Varför Matino?</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: "💰", title: "Spara pengar", desc: "Menyer baserade på veckans bästa deals" },
              { icon: "⏰", title: "Spara tid", desc: "Slipp frågan 'vad ska vi äta?'" },
              { icon: "🎯", title: "Personligt", desc: "AI som lär sig vad du gillar" },
              { icon: "👨‍👩‍👧‍👦", title: "För hela familjen", desc: "Dela menyer och inköpslistor" },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-serif font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-white/70 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported stores */}
      <section id="stores" className="container mx-auto px-4 py-20 text-center">
        <Badge className="bg-orange-light text-orange border-0 mb-4">Butiker</Badge>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-12">
          Vi hämtar erbjudanden från
        </h2>
        <div className="flex flex-wrap justify-center gap-12 items-center">
          <div className="text-3xl font-bold text-red-600 opacity-80 hover:opacity-100 transition-opacity">ICA</div>
          <div className="text-3xl font-bold text-green-700 opacity-80 hover:opacity-100 transition-opacity">Coop</div>
          <div className="text-3xl font-bold text-orange-600 opacity-80 hover:opacity-100 transition-opacity">Hemköp</div>
          <div className="text-3xl font-bold text-blue-600 opacity-80 hover:opacity-100 transition-opacity">Lidl</div>
        </div>
        <p className="text-charcoal/50 mt-6">Fler butiker kommer snart...</p>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto p-8 md:p-12 bg-orange text-white border-0 rounded-3xl">
          <CardContent className="pt-6 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Redo att äta smartare?
            </h2>
            <p className="mb-8 text-white/80 text-lg">
              Börja med 7 dagars gratis provperiod. Inget betalkort krävs.
            </p>
            <Button size="lg" className="bg-white text-orange hover:bg-cream-light rounded-full px-10 py-6 text-lg font-semibold">
              <Link href="/signup">Kom igång nu →</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-cream-dark py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🥗</span>
            <span className="font-serif font-bold text-charcoal">Matino</span>
          </div>
          <p className="text-charcoal/50 text-sm">© 2026 Matino. Gjord med 🥗 i Stockholm.</p>
          <div className="flex gap-6 text-sm text-charcoal/50">
            <Link href="#" className="hover:text-charcoal">Integritet</Link>
            <Link href="#" className="hover:text-charcoal">Villkor</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
