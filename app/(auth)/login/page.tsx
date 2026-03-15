"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type LoginMode = "magic_link" | "password" | "magic_link_sent";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LoginMode>("magic_link");
  const router = useRouter();

  // Magic Link senden
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (otpError) {
        console.error("Magic Link Fehler:", otpError);
        if (otpError.message?.includes("rate limit")) {
          setError("Zu viele Versuche. Bitte warten Sie einen Moment.");
        } else {
          setError("Anmeldelink konnte nicht gesendet werden. Bitte versuchen Sie es erneut.");
        }
        setLoading(false);
        return;
      }

      setLoading(false);
      setMode("magic_link_sent");
    } catch (err) {
      console.error("Login Netzwerkfehler:", err);
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
      setLoading(false);
    }
  }

  // Passwort-Login (Fallback)
  async function handlePasswordLogin(e: React.FormEvent) {
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

      // UI-Modus pruefen → entsprechende Startseite
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
        <CardTitle className="text-2xl text-anthrazit">
          {mode === "magic_link_sent" ? "Link gesendet!" : "Anmelden"}
        </CardTitle>
        {mode !== "magic_link_sent" && (
          <p className="text-sm text-muted-foreground">
            Willkommen zurück in Ihrem Quartier
          </p>
        )}
      </CardHeader>
      <CardContent>

        {/* === Magic Link (Standard) === */}
        {mode === "magic_link" && (
          <form onSubmit={handleMagicLink} className="space-y-4">
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
                autoFocus
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
              <Mail className="mr-2 h-4 w-4" />
              {loading ? "Wird gesendet..." : "Anmeldelink senden"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("password");
              }}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:underline"
            >
              <KeyRound className="h-3 w-3" />
              Stattdessen mit Passwort anmelden
            </button>
          </form>
        )}

        {/* === Passwort-Login (Fallback) === */}
        {mode === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="email-pw" className="mb-1 block text-sm font-medium">
                E-Mail-Adresse
              </label>
              <Input
                id="email-pw"
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

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode("magic_link");
              }}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:underline"
            >
              <Mail className="h-3 w-3" />
              Stattdessen Anmeldelink per E-Mail erhalten
            </button>
          </form>
        )}

        {/* === Magic Link Bestaetigung === */}
        {mode === "magic_link_sent" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-quartier-green/10">
              <CheckCircle2 className="h-8 w-8 text-quartier-green" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Anmeldelink gesendet an
              </p>
              <p className="mt-1 font-semibold text-anthrazit">{email}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prüfen Sie Ihren Posteingang und klicken Sie auf den Link.
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              <p className="font-medium">Keine E-Mail erhalten?</p>
              <p className="mt-1">
                Prüfen Sie Ihren Spam-Ordner. Der Link ist 60 Minuten gültig.
              </p>
            </div>

            <Button
              onClick={() => {
                setMode("magic_link");
                setError(null);
              }}
              variant="outline"
              className="w-full"
            >
              Erneut versuchen
            </Button>
          </div>
        )}

        {/* Registrierung-Link (nicht auf Bestaetigungsseite) */}
        {mode !== "magic_link_sent" && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Noch kein Konto?{" "}
              <Link href="/register" className="text-quartier-green hover:underline">
                Jetzt registrieren
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
