"use client";

import { useState, useEffect } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Store {
  id: string;
  name: string;
  address?: string;
  city?: string;
  chain: string;
  externalId: string;
  profile?: string;
}

interface OnboardingStoreSelectProps {
  onComplete: () => void;
}

const CHAINS = [
  {
    id: "ica",
    name: "ICA",
    description: "ICA Maxi, Kvantum, Supermarket, Nära",
    searchPlaceholder: "Sök på butik, stad eller typ (maxi, kvantum...)",
    searchTips: [
      { term: "maxi", desc: "alla Maxi-butiker" },
      { term: "stockholm", desc: "butiker i Stockholm" },
    ],
  },
  {
    id: "hemkop",
    name: "Hemköp",
    description: "Hemköp-butiker i hela Sverige",
    searchPlaceholder: "Sök på butik eller stad",
    searchTips: [
      { term: "stockholm", desc: "butiker i Stockholm" },
      { term: "göteborg", desc: "butiker i Göteborg" },
    ],
  },
  {
    id: "coop",
    name: "Coop",
    description: "Coop, Stora Coop, Coop Extra",
    searchPlaceholder: "Sök på butik eller stad",
    searchTips: [
      { term: "stockholm", desc: "butiker i Stockholm" },
    ],
  },
  {
    id: "lidl",
    name: "Lidl",
    description: "Samma erbjudanden i alla butiker",
    directAdd: true,
  },
] as const;

export function OnboardingStoreSelect({ onComplete }: OnboardingStoreSelectProps) {
  const [selectedStores, setSelectedStores] = useState<Store[]>([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [activeChain, setActiveChain] = useState<(typeof CHAINS)[number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Store[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!activeChain || !searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/stores/search?chain=${activeChain.id}&q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.stores || []);
        }
      } catch (e) {
        console.error("Store search failed:", e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeChain]);

  const openChainSearch = (chain: (typeof CHAINS)[number]) => {
    if (chain.id === "lidl") {
      const lidlStore: Store = {
        id: "lidl-national",
        name: "Lidl",
        chain: "lidl",
        externalId: "national",
      };
      if (selectedStores.some((s) => s.id === "lidl-national")) {
        setSelectedStores((prev) => prev.filter((s) => s.id !== "lidl-national"));
      } else {
        setSelectedStores((prev) => [...prev, lidlStore]);
      }
      return;
    }

    setActiveChain(chain);
    setSearchQuery("");
    setSearchResults([]);
    setSearchDialogOpen(true);
  };

  const toggleStore = (store: Store) => {
    setSelectedStores((prev) => {
      const exists = prev.find((s) => s.id === store.id);
      if (exists) return prev.filter((s) => s.id !== store.id);
      return [...prev, store];
    });
  };

  const isSelected = (storeId: string) => selectedStores.some((s) => s.id === storeId);

  const countForChain = (chainId: string) =>
    selectedStores.filter((s) => s.chain === chainId).length;

  const handleSave = async () => {
    if (selectedStores.length === 0) return;
    setIsSaving(true);

    try {
      const res = await fetch("/api/user/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeIds: selectedStores.map((s) => s.id) }),
      });

      if (res.ok) {
        // Trigger offer sync in the background
        fetch("/api/stores/sync-user", { method: "POST" }).catch(() => {});
        onComplete();
      }
    } catch (e) {
      console.error("Failed to save stores:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Chain grid */}
      <div className="grid grid-cols-2 gap-3">
        {CHAINS.map((chain) => {
          const count = countForChain(chain.id);
          const isLidlSelected = chain.id === "lidl" && isSelected("lidl-national");
          const isActive = count > 0 || isLidlSelected;

          return (
            <Card
              key={chain.id}
              className={`cursor-pointer transition-all border-2 ${
                isActive
                  ? "border-fresh/40 bg-green-50/50"
                  : "border-cream-dark hover:border-cream-dark/80 bg-cream-light"
              }`}
              onClick={() => openChainSearch(chain)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center justify-between">
                  {chain.name}
                  {isActive && (
                    <Badge variant="secondary" className="bg-fresh-light text-fresh text-xs">
                      {chain.id === "lidl" ? "Tillagd" : `${count}`}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">{chain.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Selected stores */}
      {selectedStores.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">
            {selectedStores.length} butik{selectedStores.length !== 1 ? "er" : ""} vald{selectedStores.length !== 1 ? "a" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedStores.map((store) => (
              <Badge
                key={store.id}
                variant="secondary"
                className="px-2.5 py-1 text-xs cursor-pointer hover:bg-red-100"
                onClick={() => toggleStore(store)}
              >
                {store.name}
                {store.profile && ` (${store.profile})`}
                <span className="ml-1.5 text-gray-400">&times;</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={selectedStores.length === 0 || isSaving}
        className="w-full bg-fresh hover:bg-fresh/90 text-white"
        size="lg"
      >
        {isSaving ? "Sparar..." : "Spara butiker och fortsätt"}
      </Button>

      {/* Search dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Välj {activeChain?.name}-butiker</DialogTitle>
            <DialogDescription>Sök efter butiker och välj de du handlar i.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder={
                activeChain && "searchPlaceholder" in activeChain
                  ? activeChain.searchPlaceholder
                  : "Sök butiker..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />

            {isSearching && (
              <div className="text-center py-4 text-gray-500 text-sm">Söker...</div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                Inga butiker hittades för &quot;{searchQuery}&quot;
              </div>
            )}

            {searchResults.length > 0 && (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {searchResults.map((store) => (
                    <div
                      key={store.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected(store.id)
                          ? "bg-green-50 border-green-300"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleStore(store)}
                    >
                      <Checkbox checked={isSelected(store.id)} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {store.name}
                          {store.profile && (
                            <Badge variant="outline" className="text-xs">
                              {store.profile}
                            </Badge>
                          )}
                        </div>
                        {store.address && (
                          <div className="text-xs text-gray-500 truncate">{store.address}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {searchQuery.length < 2 && activeChain && "searchTips" in activeChain && (
              <div className="text-center py-6 text-gray-400 text-sm">
                <p className="mb-2">Sök på:</p>
                <ul className="space-y-1">
                  {activeChain.searchTips.map((tip) => (
                    <li key={tip.term}>
                      <strong>{tip.term}</strong> - {tip.desc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-2">
            <Button variant="outline" onClick={() => setSearchDialogOpen(false)}>
              Klar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
