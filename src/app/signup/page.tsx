"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({
        type: "success",
        text: "Perfekt! Kolla din inbox för att bekräfta din e-post och komma igång.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">🥗</span>
            <span className="text-xl font-bold text-green-800">SmartaMenyn</span>
          </Link>
          <CardTitle>Skapa konto</CardTitle>
          <CardDescription>
            Börja med 7 dagars gratis provperiod
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="din@email.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Skapar konto..." : "Kom igång gratis"}
            </Button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500 text-center">
            Genom att skapa ett konto godkänner du våra{" "}
            <Link href="/terms" className="underline">villkor</Link> och{" "}
            <Link href="/privacy" className="underline">integritetspolicy</Link>.
          </p>

          <div className="mt-6 text-center text-sm text-gray-500">
            Har redan ett konto?{" "}
            <Link href="/login" className="text-green-600 hover:underline">
              Logga in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
