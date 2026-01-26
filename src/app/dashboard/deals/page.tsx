import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Placeholder deals - will be replaced with real scraped data
const PLACEHOLDER_DEALS = [
  {
    id: 1,
    store: "ICA",
    storeLogo: "🔴",
    name: "Färsk kycklingfilé",
    brand: "Kronfågel",
    originalPrice: "159 kr/kg",
    dealPrice: "119 kr/kg",
    savings: "25%",
    validUntil: "2026-02-02",
  },
  {
    id: 2,
    store: "Coop",
    storeLogo: "🟢",
    name: "Laxfilé",
    brand: "Fiskhallen",
    originalPrice: "249 kr/kg",
    dealPrice: "179 kr/kg",
    savings: "28%",
    validUntil: "2026-02-02",
  },
  {
    id: 3,
    store: "Hemköp",
    storeLogo: "🟠",
    name: "Köttfärs",
    brand: "Scan",
    originalPrice: "129 kr/kg",
    dealPrice: "89 kr/kg",
    savings: "31%",
    validUntil: "2026-02-02",
  },
  {
    id: 4,
    store: "Lidl",
    storeLogo: "🔵",
    name: "Pasta Penne",
    brand: "Combino",
    originalPrice: "15 kr",
    dealPrice: "9 kr",
    savings: "40%",
    validUntil: "2026-02-02",
  },
  {
    id: 5,
    store: "ICA",
    storeLogo: "🔴",
    name: "Falukorv",
    brand: "Scan",
    originalPrice: "89 kr",
    dealPrice: "2 för 69 kr",
    savings: "22%",
    validUntil: "2026-02-02",
  },
  {
    id: 6,
    store: "Coop",
    storeLogo: "🟢",
    name: "Ägg 15-pack",
    brand: "Kronägg",
    originalPrice: "59 kr",
    dealPrice: "39 kr",
    savings: "34%",
    validUntil: "2026-02-02",
  },
];

export default function DealsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Veckans erbjudanden</h1>
        <p className="text-gray-600 mt-2">
          Erbjudanden från dina valda butiker. Uppdateras varje vecka.
        </p>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Badge variant="secondary" className="cursor-pointer">Alla</Badge>
        <Badge variant="outline" className="cursor-pointer">🔴 ICA</Badge>
        <Badge variant="outline" className="cursor-pointer">🟢 Coop</Badge>
        <Badge variant="outline" className="cursor-pointer">🟠 Hemköp</Badge>
        <Badge variant="outline" className="cursor-pointer">🔵 Lidl</Badge>
      </div>

      {/* Deals grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLACEHOLDER_DEALS.map((deal) => (
          <Card key={deal.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    {deal.storeLogo} {deal.store}
                  </p>
                  <CardTitle className="text-lg mt-1">{deal.name}</CardTitle>
                  <p className="text-sm text-gray-500">{deal.brand}</p>
                </div>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  -{deal.savings}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">{deal.dealPrice}</span>
                <span className="text-gray-400 line-through text-sm">{deal.originalPrice}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Gäller t.o.m. {deal.validUntil}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-yellow-800 text-sm">
          ⚠️ Detta är exempeldata. Riktiga erbjudanden kommer snart!
        </p>
      </div>
    </div>
  );
}
