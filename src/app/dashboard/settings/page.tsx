"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Preferences {
  householdSize: number;
  likes: string[];
  dislikes: string[];
  allergies: string[];
}

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<Preferences>({
    householdSize: 2,
    likes: [],
    dislikes: [],
    allergies: [],
  });
  const [newLike, setNewLike] = useState("");
  const [newDislike, setNewDislike] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await fetch("/api/user/preferences");
        if (res.ok) {
          const data = await res.json();
          setPreferences(data);
        }
      } catch (e) {
        console.error("Failed to load preferences:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
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

  const addItem = (list: keyof Pick<Preferences, 'likes' | 'dislikes' | 'allergies'>, value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    if (preferences[list].includes(value.trim())) return;
    
    setPreferences((prev) => ({
      ...prev,
      [list]: [...prev[list], value.trim()],
    }));
    setter("");
  };

  const removeItem = (list: keyof Pick<Preferences, 'likes' | 'dislikes' | 'allergies'>, item: string) => {
    setPreferences((prev) => ({
      ...prev,
      [list]: prev[list].filter((i) => i !== item),
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
            Anpassa Matino efter dina preferenser.
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
            <CardTitle>👨‍👩‍👧‍👦 Hushåll</CardTitle>
            <CardDescription>Hur många är ni i hushållet?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
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
              <span className="text-gray-500">personer</span>
            </div>
          </CardContent>
        </Card>

        {/* Likes */}
        <Card>
          <CardHeader>
            <CardTitle>😋 Vad gillar ni?</CardTitle>
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
            <CardTitle>🙅 Vad gillar ni inte?</CardTitle>
            <CardDescription>
              Ingredienser ni vill undvika
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
                placeholder="T.ex. 'Lever', 'Svamp'..."
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

        {/* Allergies */}
        <Card>
          <CardHeader>
            <CardTitle>⚠️ Allergier</CardTitle>
            <CardDescription>
              Allergier och intoleranser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
              {preferences.allergies.length === 0 && (
                <span className="text-gray-400 text-sm">Inga allergier angivna</span>
              )}
              {preferences.allergies.map((item) => (
                <Badge
                  key={item}
                  variant="destructive"
                  className="gap-1 cursor-pointer hover:opacity-80"
                  onClick={() => removeItem("allergies", item)}
                >
                  {item} ✕
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="T.ex. 'Gluten', 'Nötter', 'Laktos'..."
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem("allergies", newAllergy, setNewAllergy)}
              />
              <Button variant="destructive" onClick={() => addItem("allergies", newAllergy, setNewAllergy)}>
                Lägg till
              </Button>
            </div>
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
