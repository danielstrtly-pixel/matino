import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's selected stores
  const { data: userStores } = await supabase
    .from("user_stores")
    .select(`
      store_id,
      stores (name, chain_id, profile)
    `)
    .eq("user_id", user?.id || "");

  const storeCount = userStores?.length || 0;
  const storeIds = userStores?.map((us: any) => us.store_id) || [];

  // Get offer count from selected stores
  let offerCount = 0;
  if (storeIds.length > 0) {
    const { count } = await supabase
      .from("offers")
      .select("*", { count: "exact", head: true })
      .in("store_id", storeIds);
    offerCount = count || 0;
  }

  // Check if user has stores selected
  const hasStores = storeCount > 0;
  const hasOffers = offerCount > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Välkommen till SmartaMenyn! 👋</h1>
        <p className="text-gray-600 mt-2">
          {user?.email}
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className={hasStores ? "border-green-200 bg-green-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              🏪 Butiker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{storeCount}</div>
            <p className="text-sm text-gray-500">valda butiker</p>
          </CardContent>
        </Card>

        <Card className={hasOffers ? "border-green-200 bg-green-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              🏷️ Erbjudanden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{offerCount}</div>
            <p className="text-sm text-gray-500">aktiva deals</p>
          </CardContent>
        </Card>

        <Link href="/dashboard/menu">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                🍽️ Veckomeny
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">→</div>
              <p className="text-sm text-gray-500">Gå till veckomeny</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* User's stores */}
      {hasStores && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Dina butiker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {userStores?.slice(0, 10).map((us: any) => (
                <Badge key={us.store_id} variant="secondary">
                  {us.stores?.name}
                  {us.stores?.profile && ` (${us.stores.profile})`}
                </Badge>
              ))}
              {storeCount > 10 && (
                <Badge variant="outline">+{storeCount - 10} till</Badge>
              )}
            </div>
            <Button asChild variant="link" className="mt-2 p-0 h-auto">
              <Link href="/dashboard/stores">Ändra butiker →</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions - only show if user needs to do something */}
      {!hasStores && (
        <div className="grid gap-6 mb-8">
          <Card className="ring-2 ring-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🏪</span> Välj butiker
                <Badge className="bg-green-500">Starta här</Badge>
              </CardTitle>
              <CardDescription>
                Välj vilka butiker du handlar i för att komma igång
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/dashboard/stores">Välj butiker</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Getting started checklist - only show for new users */}
      {!hasStores && (
        <Card>
          <CardHeader>
            <CardTitle>Kom igång</CardTitle>
            <CardDescription>Följ dessa steg för att börja använda SmartaMenyn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Välj dina butiker</p>
                  <p className="text-sm text-gray-500">Vilka butiker handlar du i?</p>
                </div>
                <Button asChild size="sm">
                  <Link href="/dashboard/stores">Gör nu</Link>
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-400">Kolla veckans erbjudanden</p>
                  <p className="text-sm text-gray-400">Se deals från dina butiker</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-400">Generera din veckomeny</p>
                  <p className="text-sm text-gray-400">Låt AI skapa veckans meny</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
