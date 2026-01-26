import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DEMO_DEALS = [
  { store: "ICA", name: "Kycklingfilé", price: "119 kr/kg", savings: "-25%" },
  { store: "Coop", name: "Laxfilé", price: "179 kr/kg", savings: "-28%" },
  { store: "Hemköp", name: "Köttfärs", price: "89 kr/kg", savings: "-31%" },
  { store: "Lidl", name: "Pasta", price: "9 kr", savings: "-40%" },
];

const DEMO_MENU = [
  { day: "Måndag", meal: "Kycklingwok med grönsaker", deal: "Kycklingfilé (ICA)" },
  { day: "Tisdag", meal: "Köttfärssås med pasta", deal: "Köttfärs + Pasta" },
  { day: "Onsdag", meal: "Ugnsbakad lax", deal: "Laxfilé (Coop)" },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🥗</span>
          <span className="text-xl font-bold text-green-800">Matino</span>
        </Link>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">Demo-läge</Badge>
          <Button asChild>
            <Link href="/signup">Skapa konto för full access</Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Prova Matino</h1>
          <p className="text-gray-600">
            Här ser du ett exempel på hur tjänsten fungerar. Skapa ett konto för full tillgång.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Deals preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏷️ Veckans erbjudanden
              </CardTitle>
              <CardDescription>Exempel på deals vi hittar åt dig</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_DEALS.map((deal, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{deal.name}</p>
                      <p className="text-sm text-gray-500">{deal.store}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{deal.price}</p>
                      <Badge className="bg-green-100 text-green-800">{deal.savings}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 Med ett konto kan du välja dina butiker och se alla aktuella erbjudanden.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Menu preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🍽️ AI-genererad veckomeny
              </CardTitle>
              <CardDescription>Baserat på veckans deals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_MENU.map((item, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">{item.day}</p>
                    <p className="font-medium">{item.meal}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      🏷️ Använder: {item.deal}
                    </Badge>
                  </div>
                ))}
                <div className="text-center text-gray-400 py-2">
                  + 4 rätter till...
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 Skapa ett konto för att generera din personliga veckomeny!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Card className="max-w-md mx-auto p-6 bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardContent className="pt-4">
              <h2 className="text-2xl font-bold mb-2">Redo att börja?</h2>
              <p className="mb-4 text-green-100">
                7 dagars gratis provperiod. Inget kort krävs.
              </p>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/signup">Skapa konto gratis →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
