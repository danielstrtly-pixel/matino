"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// Edamam-compatible options
const HEALTH_OPTIONS = [
  { label: "Vegetarisk", value: "vegetarian" },
  { label: "Vegansk", value: "vegan" },
  { label: "Glutenfri", value: "gluten-free" },
  { label: "Laktosfri", value: "dairy-free" },
  { label: "Äggfri", value: "egg-free" },
  { label: "Nötfri", value: "tree-nut-free" },
  { label: "Jordnötsfri", value: "peanut-free" },
  { label: "Fiskfri", value: "fish-free" },
  { label: "Skaldjursfri", value: "shellfish-free" },
  { label: "Sojafri", value: "soy-free" },
  { label: "Fläskfri", value: "pork-free" },
];

const DIET_OPTIONS = [
  { label: "Balanserad", value: "balanced", description: "Jämn fördelning protein/fett/kolhydrater" },
  { label: "Proteinrik", value: "high-protein", description: "Mer än 50% kalorier från protein" },
  { label: "Lågkolhydrat", value: "low-carb", description: "Mindre än 20% kalorier från kolhydrater" },
  { label: "Fiberrik", value: "high-fiber", description: "Mer än 5g fiber per portion" },
  { label: "Keto", value: "keto-friendly", description: "Max 7g netto-kolhydrater per portion" },
];

const CUISINE_OPTIONS = [
  { label: "🇸🇪 Nordisk/Svensk", value: "nordic" },
  { label: "🇮🇹 Italiensk", value: "italian" },
  { label: "🌏 Asiatisk", value: "asian" },
  { label: "🇲🇽 Mexikansk", value: "mexican" },
  { label: "🇮🇳 Indisk", value: "indian" },
  { label: "🇬🇷 Grekisk", value: "greek" },
  { label: "🇫🇷 Fransk", value: "french" },
  { label: "🇯🇵 Japansk", value: "japanese" },
  { label: "🇨🇳 Kinesisk", value: "chinese" },
  { label: "🇺🇸 Amerikansk", value: "american" },
];

interface UserFeedback {
  recipe_name: string;
  reason: string | null;
  preference: string | null;
  created_at: string;
}

