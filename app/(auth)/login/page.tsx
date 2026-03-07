"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error("Login-Fehler:", authError);
        setError("E-Mail oder Passwort ist falsch.");
        setLoading(false);
        return;
      }

      // UI-Modus prüfen → entsprechende Startseite
      const userId = authData.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("users")
          .select("ui_mode")
          .eq("id", userId)
          .single();

        if (profile?.ui_mode === "senior") {
          router.push("/senior/home");
          return;
        }
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Login Netzwerkfehler:", err);
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
      setLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mb-2 text-4xl">🏘️</div>
        <CardTitle className="text-2xl text-anthrazit">Anmelden</CardTitle>
        <p className="text-sm text-muted-foreground">
          Willkommen zurück in Ihrem Quartier
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              E-Mail-Adresse
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Passwort
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ihr Passwort"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-emergency-red" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-quartier-green hover:bg-quartier-green-dark"
          >
            {loading ? "Wird angemeldet..." : "Anmelden"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Noch kein Konto?{" "}
            <Link href="/register" className="text-quartier-green hover:underline">
              Jetzt registrieren
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
