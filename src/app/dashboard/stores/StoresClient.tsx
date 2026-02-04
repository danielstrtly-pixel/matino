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

interface StoresClientProps {
  initialStores: Store[];
}

const CHAINS = [
  {
    id: "ica",
    name: "ICA",
    logo: "🔴",
    color: "bg-red-50 border-red-200 hover:bg-red-100",
    activeColor: "bg-red-100 border-red-400",
    description: "ICA Maxi, ICA Kvantum, ICA Supermarket, ICA Nära",
    searchable: true,
    searchPlaceholder: "Sök på butik, stad eller typ (maxi, kvantum...)",
  },
  {
    id: "hemkop",
    name: "Hemköp",
    logo: "🟠",
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    activeColor: "bg-orange-100 border-orange-400",
    description: "Hemköp-butiker i hela Sverige",
    searchable: true,
    searchPlaceholder: "Sök på butik eller stad",
  },
  {
    id: "coop",
    name: "Coop",
    logo: "🟢",
    color: "bg-green-50 border-green-200 hover:bg-green-100",
    activeColor: "bg-green-100 border-green-400",
    description: "Coop, Stora Coop, Coop Extra",
    searchable: true,
    searchPlaceholder: "Sök på butik eller stad",
  },
  {
    id: "lidl",
    name: "Lidl",
    logo: "🔵",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    activeColor: "bg-blue-100 border-blue-400",
    description: "Klicka för att lägga till (samma erbjudanden i alla butiker)",
    searchable: true,
    directAdd: true,
  },
];

