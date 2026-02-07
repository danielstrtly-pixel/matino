"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Offer {
  id: string;
  name: string;
  brand?: string;
  originalPrice?: number;
  offerPrice: number;
  quantity?: number;
  quantityPrice?: number;
  unit?: string;
  imageUrl?: string;
  offerUrl?: string;
  requiresMembership?: boolean;
  scrapedAt: string;
  storeId: string;
  storeName?: string;
  chain: string;
  chainName?: string;
  chainLogo?: string;
  category?: string;
}

interface Chain {
  id: string;
  name: string;
  logo: string;
  supported: boolean;
}

interface DealsClientProps {
  offers: Offer[];
  chains: Chain[];
  lastUpdated: string | null;
}

const CATEGORIES = [
  { id: 'frukt-gront', name: 'Frukt & Grönt', emoji: '🥬' },
  { id: 'mejeri', name: 'Mejeri', emoji: '🧀' },
  { id: 'kott-chark', name: 'Kött & Chark', emoji: '🥩' },
  { id: 'fisk', name: 'Fisk', emoji: '🐟' },
  { id: 'brod-bageri', name: 'Bröd & Bageri', emoji: '🥐' },
  { id: 'fryst', name: 'Fryst', emoji: '🧊' },
  { id: 'skafferi', name: 'Skafferi', emoji: '🥫' },
  { id: 'dryck', name: 'Dryck', emoji: '🥤' },
  { id: 'godis-snacks', name: 'Godis & Snacks', emoji: '🍫' },
  { id: 'hygien-hushall', name: 'Hygien & Hushåll', emoji: '🧹' },
  { id: 'ovrigt', name: 'Övrigt', emoji: '📦' },
];

const formatPrice = (price: number): string => {
  return price.toFixed(2).replace('.', ',');
};

export default function DealsClient({ offers, chains, lastUpdated }: DealsClientProps) {
  const [selectedChain, setSelectedChain] = useState<string | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");

  // Filter by chain and category
  const filteredOffers = offers.filter(o => {
    const chainMatch = selectedChain === "all" || o.chain === selectedChain;
    const categoryMatch = selectedCategory === "all" || o.category === selectedCategory;
    return chainMatch && categoryMatch;
  });

  const getChainConfig = (chainId: string) => chains.find(c => c.id === chainId);

  // Group offers by chain for stats
  const offersByChain = offers.reduce((acc, o) => {
    acc[o.chain] = (acc[o.chain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group offers by category for stats
  const offersByCategory = offers.reduce((acc, o) => {
    const cat = o.category || 'ovrigt';
    acc[cat] = (acc[cat] || 0) + 1;
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

      {/* Store filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge 
          variant={selectedChain === "all" ? "secondary" : "outline"} 
          className="cursor-pointer"
          onClick={() => setSelectedChain("all")}
        >
          Alla butiker ({offers.length})
        </Badge>
        {chains.filter(c => c.supported).map((chain) => {
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

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Badge 
          variant={selectedCategory === "all" ? "secondary" : "outline"} 
          className="cursor-pointer"
          onClick={() => setSelectedCategory("all")}
        >
          Alla kategorier
        </Badge>
        {CATEGORIES.map((category) => {
          const count = offersByCategory[category.id] || 0;
          if (count === 0) return null;
          return (
            <Badge 
              key={category.id}
              variant={selectedCategory === category.id ? "secondary" : "outline"} 
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.emoji} {category.name} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Empty state */}
      {offers.length === 0 && (
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
      {filteredOffers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredOffers.map((offer) => {
            const chain = getChainConfig(offer.chain);
            const isMultiBuy = offer.quantity && offer.quantity > 1;
            const priceText = isMultiBuy
              ? `${offer.quantity} för ${formatPrice(offer.offerPrice)} kr`
              : `${formatPrice(offer.offerPrice)} kr`;
            const perUnitText = isMultiBuy && offer.quantityPrice
              ? `(${formatPrice(offer.quantityPrice)} kr/st)`
              : null;
            
            const cardContent = (
              <Card className={`hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full ${offer.offerUrl ? 'cursor-pointer' : ''}`}>
                <div className="aspect-square bg-gray-50 relative flex-shrink-0">
                  {offer.imageUrl ? (
                    <Image
                      src={offer.imageUrl.startsWith('//') ? `https:${offer.imageUrl}` : offer.imageUrl}
                      alt={offer.name}
                      fill
                      className="object-contain p-3"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                      🛒
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 bg-green-600 hover:bg-green-600 text-white font-semibold text-xs px-2 py-1 shadow-sm">
                    {priceText}
                  </Badge>
                  {offer.requiresMembership && (
                    <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                      Klubbpris
                    </Badge>
                  )}
                </div>
                
                <div className="p-3 flex flex-col flex-grow">
                  <p className="text-xs text-gray-400 truncate mb-1">
                    {chain?.logo} {offer.storeName || chain?.name}
                  </p>
                  
                  <h3 className="font-medium text-sm leading-snug line-clamp-2 min-h-[2.5rem]">
                    {offer.name}
                  </h3>
                  
                  <div className="mt-auto pt-2">
                    <span className="text-lg font-bold text-green-600">
                      {priceText}
                    </span>
                    {perUnitText && (
                      <span className="text-gray-500 text-xs ml-1">
                        {perUnitText}
                      </span>
                    )}
                    {offer.originalPrice && offer.originalPrice > offer.offerPrice && (
                      <span className="text-gray-400 line-through text-sm ml-2">
                        {formatPrice(offer.originalPrice)} kr
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );

            return offer.offerUrl ? (
              <a key={offer.id} href={offer.offerUrl} target="_blank" rel="noopener noreferrer" className="block">
                {cardContent}
              </a>
            ) : (
              <div key={offer.id}>{cardContent}</div>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      {offers.length > 0 && (
        <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-green-800 text-sm">
            ✅ Visar {filteredOffers.length} av {offers.length} erbjudanden
          </p>
        </div>
      )}
    </div>
  );
}
