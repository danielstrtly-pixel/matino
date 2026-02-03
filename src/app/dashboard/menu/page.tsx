"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RecipeCarousel } from "@/components/RecipeCarousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
type MenuMode = 'taste' | 'budget';

interface RecipeLink {
  title: string;
  url: string;
  description: string;
  source: string;
  imageUrl?: string;
}

interface MealSuggestion {
  name: string;
  searchQuery?: string;
  description: string;
  tags: string[];
  usesOffers?: string[];
}

interface MatchedOffer {
  offerId: string;
  offerName: string;
  price: number;
  store: string;
  offerUrl?: string;
}

interface MenuItem {
  day: string;
  dayIndex: number;
  meal: 'lunch' | 'dinner';
  suggestion: MealSuggestion;
  recipes: RecipeLink[];
  matchedOffers: MatchedOffer[];
}

interface GeneratedMenu {
  id?: string;
  name?: string;
  items: MenuItem[];
  generatedAt: string;
  mode?: MenuMode;
}

interface SavedMenu {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
}


export default function MenuPage() {
  const [menu, setMenu] = useState<GeneratedMenu | null>(null);
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [swapItem, setSwapItem] = useState<MenuItem | null>(null);
  const [swapReason, setSwapReason] = useState('');
  const [swapPreference, setSwapPreference] = useState('');
  const [mode, setMode] = useState<MenuMode>('taste');

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await fetch('/api/ai/menu');
        if (res.ok) {
          const data = await res.json();
          if (data.menu) {
            setMenu(data.menu);
            if (data.menu.mode) setMode(data.menu.mode);
          }
        }
      } catch (e) {
        console.error('Failed to load menu:', e);
      } finally {
        setLoading(false);
      }
    };
    loadMenu();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/ai/menu?all=true');
      if (res.ok) {
        const data = await res.json();
        setSavedMenus(data.menus || []);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  const loadSpecificMenu = async (menuId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/menu?id=${menuId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.menu) {
          setMenu(data.menu);
          if (data.menu.mode) setMode(data.menu.mode);
        }
      }
    } catch (e) {
      console.error('Failed to load menu:', e);
    } finally {
      setLoading(false);
      setShowHistory(false);
    }
  };

  const generateMenu = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', mode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate menu');
      }
      const data = await res.json();
      setMenu(data.menu);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel');
    } finally {
      setGenerating(false);
    }
  };

  const openSwapDialog = (item: MenuItem) => {
    setSwapItem(item);
    setSwapReason('');
    setSwapPreference('');
  };

  const executeSwap = async () => {
    if (!swapItem) return;
    const key = `${swapItem.dayIndex}-${swapItem.meal}`;
    setSwapping(key);
    setSwapItem(null);
    try {
      const res = await fetch('/api/ai/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap',
          currentMenu: menu,
          dayIndex: swapItem.dayIndex,
          meal: swapItem.meal,
          mode,
          feedback: {
            recipeName: swapItem.suggestion.name,
            reason: swapReason,
            preference: swapPreference,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to swap meal');
      }
      const data = await res.json();
      setMenu(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(m =>
            m.dayIndex === swapItem.dayIndex && m.meal === swapItem.meal
              ? data.meal : m
          ),
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte byta rätt');
    } finally {
      setSwapping(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Veckomeny</h1>
            {menu?.name && (
              <p className="text-sm text-gray-500 mt-1">
                {menu.name} • {new Date(menu.generatedAt).toLocaleDateString('sv-SE')}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => { loadHistory(); setShowHistory(true); }}>
            📋
          </Button>
        </div>

        {/* Mode toggle */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('taste')}
            className={`p-3 rounded-xl border-2 transition-all text-left ${
              mode === 'taste'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-lg">🍽️</span>
            <span className="font-semibold ml-2 text-sm">Äta gott</span>
            <p className="text-xs text-gray-500 mt-0.5">Smak i fokus, erbjudanden som bonus</p>
          </button>
          <button
            onClick={() => setMode('budget')}
            className={`p-3 rounded-xl border-2 transition-all text-left ${
              mode === 'budget'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-lg">💰</span>
            <span className="font-semibold ml-2 text-sm">Spara pengar</span>
            <p className="text-xs text-gray-500 mt-0.5">Bygg menyn kring veckans deals</p>
          </button>
        </div>

        <Button onClick={generateMenu} disabled={generating} className="mt-4 w-full sm:w-auto" size="lg">
          {generating ? '⏳ Skapar meny...' : `🤖 ${menu ? 'Ny meny' : 'Skapa veckomeny'}`}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {(generating || loading) && (
        <div className="space-y-6">
          {generating && (
            <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              ✨ Söker recept från ICA, Tasteline och Arla...
            </p>
          )}
          {[1, 2, 3].map(i => (
            <div key={i}>
              <Skeleton className="h-5 w-20 mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map(j => (
                  <Skeleton key={j} className="h-64 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!generating && !loading && !menu && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className="text-xl font-semibold mb-2">Ingen veckomeny ännu</h2>
          <p className="text-gray-500 text-sm">
            Välj fokus och klicka &quot;Skapa veckomeny&quot; för att få recept från ICA, Tasteline och Arla.
          </p>
        </div>
      )}

      {/* Menu */}
      {!generating && !loading && menu && (
        <div className="space-y-8">
          {menu.items.map((item) => {
            const isSwapping = swapping === `${item.dayIndex}-${item.meal}`;
            const hasRecipes = item.recipes?.length > 0;

            return (
              <div key={`${item.dayIndex}-${item.meal}`}>
                {/* Day header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-green-700">{item.day}</h2>
                    <span className="text-base text-charcoal font-medium">— {item.suggestion.name}</span>
                    {item.matchedOffers.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.matchedOffers.map((offer, i) => {
                          const shortStore = offer.store
                            .replace('Supermarket ', '')
                            .replace(', Sthlm', '');
                          const badgeContent = (
                            <Badge className={`bg-green-100 text-green-800 text-xs font-normal ${offer.offerUrl ? 'cursor-pointer hover:bg-green-200' : ''}`}>
                              🏷️ {offer.offerName} {offer.price} kr — {shortStore}
                            </Badge>
                          );
                          return offer.offerUrl ? (
                            <a key={i} href={offer.offerUrl} target="_blank" rel="noopener noreferrer">
                              {badgeContent}
                            </a>
                          ) : (
                            <span key={i}>{badgeContent}</span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500"
                    onClick={() => openSwapDialog(item)}
                    disabled={isSwapping}
                  >
                    {isSwapping ? '⏳' : '🔄 Byt'}
                  </Button>
                </div>

                {/* Recipe carousel */}
                {hasRecipes ? (
                  <RecipeCarousel 
                    recipes={item.recipes.filter(r => r.imageUrl && !r.title.startsWith('Sök'))}
                  />
                ) : (
                  <Card className="p-6 text-center text-gray-400 text-sm">
                    Inga recept hittades
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Swap dialog */}
      <Dialog open={!!swapItem} onOpenChange={() => setSwapItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Byt rätt — {swapItem?.day}</DialogTitle>
            <DialogDescription>Berätta vad du tänker så hittar vi något bättre.</DialogDescription>
          </DialogHeader>
          {swapItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Vad gillar du inte? (valfritt)</Label>
                <Textarea
                  id="reason"
                  placeholder="T.ex. 'Gillar inte fisk', 'Tar för lång tid'..."
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preference">Vad föredrar du? (valfritt)</Label>
                <Textarea
                  id="preference"
                  placeholder="T.ex. 'Något med kyckling', 'Vegetariskt'..."
                  value={swapPreference}
                  onChange={(e) => setSwapPreference(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSwapItem(null)}>Avbryt</Button>
            <Button onClick={executeSwap}>🔄 Byt rätt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tidigare menyer</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {savedMenus.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Inga sparade menyer</p>
            )}
            {savedMenus.map((m) => (
              <button
                key={m.id}
                onClick={() => loadSpecificMenu(m.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  m.is_active ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <p className="font-medium">{m.name || 'Meny'}</p>
                <p className="text-sm text-gray-500">
                  {new Date(m.created_at).toLocaleDateString('sv-SE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

