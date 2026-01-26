"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const PLACEHOLDER_ITEMS = [
  { id: 1, name: "Kycklingfilé", quantity: "1 kg", store: "ICA", isDeal: true, checked: false },
  { id: 2, name: "Köttfärs", quantity: "500 g", store: "Hemköp", isDeal: true, checked: false },
  { id: 3, name: "Laxfilé", quantity: "400 g", store: "Coop", isDeal: true, checked: false },
  { id: 4, name: "Pasta Penne", quantity: "2 st", store: "Lidl", isDeal: true, checked: false },
  { id: 5, name: "Falukorv", quantity: "2 st", store: "ICA", isDeal: true, checked: false },
  { id: 6, name: "Ris", quantity: "1 påse", store: null, isDeal: false, checked: false },
  { id: 7, name: "Lök", quantity: "3 st", store: null, isDeal: false, checked: false },
  { id: 8, name: "Vitlök", quantity: "1 st", store: null, isDeal: false, checked: false },
  { id: 9, name: "Grädde", quantity: "2 dl", store: null, isDeal: false, checked: false },
  { id: 10, name: "Tacokrydda", quantity: "1 påse", store: null, isDeal: false, checked: false },
];

export default function ShoppingListPage() {
  const [items, setItems] = useState(PLACEHOLDER_ITEMS);
  const [newItem, setNewItem] = useState("");

  const toggleItem = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newItem,
        quantity: "",
        store: null,
        isDeal: false,
        checked: false,
      },
    ]);
    setNewItem("");
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Group items by store
  const groupedItems = items.reduce((acc, item) => {
    const store = item.store || "Övrigt";
    if (!acc[store]) acc[store] = [];
    acc[store].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inköpslista</h1>
        <p className="text-gray-600 mt-2">
          {checkedCount} av {items.length} varor avprickade
        </p>
      </div>

      {/* Add item */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Lägg till vara..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <Button onClick={addItem}>Lägg till</Button>
      </div>

      {/* Items grouped by store */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([store, storeItems]) => (
          <Card key={store}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                {store === "ICA" && "🔴"}
                {store === "Coop" && "🟢"}
                {store === "Hemköp" && "🟠"}
                {store === "Lidl" && "🔵"}
                {store === "Övrigt" && "📦"}
                {store}
                <Badge variant="secondary">{storeItems.length} varor</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {storeItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 ${
                      item.checked ? "opacity-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.id)}
                      className="w-5 h-5 rounded"
                    />
                    <span
                      className={`flex-1 ${
                        item.checked ? "line-through text-gray-400" : ""
                      }`}
                    >
                      {item.name}
                      {item.quantity && (
                        <span className="text-gray-400 ml-2">({item.quantity})</span>
                      )}
                    </span>
                    {item.isDeal && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                        🏷️ Erbjudande
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-4 justify-center">
        <Button variant="outline">📤 Dela lista</Button>
        <Button variant="outline" onClick={() => setItems(items.map(i => ({ ...i, checked: false })))}>
          🔄 Återställ alla
        </Button>
      </div>
    </div>
  );
}
