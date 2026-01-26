"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHAINS, PREDEFINED_STORES, type Offer, type Store, type ChainId } from "@/lib/scraper-client";

export default function DealsPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId | "all">("all");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  // Auto-load Hemköp Östermalmstorg on mount for demo
  useEffect(() => {
    const defaultStore = PREDEFINED_STORES.find(s => s.id === 'hemkop-4147');
    if (defaultStore) {
      loadOffers(defaultStore);
    }
  }, []);

  const loadOffers = async (store: Store) => {
    setLoading(true);
    setError(null);
    setSelectedStore(store);
    
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(store),
      });
      
      if (!res.ok) throw new Error('Failed to fetch offers');
      
      const data = await res.json();
      setOffers(data.offers || []);
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

  const getChainConfig = (chainId: ChainId) => {
    return CHAINS.find(c => c.id === chainId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Veckans erbjudanden</h1>
        <p className="text-gray-600 mt-2">
          {selectedStore 
            ? `Erbjudanden från ${selectedStore.name}`
            : 'Välj en butik för att se erbjudanden'}
        </p>
      </div>

      {/* Store selector */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-3">Välj butik:</h3>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_STORES.map((store) => {
            const chain = getChainConfig(store.chain);
            return (
              <Button
                key={store.id}
                variant={selectedStore?.id === store.id ? "default" : "outline"}
                size="sm"
                onClick={() => loadOffers(store)}
                disabled={loading}
              >
                {chain?.logo} {store.name}
              </Button>
            );
          })}
        </div>
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
          const count = offers.filter(o => o.chain === chain.id).length;
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
          <p className="mt-4 text-gray-600">Hämtar erbjudanden...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-6">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Deals grid */}
      {!loading && !error && (
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
                        {chain?.logo} {chain?.name}
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
                      {offer.unit && <span className="text-sm">/{offer.unit}</span>}
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

      {/* Empty state */}
      {!loading && !error && filteredOffers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Inga erbjudanden hittades.</p>
          <p className="text-sm text-gray-400 mt-2">Välj en butik ovan för att se erbjudanden.</p>
        </div>
      )}

      {/* Stats */}
      {!loading && offers.length > 0 && (
        <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-green-800 text-sm">
            ✅ Visar {filteredOffers.length} erbjudanden
            {selectedStore && ` från ${selectedStore.name}`}
          </p>
        </div>
      )}
    </div>
  );
}
