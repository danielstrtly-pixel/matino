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
} from "@/components/ui/dialog";

interface MenuItem {
  day: string;
  dayIndex: number;
  meal: 'lunch' | 'dinner';
  recipe: {
    id: number;
    name: string;
    nameSwedish?: string;
    image: string;
    sourceName: string;
    sourceUrl: string;
    servings: number;
    readyInMinutes: number;
    ingredients: string[];
    ingredientsSwedish?: string[];
    instructions: string[];
    instructionsSwedish?: string[];
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    dairyFree: boolean;
    cuisines: string[];
    summary?: string;
    nutrition?: {
      calories: number | null;
      protein: number | null;
      fat: number | null;
      carbs: number | null;
    };
  };
  matchedOffers: {
    offerId: string;
    offerName: string;
    price: number;
    store: string;
  }[];
  estimatedSavings?: number;
}

interface GeneratedMenu {
  items: MenuItem[];
  totalEstimatedSavings: number;
  generatedAt: string;
}

export default function MenuPage() {
  const [menu, setMenu] = useState<GeneratedMenu | null>(null);
  const [generating, setGenerating] = useState(false);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<MenuItem | null>(null);

  // Load menu from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('smartamenyn_menu');
    if (saved) {
      try {
        setMenu(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved menu:', e);
      }
    }
  }, []);

  // Save menu to localStorage when it changes
  useEffect(() => {
    if (menu) {
      localStorage.setItem('smartamenyn_menu', JSON.stringify(menu));
    }
  }, [menu]);

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

  const swapMeal = async (item: MenuItem) => {
    const key = `${item.dayIndex}-${item.meal}`;
    setSwapping(key);
    
    try {
      const res = await fetch('/api/ai/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap',
          currentMenu: menu,
          dayIndex: item.dayIndex,
          meal: item.meal,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to swap meal');
      }

      const data = await res.json();
      
      // Replace the meal in the menu
      setMenu(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(m => 
            m.dayIndex === item.dayIndex && m.meal === item.meal
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

  // Group menu items by day
  const menuByDay = menu?.items.reduce((acc, item) => {
    if (!acc[item.day]) acc[item.day] = [];
    acc[item.day].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>) || {};

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Din veckomeny</h1>
          <p className="text-gray-600 mt-2">
            Recept baserade på veckans erbjudanden och dina preferenser.
          </p>
          {menu && (
            <p className="text-sm text-gray-500 mt-1">
              Genererad: {new Date(menu.generatedAt).toLocaleString('sv-SE')}
            </p>
          )}
        </div>
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
            <>🤖 {menu ? 'Generera ny meny' : 'Skapa veckomeny'}</>
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Savings summary */}
      {menu && menu.totalEstimatedSavings > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-semibold text-green-800">
                Uppskattad besparing: ~{menu.totalEstimatedSavings} kr
              </p>
              <p className="text-sm text-green-600">
                Genom att använda veckans erbjudanden i recepten
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {generating && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Skeleton className="h-24 w-24 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!generating && !menu && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-semibold mb-2">Ingen meny genererad ännu</h2>
            <p className="text-gray-500 mb-6">
              Klicka på knappen ovan för att skapa en veckomeny baserad på dina 
              preferenser och veckans erbjudanden.
            </p>
            <Button onClick={generateMenu} disabled={generating}>
              🤖 Skapa veckomeny
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Menu cards */}
      {!generating && menu && (
        <div className="space-y-4">
          {Object.entries(menuByDay).map(([day, items]) => (
            <div key={day}>
              <h2 className="text-lg font-semibold text-green-700 mb-2">{day}</h2>
              {items.map((item) => {
                const isSwapping = swapping === `${item.dayIndex}-${item.meal}`;
                return (
                  <Card 
                    key={`${item.dayIndex}-${item.meal}`} 
                    className="mb-3 hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {item.meal === 'lunch' && (
                            <Badge variant="outline" className="mb-1">Lunch</Badge>
                          )}
                          <CardTitle className="text-xl">
                            {item.recipe.nameSwedish || item.recipe.name}
                          </CardTitle>
                          {item.recipe.nameSwedish && item.recipe.nameSwedish !== item.recipe.name && (
                            <p className="text-sm text-gray-500 italic">{item.recipe.name}</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {item.recipe.readyInMinutes && (
                            <Badge variant="outline">⏱️ {item.recipe.readyInMinutes} min</Badge>
                          )}
                          <Badge variant="outline">🍽️ {item.recipe.servings} port</Badge>
                          {item.recipe.nutrition?.calories && (
                            <Badge variant="outline">🔥 {item.recipe.nutrition.calories} kcal</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        {/* Recipe image */}
                        {item.recipe.image && (
                          <div className="flex-shrink-0">
                            <img
                              src={item.recipe.image}
                              alt={item.recipe.name}
                              className="w-32 h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          {/* Matched offers */}
                          {item.matchedOffers.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm text-gray-600 mb-1">🏷️ Matchar erbjudanden:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.matchedOffers.map((offer, i) => (
                                  <Badge key={i} className="bg-green-100 text-green-800 hover:bg-green-100">
                                    {offer.offerName} ({offer.store})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Cuisine & diet info */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.recipe.cuisines?.[0] && (
                              <Badge variant="secondary">{item.recipe.cuisines[0]}</Badge>
                            )}
                            {item.recipe.vegetarian && (
                              <Badge variant="secondary">Vegetarisk</Badge>
                            )}
                            {item.recipe.glutenFree && (
                              <Badge variant="secondary">Glutenfri</Badge>
                            )}
                            {item.recipe.dairyFree && (
                              <Badge variant="secondary">Laktosfri</Badge>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => swapMeal(item)}
                              disabled={isSwapping}
                            >
                              {isSwapping ? '⏳ Byter...' : '🔄 Byt rätt'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedRecipe(item)}
                            >
                              📖 Visa recept
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              asChild
                            >
                              <a href={item.recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                                🔗 Källa
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Generate shopping list */}
      {menu && menu.items.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button size="lg" className="gap-2" disabled>
            📝 Skapa inköpslista (kommer snart)
          </Button>
        </div>
      )}

      {/* Recipe detail dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedRecipe.recipe.nameSwedish || selectedRecipe.recipe.name}
                </DialogTitle>
                <DialogDescription>
                  Från: {selectedRecipe.recipe.sourceName}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedRecipe.recipe.image && (
                  <img
                    src={selectedRecipe.recipe.image}
                    alt={selectedRecipe.recipe.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
                
                <div className="flex gap-2 flex-wrap">
                  {selectedRecipe.recipe.readyInMinutes && (
                    <Badge>⏱️ {selectedRecipe.recipe.readyInMinutes} min</Badge>
                  )}
                  <Badge>🍽️ {selectedRecipe.recipe.servings} portioner</Badge>
                  {selectedRecipe.recipe.vegetarian && <Badge variant="secondary">Vegetarisk</Badge>}
                  {selectedRecipe.recipe.glutenFree && <Badge variant="secondary">Glutenfri</Badge>}
                </div>

                {/* Nutrition info */}
                {selectedRecipe.recipe.nutrition && (
                  <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{selectedRecipe.recipe.nutrition.calories || '-'}</p>
                      <p className="text-xs text-gray-500">kcal</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{selectedRecipe.recipe.nutrition.protein || '-'}g</p>
                      <p className="text-xs text-gray-500">protein</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{selectedRecipe.recipe.nutrition.carbs || '-'}g</p>
                      <p className="text-xs text-gray-500">kolhydrater</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{selectedRecipe.recipe.nutrition.fat || '-'}g</p>
                      <p className="text-xs text-gray-500">fett</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Ingredienser</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {(selectedRecipe.recipe.ingredientsSwedish || selectedRecipe.recipe.ingredients).map((ing, i) => (
                      <li key={i} className="text-sm">{ing}</li>
                    ))}
                  </ul>
                </div>

                {(selectedRecipe.recipe.instructionsSwedish || selectedRecipe.recipe.instructions)?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Instruktioner</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      {(selectedRecipe.recipe.instructionsSwedish || selectedRecipe.recipe.instructions).map((step, i) => (
                        <li key={i} className="text-sm">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button asChild variant="outline">
                    <a href={selectedRecipe.recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                      🔗 Originalrecept på {selectedRecipe.recipe.sourceName}
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
