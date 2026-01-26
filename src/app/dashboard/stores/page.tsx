"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STORES = [
  {
    id: "ica",
    name: "ICA",
    logo: "🔴",
    color: "bg-red-50 border-red-200",
    description: "ICA Maxi, ICA Kvantum, ICA Supermarket, ICA Nära",
  },
  {
    id: "coop",
    name: "Coop",
    logo: "🟢",
    color: "bg-green-50 border-green-200",
    description: "Coop, Stora Coop, Coop Extra",
  },
  {
    id: "hemkop",
    name: "Hemköp",
    logo: "🟠",
    color: "bg-orange-50 border-orange-200",
    description: "Hemköp-butiker i hela Sverige",
  },
  {
    id: "lidl",
    name: "Lidl",
    logo: "🔵",
    color: "bg-blue-50 border-blue-200",
    description: "Lidl lågprisbutiker",
  },
];

export default function StoresPage() {
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const toggleStore = (storeId: string) => {
    setSelectedStores((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSave = () => {
    // TODO: Save to Supabase
    alert(`Sparade butiker: ${selectedStores.join(", ")}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Välj dina butiker</h1>
        <p className="text-gray-600 mt-2">
          Välj vilka butiker du brukar handla i. Vi hämtar erbjudanden från dessa.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {STORES.map((store) => (
          <Card
            key={store.id}
            className={`cursor-pointer transition-all ${
              selectedStores.includes(store.id)
                ? `${store.color} border-2`
                : "hover:shadow-md"
            }`}
            onClick={() => toggleStore(store.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">{store.logo}</span>
                <span>{store.name}</span>
                {selectedStores.includes(store.id) && (
                  <span className="ml-auto text-green-600">✓</span>
                )}
              </CardTitle>
              <CardDescription>{store.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          {selectedStores.length} butik(er) valda
        </p>
        <Button onClick={handleSave} disabled={selectedStores.length === 0}>
          Spara val
        </Button>
      </div>
    </div>
  );
}