interface Preferences {
  householdSize: number;
  hasChildren: boolean;
  likes: string[];
  dislikes: string[];
  allergies: string[];
  healthLabels: string[];
  dietLabels: string[];
  cuisineTypes: string[];
  mealsPerWeek: number;
  maxCookTime: number;
  includeLunch: boolean;
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>({
    householdSize: 2,
    hasChildren: false,
    likes: [],
    dislikes: [],
    allergies: [],
    healthLabels: [],
    dietLabels: [],
    cuisineTypes: [],
    mealsPerWeek: 5,
    maxCookTime: 45,
    includeLunch: false,
  });
  const [newLike, setNewLike] = useState("");
  const [newDislike, setNewDislike] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);

  // Load preferences and feedback on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load preferences
        const prefsRes = await fetch("/api/user/preferences");
        if (prefsRes.ok) {
          const data = await prefsRes.json();
          setPreferences(data);
        }
        
        // Load feedback
        const feedbackRes = await fetch("/api/user/feedback");
        if (feedbackRes.ok) {
          const data = await feedbackRes.json();
          setFeedback(data.feedback || []);
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

  const toggleArrayItem = (field: keyof Preferences, value: string) => {
    setPreferences((prev) => {
      const arr = prev[field] as string[];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v) => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const addItem = (list: 'likes' | 'dislikes', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    if ((preferences[list] as string[]).includes(value.trim())) return;
    
    setPreferences((prev) => ({
      ...prev,
      [list]: [...(prev[list] as string[]), value.trim()],
    }));
    setter("");
  };

  const removeItem = (list: 'likes' | 'dislikes', item: string) => {
    setPreferences((prev) => ({
      ...prev,
      [list]: (prev[list] as string[]).filter((i) => i !== item),
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
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

      <div className="grid gap-6 max-w-2xl">
        {/* Household */}
        <Card>
          <CardHeader>
            <CardTitle>👨‍👩‍👧‍👦 Hushållet</CardTitle>
            <CardDescription>Information om vilka som ska äta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Antal personer:</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={preferences.householdSize}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    householdSize: parseInt(e.target.value) || 1,
                  }))
                }
                className="w-20"
              />
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

        {/* Allergies & Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle>⚠️ Kostrestriktioner</CardTitle>
            <CardDescription>Allergier och kost som ska undvikas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {HEALTH_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.value}
                    checked={preferences.healthLabels.includes(option.value)}
                    onCheckedChange={() => toggleArrayItem("healthLabels", option.value)}
                  />
                  <Label htmlFor={option.value} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Diet Goals */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Kostmål</CardTitle>
            <CardDescription>Vilken typ av kost föredrar ni? (valfritt)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {DIET_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start space-x-2">
                  <Checkbox
                    id={option.value}
                    checked={preferences.dietLabels.includes(option.value)}
                    onCheckedChange={() => toggleArrayItem("dietLabels", option.value)}
                  />
                  <div>
                    <Label htmlFor={option.value} className="cursor-pointer font-medium">
                      {option.label}
                    </Label>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cuisine Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>🌍 Matkulturer</CardTitle>
            <CardDescription>Vilka kök gillar ni? (lämna tomt för alla)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map((option) => (
                <Badge
                  key={option.value}
                  variant={preferences.cuisineTypes.includes(option.value) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80 transition-colors"
                  onClick={() => toggleArrayItem("cuisineTypes", option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Likes */}
        <Card>
          <CardHeader>
            <CardTitle>😋 Favoriter</CardTitle>
            <CardDescription>
              Ingredienser och rätter ni gärna vill ha mer av
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
              {preferences.likes.length === 0 && (
                <span className="text-gray-400 text-sm">Inga favoriter ännu</span>
              )}
              {preferences.likes.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-red-100"
                  onClick={() => removeItem("likes", item)}
                >
                  {item} ✕
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="T.ex. 'Pasta', 'Kyckling'..."
                value={newLike}
                onChange={(e) => setNewLike(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem("likes", newLike, setNewLike)}
              />
              <Button onClick={() => addItem("likes", newLike, setNewLike)}>Lägg till</Button>
            </div>
          </CardContent>
        </Card>

        {/* Dislikes */}
        <Card>
          <CardHeader>
            <CardTitle>🙅 Ogillar</CardTitle>
            <CardDescription>
              Ingredienser ni inte vill ha i recepten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
              {preferences.dislikes.length === 0 && (
                <span className="text-gray-400 text-sm">Inga ogillade ingredienser</span>
              )}
              {preferences.dislikes.map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="gap-1 cursor-pointer hover:bg-red-100"
                  onClick={() => removeItem("dislikes", item)}
                >
                  {item} ✕
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="T.ex. 'Koriander', 'Lever'..."
                value={newDislike}
                onChange={(e) => setNewDislike(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem("dislikes", newDislike, setNewDislike)}
              />
              <Button variant="outline" onClick={() => addItem("dislikes", newDislike, setNewDislike)}>
                Lägg till
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Menu Settings */}
        <Card>
          <CardHeader>
            <CardTitle>📅 Menyinställningar</CardTitle>
            <CardDescription>Hur ska din veckomeny se ut?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Antal middagar per vecka:</Label>
                <span className="font-medium">{preferences.mealsPerWeek}</span>
              </div>
              <Slider
                value={[preferences.mealsPerWeek]}
                onValueChange={([value]) =>
                  setPreferences((prev) => ({ ...prev, mealsPerWeek: value }))
                }
                min={3}
                max={7}
                step={1}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>3</span>
                <span>7</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max tillagningstid:</Label>
                <span className="font-medium">{preferences.maxCookTime} min</span>
              </div>
              <Slider
                value={[preferences.maxCookTime]}
                onValueChange={([value]) =>
                  setPreferences((prev) => ({ ...prev, maxCookTime: value }))
                }
                min={15}
                max={90}
                step={5}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>15 min</span>
                <span>90 min</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeLunch"
                checked={preferences.includeLunch}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, includeLunch: !!checked }))
                }
              />
              <Label htmlFor="includeLunch">Inkludera lunchförslag</Label>
            </div>
          </CardContent>
        </Card>

        {/* What we know about you */}
        <Card>
          <CardHeader>
            <CardTitle>🧠 Vad vi vet om dig</CardTitle>
            <CardDescription>
              Denna information används för att skapa personliga menyförslag
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-2 font-mono">
              <p><span className="text-gray-500">Hushåll:</span> {preferences.householdSize} personer{preferences.hasChildren ? ' (med barn)' : ''}</p>
              
              {preferences.healthLabels.length > 0 && (
                <p>
                  <span className="text-gray-500">Kostrestriktioner:</span>{' '}
                  {preferences.healthLabels.map(h => 
                    HEALTH_OPTIONS.find(o => o.value === h)?.label || h
                  ).join(', ')}
                </p>
              )}
              
              {preferences.dietLabels.length > 0 && (
                <p>
                  <span className="text-gray-500">Kostmål:</span>{' '}
                  {preferences.dietLabels.map(d => 
                    DIET_OPTIONS.find(o => o.value === d)?.label || d
                  ).join(', ')}
                </p>
              )}
              
              {preferences.cuisineTypes.length > 0 && (
                <p>
                  <span className="text-gray-500">Matkulturer:</span>{' '}
                  {preferences.cuisineTypes.map(c => 
                    CUISINE_OPTIONS.find(o => o.value === c)?.label?.replace(/^.{2}\s/, '') || c
                  ).join(', ')}
                </p>
              )}
              
              {preferences.likes.length > 0 && (
                <p><span className="text-gray-500">Gillar:</span> {preferences.likes.join(', ')}</p>
              )}
              
              {preferences.dislikes.length > 0 && (
                <p><span className="text-gray-500">Ogillar:</span> {preferences.dislikes.join(', ')}</p>
              )}
              
              <p>
                <span className="text-gray-500">Meny:</span>{' '}
                {preferences.mealsPerWeek} middagar/vecka, max {preferences.maxCookTime} min tillagningstid
                {preferences.includeLunch ? ', inkl. lunch' : ''}
              </p>
            </div>
            
            {feedback.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Din feedback:</p>
                <ul className="space-y-2">
                  {feedback.slice(0, 5).map((fb, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-gray-500">•</span>{' '}
                      <span className="font-medium">{fb.recipe_name}:</span>{' '}
                      {fb.reason && <span className="text-red-600">{fb.reason}</span>}
                      {fb.reason && fb.preference && ' → '}
                      {fb.preference && <span className="text-green-600">{fb.preference}</span>}
                    </li>
                  ))}
                </ul>
                {feedback.length > 5 && (
                  <p className="text-xs text-gray-400 mt-2">
                    +{feedback.length - 5} fler...
                  </p>
                )}
              </div>
            )}
            
            <p className="text-xs text-gray-400 mt-3">
              Dina erbjudanden påverkar också förslagen men visas inte här.
            </p>
          </CardContent>
        </Card>

        {/* Subscription placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>💳 Prenumeration</CardTitle>
            <CardDescription>Hantera din betalning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg mb-4">
              <div>
                <p className="font-medium">Gratis provperiod</p>
                <p className="text-sm text-gray-500">6 dagar kvar</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Efter provperioden: 69 kr/mån. Avsluta när du vill.
            </p>
            <Button variant="outline" disabled>
              Hantera prenumeration (kommer snart)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
