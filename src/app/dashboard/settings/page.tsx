"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [preferences, setPreferences] = useState({
    householdSize: 4,
    likes: ["Kyckling", "Pasta", "Fisk"],
    dislikes: ["Lever", "Svamp"],
    allergies: [] as string[],
  });
  const [newLike, setNewLike] = useState("");
  const [newDislike, setNewDislike] = useState("");

  const addLike = () => {
    if (!newLike.trim()) return;
    setPreferences((prev) => ({
      ...prev,
      likes: [...prev.likes, newLike],
    }));
    setNewLike("");
  };

  const addDislike = () => {
    if (!newDislike.trim()) return;
    setPreferences((prev) => ({
      ...prev,
      dislikes: [...prev.dislikes, newDislike],
    }));
    setNewDislike("");
  };

  const removeLike = (item: string) => {
    setPreferences((prev) => ({
      ...prev,
      likes: prev.likes.filter((l) => l !== item),
    }));
  };

  const removeDislike = (item: string) => {
    setPreferences((prev) => ({
      ...prev,
      dislikes: prev.dislikes.filter((d) => d !== item),
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inställningar</h1>
        <p className="text-gray-600 mt-2">
          Anpassa Matino efter dina preferenser.
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Household */}
        <Card>
          <CardHeader>
            <CardTitle>Hushåll</CardTitle>
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
            <CardTitle>Vad gillar ni? 😋</CardTitle>
            <CardDescription>
              Ingredienser och rätter ni gärna vill ha mer av
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {preferences.likes.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-red-100"
                  onClick={() => removeLike(item)}
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
                onKeyDown={(e) => e.key === "Enter" && addLike()}
              />
              <Button onClick={addLike}>Lägg till</Button>
            </div>
          </CardContent>
        </Card>

        {/* Dislikes */}
        <Card>
          <CardHeader>
            <CardTitle>Vad gillar ni inte? 🙅</CardTitle>
            <CardDescription>
              Ingredienser ni vill undvika
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {preferences.dislikes.map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="gap-1 cursor-pointer hover:bg-red-100"
                  onClick={() => removeDislike(item)}
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
                onKeyDown={(e) => e.key === "Enter" && addDislike()}
              />
              <Button variant="outline" onClick={addDislike}>Lägg till</Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle>Prenumeration</CardTitle>
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
            <Button variant="outline">Hantera prenumeration</Button>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardHeader>
            <CardTitle>Konto</CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/auth/signout" method="post">
              <Button variant="outline" type="submit">
                Logga ut
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
