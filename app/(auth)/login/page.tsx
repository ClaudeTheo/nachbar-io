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
    <div className="w-full max-w-md mx-auto space-y-4">
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

    {/* Tester-Hinweis */}
    <div className="mt-4 rounded-xl border-2 border-quartier-green/30 bg-quartier-green/5 p-5">
      <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-quartier-green">
        <span className="text-lg">🧪</span>
        Testen Sie Nachbar.io
      </h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Helfen Sie mit, unsere Quartiers-App zu verbessern! Als Tester prüfen Sie die Funktionen
        und geben wertvolles Feedback.
      </p>
      <div className="mb-3 space-y-2 rounded-lg bg-white/60 p-3 text-sm">
        <p className="font-medium text-anthrazit">So starten Sie:</p>
        <ul className="ml-1 space-y-1.5 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-quartier-green">1.</span>
            <span>Tippen Sie oben auf <strong>&quot;Jetzt registrieren&quot;</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-quartier-green">2.</span>
            <span>Verwenden Sie eine <strong>beliebige E-Mail-Adresse</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-quartier-green">3.</span>
            <span>Wählen Sie ein <strong>Passwort mit mind. 8 Zeichen</strong> (z.B. &quot;Test1234&quot;)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-quartier-green">4.</span>
            <span>Wählen Sie Ihre Straße und Hausnummer</span>
          </li>
        </ul>
      </div>
      <Link
        href="/testanleitung"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-quartier-green hover:underline"
      >
        Ausführliche Testanleitung lesen →
      </Link>
    </div>
    </div>
  );
}
