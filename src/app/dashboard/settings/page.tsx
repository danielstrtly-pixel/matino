"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SubscriptionCard } from "@/components/SubscriptionCard";

// Simplified dietary restrictions
const DIETARY_OPTIONS = [
  { label: "Vegetarisk", value: "vegetarian", emoji: "🥬" },
  { label: "Vegansk", value: "vegan", emoji: "🌱" },
  { label: "Glutenfri", value: "gluten-free", emoji: "🌾" },
  { label: "Laktosfri", value: "dairy-free", emoji: "🥛" },
  { label: "Nötfri", value: "tree-nut-free", emoji: "🥜" },
  { label: "Fiskfri", value: "fish-free", emoji: "🐟" },
];

interface Preferences {
  householdSize: number;
  hasChildren: boolean;
  likes: string[];
  dislikes: string[];
  healthLabels: string[];
  maxCookTime: number;
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>({
    householdSize: 2,
    hasChildren: false,
    likes: [],
    dislikes: [],
    healthLabels: [],
    maxCookTime: 45,
  });
  const [newLike, setNewLike] = useState("");
  const [newDislike, setNewDislike] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const prefsRes = await fetch("/api/user/preferences");
        if (prefsRes.ok) {
          const data = await prefsRes.json();
          setPreferences({
            householdSize: data.householdSize || 2,
            hasChildren: data.hasChildren || false,
            likes: data.likes || [],
            dislikes: data.dislikes || [],
            healthLabels: data.healthLabels || [],
            maxCookTime: data.maxCookTime || 45,
          });
        }
      } catch (e) {
        console.error("Failed to load data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Save preferences
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const res = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        setSaveMessage("✅ Sparat!");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage("❌ Kunde inte spara");
      }
    } catch (e) {
      console.error("Failed to save preferences:", e);
      setSaveMessage("❌ Något gick fel");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleHealthLabel = (value: string) => {
    setPreferences((prev) => {
      if (prev.healthLabels.includes(value)) {
        return { ...prev, healthLabels: prev.healthLabels.filter((v) => v !== value) };
      }
      return { ...prev, healthLabels: [...prev.healthLabels, value] };
    });
  };

  const addItem = (list: 'likes' | 'dislikes', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    if (preferences[list].includes(value.trim())) return;
    
    setPreferences((prev) => ({
      ...prev,
      [list]: [...prev[list], value.trim()],
    }));
    setter("");
  };

  const removeItem = (list: 'likes' | 'dislikes', item: string) => {
    setPreferences((prev) => ({
      ...prev,
      [list]: prev[list].filter((i) => i !== item),
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-2xl mb-2">🔄</div>
          <p className="text-gray-500">Laddar inställningar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Inställningar</h1>
          <p className="text-gray-600 mt-2">
            Anpassa menyn efter ditt hushåll och era preferenser.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && <span className="text-sm">{saveMessage}</span>}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Sparar..." : "Spara ändringar"}
          </Button>
        </div>
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Left column - Mat-preferenser */}
        <div className="space-y-6">
          
          {/* Household */}
          <Card>
            <CardHeader>
              <CardTitle>👨‍👩‍👧‍👦 Hushållet</CardTitle>
              <CardDescription>Hur många ska äta?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>Antal personer:</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPreferences(p => ({ ...p, householdSize: Math.max(1, p.householdSize - 1) }))}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-bold text-lg">{preferences.householdSize}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPreferences(p => ({ ...p, householdSize: Math.min(10, p.householdSize + 1) }))}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasChildren"
                  checked={preferences.hasChildren}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, hasChildren: !!checked }))
                  }
                />
                <Label htmlFor="hasChildren">Finns barn i hushållet (påverkar receptval)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Dietary restrictions - simplified */}
          <Card>
            <CardHeader>
              <CardTitle>⚠️ Kostrestriktioner</CardTitle>
              <CardDescription>Allergier och kost som ska undvikas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {DIETARY_OPTIONS.map((option) => (
                  <div 
                    key={option.value} 
                    className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                      preferences.healthLabels.includes(option.value)
                        ? 'bg-orange-100 border-2 border-orange-400'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                    onClick={() => toggleHealthLabel(option.value)}
                  >
                    <span className="text-xl">{option.emoji}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cooking time */}
          <Card>
            <CardHeader>
              <CardTitle>⏱️ Tillagningstid</CardTitle>
              <CardDescription>Hur lång tid har du att laga mat?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Max:</span>
                <span className="font-bold text-lg">{preferences.maxCookTime} minuter</span>
              </div>
              <Slider
                value={[preferences.maxCookTime]}
                onValueChange={([value]) =>
                  setPreferences((prev) => ({ ...prev, maxCookTime: value }))
                }
                min={15}
                max={90}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>15 min (snabbt)</span>
                <span>90 min (lugnt)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Preferenser & Prenumeration */}
        <div className="space-y-6">

          {/* Likes */}
          <Card>
            <CardHeader>
              <CardTitle>😋 Favoriter</CardTitle>
              <CardDescription>
                Ingredienser, rätter eller matkulturer ni gillar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                {preferences.likes.length === 0 && (
                  <span className="text-gray-400 text-sm">T.ex. "pasta", "asiatiskt", "kyckling"...</span>
                )}
                {preferences.likes.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-red-100 py-1.5 px-3"
                    onClick={() => removeItem("likes", item)}
                  >
                    {item} ✕
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Lägg till..."
                  value={newLike}
                  onChange={(e) => setNewLike(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem("likes", newLike, setNewLike)}
                />
                <Button onClick={() => addItem("likes", newLike, setNewLike)}>+</Button>
              </div>
            </CardContent>
          </Card>

          {/* Dislikes */}
          <Card>
            <CardHeader>
              <CardTitle>🙅 Vill undvika</CardTitle>
              <CardDescription>
                Ingredienser ni inte vill ha i recepten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                {preferences.dislikes.length === 0 && (
                  <span className="text-gray-400 text-sm">T.ex. "koriander", "lever", "svamp"...</span>
                )}
                {preferences.dislikes.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="gap-1 cursor-pointer hover:bg-red-100 py-1.5 px-3"
                    onClick={() => removeItem("dislikes", item)}
                  >
                    {item} ✕
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Lägg till..."
                  value={newDislike}
                  onChange={(e) => setNewDislike(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem("dislikes", newDislike, setNewDislike)}
                />
                <Button variant="outline" onClick={() => addItem("dislikes", newDislike, setNewDislike)}>+</Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <SubscriptionCard />

        </div>
      </div>
    </div>
  );
}
