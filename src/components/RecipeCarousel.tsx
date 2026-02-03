"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

// Keyframes for text fade-in
const fadeInKeyframes = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

interface Recipe {
  title: string;
  url: string;
  description: string;
  source: string;
  imageUrl?: string;
}

interface RecipeCarouselProps {
  recipes: Recipe[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  'ICA': 'bg-red-600',
  'Tasteline': 'bg-orange-500',
  'Arla': 'bg-blue-600',
};

export function RecipeCarousel({ recipes, selectedIndex, onSelect }: RecipeCarouselProps) {
  // Start with middle card by default
  const middleIndex = Math.floor(recipes.length / 2);
  const initialIndex = selectedIndex !== undefined ? selectedIndex : middleIndex;
  
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    startIndex: initialIndex,
    align: "center",
    containScroll: false,
  });
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelectHandler = () => {
      const index = emblaApi.selectedScrollSnap();
      setCurrentIndex(index);
      onSelect?.(index);
    };
    
    emblaApi.on("select", onSelectHandler);
    return () => {
      emblaApi.off("select", onSelectHandler);
    };
  }, [emblaApi, onSelect]);

  if (recipes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Inga recept hittades
      </div>
    );
  }

  // Single recipe - no carousel needed
  if (recipes.length === 1) {
    return (
      <div className="flex justify-center">
        <div style={{ width: "80%", maxWidth: "400px" }}>
          <RecipeCard recipe={recipes[0]} isActive size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <style>{fadeInKeyframes}</style>
      {/* Carousel viewport - fixed height to prevent jumping */}
      <div className="overflow-hidden h-[400px]" ref={emblaRef}>
        <div className="flex items-end h-full">
          {recipes.map((recipe, index) => {
            const isActive = index === currentIndex;
            return (
              <div
                key={index}
                className="flex-shrink-0 px-2 transition-all duration-700 ease-out"
                style={{
                  width: isActive ? "50%" : "35%",
                  minWidth: isActive ? "280px" : "200px",
                  maxWidth: isActive ? "400px" : "280px",
                }}
              >
                <RecipeCard 
                  recipe={recipe} 
                  isActive={isActive}
                  size={isActive ? "large" : "small"}
                  onClickInactive={() => emblaApi?.scrollTo(index)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors z-10"
        aria-label="Föregående"
      >
        ‹
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors z-10"
        aria-label="Nästa"
      >
        ›
      </button>

      {/* Selected indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {recipes.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? "bg-fresh w-4" 
                : "bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Välj recept ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function RecipeCard({ 
  recipe, 
  isActive,
  size,
  onClickInactive,
}: { 
  recipe: Recipe; 
  isActive: boolean;
  size: "large" | "small";
  onClickInactive?: () => void;
}) {
  const badgeColor = SOURCE_COLORS[recipe.source] || 'bg-gray-600';

  const handleClick = (e: React.MouseEvent) => {
    if (!isActive && onClickInactive) {
      e.preventDefault();
      onClickInactive();
    }
    // If active, let the link work normally
  };
  
  return (
    <a
      href={recipe.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`block rounded-xl overflow-hidden border transition-all duration-700 ease-out bg-white ${
        isActive 
          ? "border-fresh shadow-lg scale-100 opacity-100" 
          : "border-gray-200 shadow scale-95 opacity-70 hover:opacity-85 cursor-pointer"
      }`}
    >
      {/* Image */}
      <div className={`relative bg-gray-100 overflow-hidden ${
        size === "large" ? "aspect-[4/3]" : "aspect-square"
      }`}>
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl text-gray-300">
            🍽️
          </div>
        )}
        {/* Source badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-xs font-medium ${badgeColor}`}>
          {recipe.source}
        </div>
        {/* Selected checkmark */}
        {isActive && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-fresh rounded-full flex items-center justify-center text-white text-sm">
            ✓
          </div>
        )}
      </div>

      {/* Content - fade in after card animation completes, hidden on inactive */}
      {isActive && (
        <div 
          className="p-3 animate-fade-in"
          style={{ animation: "fadeIn 500ms ease-out 700ms both" }}
        >
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {recipe.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {recipe.description}
          </p>
        </div>
      )}
    </a>
  );
}
