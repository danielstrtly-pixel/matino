import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Välkommen till Matino! 👋</h1>
        <p className="text-gray-600 mt-2">
          Inloggad som {user?.email}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🏪</span> Välj butiker
            </CardTitle>
            <CardDescription>
              Välj vilka butiker du handlar i
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/stores">Hantera butiker</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🏷️</span> Veckans deals
            </CardTitle>
            <CardDescription>
              Se aktuella erbjudanden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/deals">Visa erbjudanden</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🍽️</span> Skapa veckomeny
            </CardTitle>
            <CardDescription>
              Låt AI skapa din meny
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/menu">Generera meny</Link>
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
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <p className="font-medium">Välj dina butiker</p>
                <p className="text-sm text-gray-500">Vilka butiker handlar du i?</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <p className="font-medium">Ange dina matpreferenser</p>
                <p className="text-sm text-gray-500">Vad gillar och ogillar du?</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <p className="font-medium">Generera din första meny</p>
                <p className="text-sm text-gray-500">Låt AI skapa veckans meny</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
