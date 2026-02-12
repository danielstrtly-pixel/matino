import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMenuFromDb, type MenuDb } from "@/lib/menu-utils";
import { checkOnboardingStatus } from "@/lib/onboarding";
import MenuClient from "./MenuClient";

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { needsOnboarding } = await checkOnboardingStatus(user.id);

  if (needsOnboarding) {
    redirect("/dashboard/welcome");
  }

  const userId = user.id;

  // Parallel fetch: active menu + saved recipe URLs
  const [{ data: menuData }, { data: recipesData }] = await Promise.all([
    supabase
      .from("menus")
      .select("*, menu_items(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("saved_recipes")
      .select("url")
      .eq("user_id", userId),
  ]);

  // Cast needed: formatMenuFromDb returns generic types, MenuClient expects specific interfaces
  const initialMenu = menuData ? formatMenuFromDb(menuData as MenuDb) as Parameters<typeof MenuClient>[0]['initialMenu'] : null;
  const initialSavedRecipeUrls = (recipesData || []).map((r: { url: string }) => r.url);

  return (
    <MenuClient 
      initialMenu={initialMenu} 
      initialSavedRecipeUrls={initialSavedRecipeUrls} 
    />
  );
}
