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

interface AIRecipe {
  name: string;
  description: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: string;
  ingredients: {
    amount: string;
    unit: string;
    item: string;
    isOffer?: boolean;
  }[];
  instructions: string[];
  tips?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  tags: string[];
}

interface AIMenuItem {
  day: string;
  dayIndex: number;
  meal: 'lunch' | 'dinner';
  recipe: AIRecipe;
  matchedOffers: {
    offerId: string;
    offerName: string;
    price: number;
    store: string;
  }[];
}

interface AIGeneratedMenu {
  id?: string;
  name?: string;
  items: AIMenuItem[];
  generatedAt: string;
  model?: string;
}

interface SavedMenu {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
}

export default function MenuPage() {
  const [menu, setMenu] = useState<AIGeneratedMenu | null>(null);
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<AIMenuItem | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [swapItem, setSwapItem] = useState<AIMenuItem | null>(null);
  const [swapReason, setSwapReason] = useState('');
  const [swapPreference, setSwapPreference] = useState('');

  // Load saved menu on mount
  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await fetch('/api/ai/menu');
        if (res.ok) {
          const data = await res.json();
          if (data.menu) {
            setMenu(data.menu);
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

  // Load menu history
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
        body: JSON.stringify({ action: 'generate' }),
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

  // Open swap dialog
  const openSwapDialog = (item: AIMenuItem) => {
    setSwapItem(item);
    setSwapReason('');
    setSwapPreference('');
  };

  // Execute swap with feedback
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
          feedback: {
            recipeName: swapItem.recipe.name,
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

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Din veckomeny</h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
            Recept skapade utifrån dina preferenser och veckans erbjudanden.
          </p>
          {menu?.name && (
            <p className="text-xs md:text-sm text-green-600 mt-1">
              📅 {menu.name} • Skapad {new Date(menu.generatedAt).toLocaleDateString('sv-SE')}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline"
            onClick={() => {
              loadHistory();
              setShowHistory(true);
            }}
          >
            📋 Tidigare menyer
          </Button>
          <Button 
            onClick={generateMenu} 
            disabled={generating}
            size="lg"
          >
            {generating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Genererar...
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
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold mb-2">Ingen AI-meny genererad ännu</h2>
            <p className="text-gray-500 mb-6">
              Klicka på knappen för att låta AI skapa en veckomeny åt dig.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Menu cards */}
      {!generating && !loading && menu && (
        <div className="space-y-4">
          {menu.items.map((item) => {
            const isSwapping = swapping === `${item.dayIndex}-${item.meal}`;
            return (
              <Card 
                key={`${item.dayIndex}-${item.meal}`} 
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-600">{item.day}</p>
                      <CardTitle className="text-lg md:text-xl mt-1">{item.recipe.name}</CardTitle>
                      <p className="text-xs md:text-sm text-gray-500 mt-1 line-clamp-2 md:line-clamp-none">{item.recipe.description}</p>
                    </div>
                    <div className="flex gap-1 md:gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">⏱️ {item.recipe.totalTime} min</Badge>
                      <Badge variant="outline" className="text-xs">🍽️ {item.recipe.servings} port</Badge>
                      <Badge variant="outline" className="text-xs hidden md:inline-flex">🔥 {item.recipe.nutrition.calories} kcal</Badge>
                      <Badge variant="secondary" className="text-xs">{item.recipe.difficulty}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Matched offers */}
                  {item.matchedOffers.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {item.matchedOffers.map((offer, i) => {
                          // Shorten store name for mobile
                          const shortStore = offer.store
                            .replace('Supermarket ', '')
                            .replace('ICA ', 'ICA ')
                            .replace(', Sthlm', '')
                            .replace('Östermalmstorg', 'Östermalm');
                          return (
                            <Badge key={i} className="bg-green-100 text-green-800 text-xs">
                              <span className="hidden md:inline">🏷️ {offer.offerName} ({offer.store})</span>
                              <span className="md:hidden">🏷️ {offer.offerName} ({shortStore})</span>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.recipe.tags?.slice(0, 4).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs md:text-sm"
                      onClick={() => openSwapDialog(item)}
                      disabled={isSwapping}
                    >
                      {isSwapping ? '⏳ Byter...' : '🔄 Byt rätt'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-xs md:text-sm"
                      onClick={() => setSelectedRecipe(item)}
                    >
                      📖 Visa recept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recipe detail dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRecipe.recipe.name}</DialogTitle>
                <DialogDescription>{selectedRecipe.recipe.description}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Meta info */}
                <div className="flex gap-2 flex-wrap">
                  <Badge>⏱️ {selectedRecipe.recipe.totalTime} min</Badge>
                  <Badge>🍽️ {selectedRecipe.recipe.servings} portioner</Badge>
                  <Badge variant="secondary">{selectedRecipe.recipe.difficulty}</Badge>
                </div>

                {/* Nutrition */}
                <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{selectedRecipe.recipe.nutrition.calories}</p>
                    <p className="text-xs text-gray-500">kcal</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{selectedRecipe.recipe.nutrition.protein}g</p>
                    <p className="text-xs text-gray-500">protein</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{selectedRecipe.recipe.nutrition.carbs}g</p>
                    <p className="text-xs text-gray-500">kolhydrater</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{selectedRecipe.recipe.nutrition.fat}g</p>
                    <p className="text-xs text-gray-500">fett</p>
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <h3 className="font-semibold mb-2">Ingredienser</h3>
                  <ul className="space-y-1">
                    {selectedRecipe.recipe.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <span className={ing.isOffer ? 'text-green-600 font-medium' : ''}>
                          {ing.amount} {ing.unit} {ing.item}
                        </span>
                        {ing.isOffer && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Erbjudande</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="font-semibold mb-2">Instruktioner</h3>
                  <ol className="list-decimal list-inside space-y-2">
                    {selectedRecipe.recipe.instructions.map((step, i) => (
                      <li key={i} className="text-sm">{step}</li>
                    ))}
                  </ol>
                </div>

                {/* Tips */}
                {selectedRecipe.recipe.tips && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm">
                      <strong>💡 Tips:</strong> {selectedRecipe.recipe.tips}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Swap feedback dialog */}
      <Dialog open={!!swapItem} onOpenChange={() => setSwapItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Byt rätt</DialogTitle>
            <DialogDescription>
              Hjälp oss förbättra dina menyförslag genom att berätta vad du tänker.
            </DialogDescription>
          </DialogHeader>
          
          {swapItem && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{swapItem.recipe.name}</p>
                <p className="text-sm text-gray-500">{swapItem.day}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Vad gillar du inte med denna rätt? (valfritt)</Label>
                <Textarea
                  id="reason"
                  placeholder="T.ex. 'För kryddigt', 'Gillar inte fisk', 'Tar för lång tid'..."
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preference">Vad skulle du föredra istället? (valfritt)</Label>
                <Textarea
                  id="preference"
                  placeholder="T.ex. 'Något med kyckling', 'En vegetarisk rätt', 'Något snabbt'..."
                  value={swapPreference}
                  onChange={(e) => setSwapPreference(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSwapItem(null)}>
              Avbryt
            </Button>
            <Button onClick={executeSwap}>
              🔄 Byt rätt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu history dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tidigare menyer</DialogTitle>
            <DialogDescription>Välj en tidigare meny att visa</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {savedMenus.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Inga sparade menyer ännu
              </p>
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
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
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
