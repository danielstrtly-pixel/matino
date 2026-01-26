"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Offer {
  id: string;
  name: string;
  brand?: string;
  originalPrice?: number;
  offerPrice: number;
  unit?: string;
  imageUrl?: string;
  requiresMembership?: boolean;
  scrapedAt: string;
  storeId: string;
  storeName?: string;
  chain: string;
  chainName?: string;
  chainLogo?: string;
}

const CHAINS = [
  { id: 'ica', name: 'ICA', logo: '🔴', supported: true },
  { id: 'hemkop', name: 'Hemköp', logo: '🟠', supported: true },
  { id: 'coop', name: 'Coop', logo: '🟢', supported: false },
  { id: 'lidl', name: 'Lidl', logo: '🔵', supported: false },
];

export default function DealsPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string | "all">("all");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async (storeId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (storeId) params.set('storeId', storeId);
      
      const res = await fetch(`/api/offers?${params}`);
      
      if (!res.ok) throw new Error('Failed to fetch offers');
      
      const data = await res.json();
      setOffers(data.offers || []);
      
      // Find most recent scrape time
      if (data.offers?.length > 0) {
        const newest = data.offers.reduce((a: Offer, b: Offer) => 
          new Date(a.scrapedAt) > new Date(b.scrapedAt) ? a : b
        );
        setLastUpdated(newest.scrapedAt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = selectedChain === "all" 
    ? offers 
    : offers.filter(o => o.chain === selectedChain);

  const getChainConfig = (chainId: string) => {
    return CHAINS.find(c => c.id === chainId);
  };

  // Group offers by chain for stats
  const offersByChain = offers.reduce((acc, o) => {
    acc[o.chain] = (acc[o.chain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Veckans erbjudanden</h1>
        <p className="text-gray-600 mt-2">
          {offers.length > 0 
            ? `${offers.length} erbjudanden från dina valda butiker`
            : 'Välj butiker i inställningarna för att se erbjudanden'}
        </p>
        {lastUpdated && (
          <p className="text-sm text-gray-400 mt-1">
            Uppdaterad: {new Date(lastUpdated).toLocaleString('sv-SE')}
          </p>
        )}
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Badge 
          variant={selectedChain === "all" ? "secondary" : "outline"} 
          className="cursor-pointer"
          onClick={() => setSelectedChain("all")}
        >
          Alla ({offers.length})
        </Badge>
        {CHAINS.filter(c => c.supported).map((chain) => {
          const count = offersByChain[chain.id] || 0;
          if (count === 0) return null;
          return (
            <Badge 
              key={chain.id}
              variant={selectedChain === chain.id ? "secondary" : "outline"} 
              className="cursor-pointer"
              onClick={() => setSelectedChain(chain.id)}
            >
              {chain.logo} {chain.name} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laddar erbjudanden...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-6">
          <p className="text-red-800">❌ {error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => loadOffers()}>
            Försök igen
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && offers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="text-xl font-medium mb-2">Inga erbjudanden ännu</h3>
          <p className="text-gray-500 mb-4">
            Välj butiker i inställningarna så hämtar vi erbjudanden åt dig.
          </p>
          <Button asChild>
            <a href="/dashboard/stores">Välj butiker</a>
          </Button>
        </div>
      )}

      {/* Deals grid */}
      {!loading && !error && filteredOffers.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOffers.map((offer) => {
            const chain = getChainConfig(offer.chain);
            return (
              <Card key={offer.id} className="hover:shadow-md transition-shadow overflow-hidden">
                {offer.imageUrl && (
                  <div className="aspect-square bg-gray-100 relative">
                    <img 
                      src={offer.imageUrl} 
                      alt={offer.name}
                      className="w-full h-full object-contain p-4"
                      loading="lazy"
                    />
                    <Badge className="absolute top-2 right-2 bg-green-600">
                      {offer.offerPrice} kr
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        {offer.chainLogo || chain?.logo} {offer.storeName || chain?.name}
                      </p>
                      <CardTitle className="text-base mt-1 line-clamp-2">{offer.name}</CardTitle>
                      {offer.brand && (
                        <p className="text-sm text-gray-500 truncate">{offer.brand}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-green-600">
                      {offer.offerPrice} kr
                      {offer.unit && <span className="text-sm font-normal">/{offer.unit}</span>}
                    </span>
                    {offer.originalPrice && (
                      <span className="text-gray-400 line-through text-sm">
                        {offer.originalPrice} kr
                      </span>
                    )}
                  </div>
                  {offer.requiresMembership && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      🏷️ Klubbpris
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      {!loading && offers.length > 0 && (
        <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-green-800 text-sm">
            ✅ Visar {filteredOffers.length} av {offers.length} erbjudanden
          </p>
        </div>
      )}
    </div>
  );
}
