"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  model?: string;
  mode?: MenuMode;
}

interface SavedMenu {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  'ICA': 'bg-red-50 border-red-200 text-red-900 hover:bg-red-100',
  'Tasteline': 'bg-orange-50 border-orange-200 text-orange-900 hover:bg-orange-100',
  'Arla': 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100',
};

const SOURCE_ICONS: Record<string, string> = {
  'ICA': '🔴',
  'Tasteline': '🟠',
  'Arla': '🔵',
};

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
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
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
      console.error('Menu generation error:', e);
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
              ? data.meal
              : m
          ),
        };
      });
    } catch (e) {
      console.error('Swap error:', e);
      setError(e instanceof Error ? e.message : 'Kunde inte byta rätt');
    } finally {
      setSwapping(null);
    }
  };

  const toggleExpand = (dayIndex: number) => {
    setExpandedDay(prev => prev === dayIndex ? null : dayIndex);
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Din veckomeny</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Välj fokus och generera en meny anpassad efter dig.
            </p>
            {menu?.name && (
              <p className="text-xs md:text-sm text-green-600 mt-1">
                📅 {menu.name} • Skapad {new Date(menu.generatedAt).toLocaleDateString('sv-SE')}
                {menu.mode && (
                  <span className="ml-2">
                    {menu.mode === 'taste' ? '• 🍽️ Smak-fokus' : '• 💰 Budget-fokus'}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => { loadHistory(); setShowHistory(true); }}
            >
              📋 Historik
            </Button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setMode('taste')}
            className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
              mode === 'taste'
                ? 'border-green-500 bg-green-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🍽️</span>
              <span className="font-semibold">Jag vill äta gott</span>
            </div>
            <p className="text-xs text-gray-500">
              Attraktiva rätter utifrån din smak. Erbjudanden visas som bonus.
            </p>
          </button>
          <button
            onClick={() => setMode('budget')}
            className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
              mode === 'budget'
                ? 'border-green-500 bg-green-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">💰</span>
              <span className="font-semibold">Jag vill spara pengar</span>
            </div>
            <p className="text-xs text-gray-500">
              Meny byggd kring veckans erbjudanden. Fortfarande gott!
            </p>
          </button>
        </div>

        {/* Generate button */}
        <div className="mt-4">
          <Button
            onClick={generateMenu}
            disabled={generating}
            size="lg"
            className="w-full sm:w-auto"
          >
            {generating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Skapar meny...
              </>
            ) : (
              <>🤖 {menu ? 'Ny meny' : 'Skapa veckomeny'}</>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Loading state */}
      {(generating || loading) && (
        <div className="space-y-4">
          {generating && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              ✨ Söker recept från ICA, Tasteline och Arla... Detta tar ca 10 sekunder.
            </div>
          )}
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!generating && !loading && !menu && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-semibold mb-2">Ingen veckomeny ännu</h2>
            <p className="text-gray-500 mb-2">
              Välj fokus ovan och klicka &quot;Skapa veckomeny&quot;.
            </p>
            <p className="text-gray-400 text-sm">
              Vi hittar recept från ICA, Tasteline och Arla åt dig.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Menu cards */}
      {!generating && !loading && menu && (
        <div className="space-y-4">
          {menu.items.map((item) => {
            const isSwapping = swapping === `${item.dayIndex}-${item.meal}`;
            const isExpanded = expandedDay === item.dayIndex;
            const hasRecipes = item.recipes && item.recipes.length > 0;

            return (
              <Card
                key={`${item.dayIndex}-${item.meal}`}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-600">{item.day}</p>
                      <CardTitle className="text-lg md:text-xl mt-1">
                        {item.suggestion.name}
                      </CardTitle>
                      <p className="text-xs md:text-sm text-gray-500 mt-1">
                        {item.suggestion.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Matched offers */}
                  {item.matchedOffers.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {item.matchedOffers.map((offer, i) => {
                          const shortStore = offer.store
                            .replace('Supermarket ', '')
                            .replace(', Sthlm', '');
                          return (
                            <Badge key={i} className="bg-green-100 text-green-800 text-xs">
                              🏷️ {offer.offerName} ({offer.price} kr, {shortStore})
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {item.suggestion.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.suggestion.tags.slice(0, 5).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Recipe links — always visible on desktop, toggle on mobile */}
                  {hasRecipes && (
                    <div className={`mb-3 ${isExpanded ? '' : 'hidden md:block'}`}>
                      <p className="text-xs font-medium text-gray-500 mb-2">📖 Välj recept:</p>
                      <div className="grid gap-2 md:grid-cols-3">
                        {item.recipes.map((recipe, i) => (
                          <a
                            key={i}
                            href={recipe.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block p-3 rounded-lg border transition-colors ${
                              SOURCE_COLORS[recipe.source] || 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-sm shrink-0">
                                {SOURCE_ICONS[recipe.source] || '📄'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm leading-tight line-clamp-2">
                                  {recipe.title}
                                </p>
                                <p className="text-xs mt-1 opacity-60">
                                  {recipe.source}
                                </p>
                              </div>
                              <span className="text-xs opacity-40 shrink-0">↗</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {hasRecipes && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs md:hidden"
                        onClick={() => toggleExpand(item.dayIndex)}
                      >
                        {isExpanded ? '📖 Dölj recept' : `📖 Visa recept (${item.recipes.length})`}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs md:text-sm"
                      onClick={() => openSwapDialog(item)}
                      disabled={isSwapping}
                    >
                      {isSwapping ? '⏳ Byter...' : '🔄 Byt rätt'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Swap dialog */}
      <Dialog open={!!swapItem} onOpenChange={() => setSwapItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Byt rätt</DialogTitle>
            <DialogDescription>
              Berätta vad du tänker så föreslår vi något bättre.
            </DialogDescription>
          </DialogHeader>
          {swapItem && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{swapItem.suggestion.name}</p>
                <p className="text-sm text-gray-500">{swapItem.day}</p>
              </div>
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
                  placeholder="T.ex. 'Något med kyckling', 'Vegetariskt', 'Snabbt'..."
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
            <DialogDescription>Välj en tidigare meny att visa</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {savedMenus.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Inga sparade menyer ännu</p>
            )}
            {savedMenus.map((savedMenu) => (
              <button
                key={savedMenu.id}
                onClick={() => loadSpecificMenu(savedMenu.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  savedMenu.is_active
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{savedMenu.name || 'Meny'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(savedMenu.created_at).toLocaleDateString('sv-SE', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  {savedMenu.is_active && (
                    <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
