"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface AuthFormProps {
  variant: "login" | "signup";
}

export function AuthForm({ variant }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isSignup = variant === "signup";

  const handleSubmit = async (e: React.FormEvent) => {
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
        text: "Kolla din inbox! Vi har skickat en magisk länk till dig.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-cream-light border-cream-dark">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">🥗</span>
            <span className="text-xl font-serif font-bold text-charcoal">SmartaMenyn</span>
          </Link>
          <CardTitle className="text-charcoal">
            {isSignup ? "Kom igång gratis" : "Logga in"}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? "Ange din e-post så skickar vi en magisk länk. Inget lösenord behövs."
              : "Ange din e-post så skickar vi en magisk länk."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="din@email.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <Button type="submit" className="w-full bg-orange hover:bg-orange-hover text-white" disabled={loading}>
              {loading ? "Skickar..." : isSignup ? "Skicka magisk länk →" : "Skicka magisk länk"}
            </Button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                message.type === "success"
                  ? "bg-fresh-light text-fresh-dark"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <p className="mt-4 text-xs text-charcoal/50 text-center">
            Har du inget konto skapas ett automatiskt.{" "}
            Genom att fortsätta godkänner du våra{" "}
            <Link href="/terms" className="underline hover:text-charcoal">villkor</Link> och{" "}
            <Link href="/privacy" className="underline hover:text-charcoal">integritetspolicy</Link>.
          </p>

          <div className="mt-6 text-center text-sm text-charcoal/50">
            {isSignup ? (
              <>
                Har redan ett konto?{" "}
                <Link href="/login" className="text-orange hover:underline">Logga in</Link>
              </>
            ) : (
              <>
                Ny här?{" "}
                <Link href="/signup" className="text-orange hover:underline">Prova gratis i 7 dagar</Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
