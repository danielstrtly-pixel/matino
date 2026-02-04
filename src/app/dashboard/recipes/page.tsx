import { createClient } from "@/lib/supabase/server";
import RecipesClient from "./RecipesClient";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: recipesData } = await supabase
    .from("saved_recipes")
    .select("id, title, url, description, source, image_url, saved_at")
    .eq("user_id", user?.id || "")
    .order("saved_at", { ascending: false });

  const recipes = (recipesData || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    description: r.description,
    source: r.source,
    imageUrl: r.image_url,
    savedAt: r.saved_at,
  }));

  return <RecipesClient initialRecipes={recipes} />;
}
