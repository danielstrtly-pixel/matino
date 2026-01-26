import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥗</span>
          <span className="text-xl font-bold text-green-800">Matino</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Logga in
          </Link>
          <Button asChild>
            <Link href="/signup">Kom igång gratis</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          🎉 Prova gratis i 7 dagar
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Smartare matplanering.<br />
          <span className="text-green-600">Billigare vardag.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Matino hittar veckans bästa erbjudanden från dina favoritbutiker och 
          skapar en personlig veckomeny med AI. Spara tid, spara pengar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/demo">Prova utan att logga in →</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/signup">Skapa konto</Link>
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          69 kr/mån efter provperioden. Avsluta när du vill.
        </p>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Så funkar det</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="text-4xl mb-4">🏪</div>
              <h3 className="text-xl font-semibold mb-2">1. Välj dina butiker</h3>
              <p className="text-gray-600">
                Välj vilka butiker du handlar i. Vi stödjer ICA, Coop, Hemköp och Lidl.
              </p>
            </CardContent>
          </Card>
          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">2. AI skapar din meny</h3>
              <p className="text-gray-600">
                Vår AI analyserar erbjudanden och dina preferenser för att skapa den perfekta veckomenyn.
              </p>
            </CardContent>
          </Card>
          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">3. Handla smart</h3>
              <p className="text-gray-600">
                Få en smart inköpslista som visar var du köper vad – och sparar mest.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="bg-green-900 text-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Varför Matino?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "💰", title: "Spara pengar", desc: "Menyer baserade på veckans bästa deals" },
              { icon: "⏰", title: "Spara tid", desc: "Slipp frågan 'vad ska vi äta?'" },
              { icon: "🎯", title: "Personligt", desc: "AI som lär sig vad du gillar" },
              { icon: "👨‍👩‍👧‍👦", title: "För hela familjen", desc: "Dela menyer och listor" },
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-green-200 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported stores */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-8">Butiker vi stödjer</h2>
        <div className="flex flex-wrap justify-center gap-8 items-center opacity-70">
          <div className="text-2xl font-bold text-red-600">ICA</div>
          <div className="text-2xl font-bold text-green-700">Coop</div>
          <div className="text-2xl font-bold text-red-500">Hemköp</div>
          <div className="text-2xl font-bold text-blue-600">Lidl</div>
        </div>
        <p className="text-gray-500 mt-4">Fler butiker kommer snart...</p>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Card className="max-w-2xl mx-auto p-8 bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
          <CardContent className="pt-6">
            <h2 className="text-3xl font-bold mb-4">Redo att äta smartare?</h2>
            <p className="mb-6 text-green-100">
              Börja med 7 dagars gratis provperiod. Inget betalkort krävs.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup">Kom igång nu →</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2026 Matino. Gjord med 🥗 i Stockholm.</p>
        </div>
      </footer>
    </div>
  );
}