export default function StoresClient({ initialStores }: StoresClientProps) {
  const [selectedStores, setSelectedStores] = useState<Store[]>(initialStores);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [activeChain, setActiveChain] = useState<typeof CHAINS[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Store[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Search stores when query changes
  useEffect(() => {
    if (!activeChain || !searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setTotalCount(null);
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
          setTotalCount(data.totalCount || null);
        }
      } catch (e) {
        console.error("Store search failed:", e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeChain]);

  const openChainSearch = async (chain: typeof CHAINS[0]) => {
    if (chain.id === 'lidl') {
      const lidlStore: Store = {
        id: 'lidl-national',
        name: 'Lidl',
        chain: 'lidl',
        externalId: 'national',
      };
      
      if (isStoreSelected('lidl-national')) {
        setSelectedStores(prev => prev.filter(s => s.id !== 'lidl-national'));
      } else {
        setSelectedStores(prev => [...prev, lidlStore]);
      }
      return;
    }
    
    if (chain.searchable) {
      setActiveChain(chain);
      setSearchQuery("");
      setSearchResults([]);
      setTotalCount(null);
      setSearchDialogOpen(true);
    }
  };

  const toggleStoreSelection = (store: Store) => {
    setSelectedStores((prev) => {
      const exists = prev.find((s) => s.id === store.id);
      if (exists) {
        return prev.filter((s) => s.id !== store.id);
      }
      return [...prev, store];
    });
  };

  const isStoreSelected = (storeId: string) => {
    return selectedStores.some((s) => s.id === storeId);
  };

  const getSelectedCountForChain = (chainId: string) => {
    return selectedStores.filter((s) => s.chain === chainId).length;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const res = await fetch("/api/user/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeIds: selectedStores.map((s) => s.id),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        if (data.newStoreIds && data.newStoreIds.length > 0) {
          setIsSaving(false);
          setIsSyncing(true);
          setSyncProgress("Hämtar erbjudanden... Detta kan ta upp till en minut.");
          
          try {
            const syncRes = await fetch("/api/stores/sync-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              setSyncProgress(null);
              const synced = syncData.synced || 0;
              const skipped = syncData.skipped || 0;
              const offers = syncData.offers || 0;
              
              if (synced > 0) {
                setSaveMessage(`✅ ${offers} erbjudanden hämtade från ${synced} butik${synced > 1 ? 'er' : ''}!`);
              } else if (skipped > 0) {
                setSaveMessage(`✅ Butiker sparade! Erbjudanden redan uppdaterade idag.`);
              } else {
                setSaveMessage(`✅ Butiker sparade!`);
              }
            } else {
              setSyncProgress(null);
              setSaveMessage("⚠️ Sparade, men kunde inte hämta erbjudanden");
            }
          } catch (e) {
            console.error("Sync failed:", e);
            setSyncProgress(null);
            setSaveMessage("⚠️ Sparade, men synk misslyckades");
          } finally {
            setIsSyncing(false);
          }
        } else {
          setSaveMessage("✅ Butiker sparade!");
        }
        
        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage("❌ Kunde inte spara");
      }
    } catch (e) {
      console.error("Failed to save stores:", e);
      setSaveMessage("❌ Något gick fel");
    } finally {
      setIsSaving(false);
    }
  };

  const removeStore = (storeId: string) => {
    setSelectedStores((prev) => prev.filter((s) => s.id !== storeId));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Välj dina butiker</h1>
        <p className="text-gray-600 mt-2">
          Klicka på en kedja för att söka och välja specifika butiker.
        </p>
      </div>

      {/* Chain selection */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {CHAINS.map((chain) => {
          const count = getSelectedCountForChain(chain.id);
          const isLidlSelected = chain.id === 'lidl' && isStoreSelected('lidl-national');
          return (
            <Card
              key={chain.id}
              className={`cursor-pointer transition-all border-2 ${
                count > 0 || isLidlSelected ? chain.activeColor : chain.color
              } ${!chain.searchable ? "opacity-50" : ""}`}
              onClick={() => openChainSearch(chain)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-3xl">{chain.logo}</span>
                  <span>{chain.name}</span>
                  {chain.id === 'lidl' ? (
                    isLidlSelected && (
                      <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800">
                        ✓ Tillagd
                      </Badge>
                    )
                  ) : count > 0 ? (
                    <Badge variant="secondary" className="ml-auto">
                      {count} butik{count !== 1 ? "er" : ""}
                    </Badge>
                  ) : null}
                  {!chain.searchable && (
                    <Badge variant="outline" className="ml-auto">
                      Kommer snart
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{chain.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Selected stores list */}
      {selectedStores.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Valda butiker</h2>
          <div className="flex flex-wrap gap-2">
            {selectedStores.map((store) => (
              <Badge
                key={store.id}
                variant="secondary"
                className="px-3 py-1.5 text-sm cursor-pointer hover:bg-red-100"
                onClick={() => removeStore(store.id)}
              >
                {store.name}
                {store.profile && ` (${store.profile})`}
                <span className="ml-2 text-gray-400">×</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <p className="text-gray-600">
            {selectedStores.length} butik{selectedStores.length !== 1 ? "er" : ""} vald{selectedStores.length !== 1 ? "a" : ""}
          </p>
          {saveMessage && (
            <span className="text-sm">{saveMessage}</span>
          )}
          {syncProgress && (
            <span className="text-sm text-orange-600 animate-pulse">{syncProgress}</span>
          )}
        </div>
        <Button onClick={handleSave} disabled={selectedStores.length === 0 || isSaving || isSyncing}>
          {isSyncing ? "Hämtar erbjudanden..." : isSaving ? "Sparar..." : "Spara val"}
        </Button>
      </div>

      {/* Store search dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{activeChain?.logo}</span>
              Välj {activeChain?.name}-butiker
            </DialogTitle>
            <DialogDescription>
              Sök efter butiker och välj de du handlar i.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder={activeChain?.searchPlaceholder || "Sök butiker..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              autoFocus
            />

            {isSearching && (
              <div className="text-center py-4 text-gray-500">
                Söker...
              </div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                Inga butiker hittades för &quot;{searchQuery}&quot;
              </div>
            )}

            {totalCount !== null && totalCount > 0 && (
              <div className="text-sm text-gray-500">
                {totalCount} butiker hittades
              </div>
            )}

            {searchResults.length > 0 && (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {searchResults.map((store) => (
                    <div
                      key={store.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isStoreSelected(store.id)
                          ? "bg-green-50 border-green-300"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleStoreSelection(store)}
                    >
                      <Checkbox
                        checked={isStoreSelected(store.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium flex items-center gap-2">
                          {store.name}
                          {store.profile && (
                            <Badge variant="outline" className="text-xs">
                              {store.profile}
                            </Badge>
                          )}
                        </div>
                        {store.address && (
                          <div className="text-sm text-gray-500 truncate">
                            {store.address}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {searchQuery.length < 2 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-lg mb-2">💡 Tips</p>
                <p>Sök på:</p>
                <ul className="mt-2 space-y-1">
                  <li><strong>maxi</strong> - alla Maxi-butiker</li>
                  <li><strong>stockholm</strong> - butiker i Stockholm</li>
                  <li><strong>kvantum</strong> - alla Kvantum-butiker</li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSearchDialogOpen(false)}>
              Stäng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
