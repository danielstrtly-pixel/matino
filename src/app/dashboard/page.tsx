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
        <h1 className="text-3xl font-bold">Välkommen till Matino! 👋</h1>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              🍽️ Veckomeny
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">—</div>
            <p className="text-sm text-gray-500">ej genererad</p>
          </CardContent>
        </Card>
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

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className={!hasStores ? "ring-2 ring-green-500" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🏪</span> Välj butiker
              {!hasStores && <Badge className="bg-green-500">Starta här</Badge>}
            </CardTitle>
            <CardDescription>
              Välj vilka butiker du handlar i
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant={hasStores ? "outline" : "default"}>
              <Link href="/dashboard/stores">
                {hasStores ? "Hantera butiker" : "Välj butiker"}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={hasStores && !hasOffers ? "opacity-75" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🏷️</span> Veckans deals
            </CardTitle>
            <CardDescription>
              {hasOffers 
                ? `${offerCount} erbjudanden tillgängliga`
                : "Välj butiker först"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" disabled={!hasStores}>
              <Link href="/dashboard/deals">Visa erbjudanden</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🍽️</span> Skapa veckomeny
              <Badge variant="outline">Kommer snart</Badge>
            </CardTitle>
            <CardDescription>
              Låt AI skapa din meny
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Generera meny
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Getting started checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Kom igång</CardTitle>
          <CardDescription>Följ dessa steg för att börja använda Matino</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                hasStores ? "bg-green-500 text-white" : "bg-green-100 text-green-600"
              }`}>
                {hasStores ? "✓" : "1"}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${hasStores ? "line-through text-gray-400" : ""}`}>
                  Välj dina butiker
                </p>
                <p className="text-sm text-gray-500">
                  {hasStores ? `${storeCount} butiker valda` : "Vilka butiker handlar du i?"}
                </p>
              </div>
              {!hasStores && (
                <Button asChild size="sm">
                  <Link href="/dashboard/stores">Gör nu</Link>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">Ange dina matpreferenser</p>
                <p className="text-sm text-gray-500">Vad gillar och ogillar du?</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/settings">Inställningar</Link>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">Generera din första meny</p>
                <p className="text-sm text-gray-500">Låt AI skapa veckans meny</p>
              </div>
              <Badge variant="outline">Kommer snart</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
