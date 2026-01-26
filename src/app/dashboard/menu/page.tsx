"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PLACEHOLDER_MENU = [
  {
    day: "Måndag",
    meal: "Kycklingwok med grönsaker",
    usesDeals: true,
    dealItems: ["Kycklingfilé (ICA)"],
    prepTime: "25 min",
  },
  {
    day: "Tisdag",
    meal: "Köttfärssås med pasta",
    usesDeals: true,
    dealItems: ["Köttfärs (Hemköp)", "Pasta (Lidl)"],
    prepTime: "30 min",
  },
  {
    day: "Onsdag",
    meal: "Ugnsbakad lax med potatis",
    usesDeals: true,
    dealItems: ["Laxfilé (Coop)"],
    prepTime: "35 min",
  },
  {
    day: "Torsdag",
    meal: "Falukorvsstroganoff",
    usesDeals: true,
    dealItems: ["Falukorv (ICA)"],
    prepTime: "20 min",
  },
  {
    day: "Fredag",
    meal: "Tacos",
    usesDeals: false,
    dealItems: [],
    prepTime: "25 min",
  },
];

export default function MenuPage() {
  const [menu, setMenu] = useState(PLACEHOLDER_MENU);
  const [generating, setGenerating] = useState(false);

  const generateMenu = () => {
    setGenerating(true);
    // TODO: Call AI to generate menu
    setTimeout(() => {
      setGenerating(false);
    }, 2000);
  };

  const regenerateMeal = (day: string) => {
    // TODO: Call AI to regenerate specific meal
    alert(`Genererar ny rätt för ${day}...`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Din veckomeny</h1>
          <p className="text-gray-600 mt-2">
            AI-genererad meny baserad på veckans erbjudanden och dina preferenser.
          </p>
        </div>
        <Button onClick={generateMenu} disabled={generating}>
          {generating ? "Genererar..." : "🤖 Generera ny meny"}
        </Button>
      </div>

      {/* Menu options */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Antal middagar:</label>
          <select className="border rounded px-2 py-1">
            <option>5</option>
            <option>6</option>
            <option>7</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Inkludera lunch:</label>
          <input type="checkbox" className="rounded" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Basera på erbjudanden:</label>
          <input type="checkbox" className="rounded" defaultChecked />
        </div>
      </div>

      {/* Menu cards */}
      <div className="space-y-4">
        {menu.map((item) => (
          <Card key={item.day} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-green-600">{item.day}</p>
                  <CardTitle className="text-xl mt-1">{item.meal}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{item.prepTime}</Badge>
                  {item.usesDeals && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      💰 Sparar pengar
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {item.dealItems.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.dealItems.map((deal, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      🏷️ {deal}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => regenerateMeal(item.day)}>
                  🔄 Byt rätt
                </Button>
                <Button variant="ghost" size="sm">
                  📖 Visa recept
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generate shopping list */}
      <div className="mt-8 flex justify-center">
        <Button size="lg" className="gap-2">
          📝 Skapa inköpslista från meny
        </Button>
      </div>
    </div>
  );
}
