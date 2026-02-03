"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SavedRecipe {
  id: string;
  title: string;
  url: string;
  description?: string;
  source?: string;
  image_url?: string;
  saved_at: string;
}

const SOURCE_COLORS: Record<string, string> = {
  'ICA': 'bg-red-600',
  'Tasteline': 'bg-orange-500',
  'Arla': 'bg-blue-600',
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    loadRecipes();
  }, [search]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/recipes${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes || []);
      }
    } catch (e) {
      console.error("Failed to load recipes:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const removeRecipe = async (url: string) => {
    try {
      const res = await fetch("/api/recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        setRecipes(prev => prev.filter(r => r.url !== url));
      }
    } catch (e) {
      console.error("Failed to remove recipe:", e);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Receptsamling</h1>
        <p className="text-gray-600 mt-2">
          Dina sparade favoritrecept
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <Input
          placeholder="Sök recept..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Sök</Button>
        {search && (
          <Button 
            type="button" 
            variant="outline"
            onClick={() => { setSearch(""); setSearchInput(""); }}
          >
            Rensa
          </Button>
        )}
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fresh mx-auto"></div>
          <p className="mt-4 text-gray-600">Laddar recept...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && recipes.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">❤️</div>
          <h2 className="text-xl font-semibold mb-2">
            {search ? "Inga recept hittades" : "Inga sparade recept ännu"}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            {search 
              ? `Hittade inga recept för "${search}"`
              : "Gå till Veckomenyn och klicka på 🤍 på ett recept för att spara det här."}
          </p>
          {!search && (
            <Button asChild className="mt-4">
              <a href="/dashboard/menu">Gå till Veckomenyn</a>
            </Button>
          )}
        </div>
      )}

      {/* Recipe grid */}
      {!loading && recipes.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {recipes.length} recept{search && ` för "${search}"`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onRemove={() => removeRecipe(recipe.url)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RecipeCard({ 
  recipe, 
  onRemove 
}: { 
  recipe: SavedRecipe; 
  onRemove: () => void;
}) {
  const badgeColor = SOURCE_COLORS[recipe.source || ''] || 'bg-gray-600';

  return (
    <div className="relative group max-w-[400px]">
      <a
        href={recipe.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border border-fresh/20 hover:border-fresh hover:shadow-lg transition-all bg-white"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl text-gray-300">
              🍽️
            </div>
          )}
          {/* Source badge */}
          {recipe.source && (
            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-xs font-medium ${badgeColor}`}>
              {recipe.source}
            </div>
          )}
          {/* Remove heart - shows on hover */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 text-2xl drop-shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
            title="Ta bort från samling"
          >
            ❤️
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-fresh transition-colors">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {recipe.description}
            </p>
          )}
        </div>
      </a>
    </div>
  );
}
