"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { OtpCodeEntry } from "@/components/auth/OtpCodeEntry";

type LoginMode = "magic_link" | "password" | "magic_link_sent";

// B-2 Pilot-Entscheidung: Passwort-Login ist ausgeblendet, solange kein
// Recovery-Flow (Passwort vergessen) implementiert ist. Nutzer ohne
// Recovery-Moeglichkeit koennten sich aussperren.
// Reaktivierung: auf false setzen ODER Recovery-Flow implementieren
// und dann "Passwort vergessen"-Link einfuegen (siehe Go-Live Audit B-2).
const PILOT_HIDE_PASSWORD_LOGIN = true;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LoginMode>("magic_link");
  const [sendCooldown, setSendCooldown] = useState(0);
  const router = useRouter();

  // Cooldown-Timer nach OTP-Versand (verhindert Supabase Rate Limit)
  useEffect(() => {
    if (sendCooldown <= 0) return;
    const timer = setTimeout(() => setSendCooldown(sendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [sendCooldown]);

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
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (otpError) {
        console.error("Magic Link Fehler:", otpError);
        if (otpError.message?.includes("rate limit")) {
          setError("Zu viele Versuche. Bitte warten Sie einen Moment.");
        } else {
          setError("Anmelde-Code konnte nicht gesendet werden. Bitte versuchen Sie es erneut.");
        }
        setLoading(false);
        return;
      }

      setLoading(false);
      setSendCooldown(30);
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
          {mode === "magic_link_sent" ? "Code eingeben" : "Anmelden"}
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
              disabled={loading || sendCooldown > 0}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
            >
              <Mail className="mr-2 h-4 w-4" />
              {loading ? "Wird gesendet..." : sendCooldown > 0 ? `Bitte warten (${sendCooldown}s)` : "Anmelde-Code senden"}
            </Button>

            {!PILOT_HIDE_PASSWORD_LOGIN && (
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
            )}
          </form>
        )}

        {/* === Passwort-Login (Fallback) — ausgeblendet im Pilot (B-2) === */}
        {mode === "password" && !PILOT_HIDE_PASSWORD_LOGIN && (
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
              Stattdessen Anmelde-Code per E-Mail erhalten
            </button>
          </form>
        )}

        {/* === OTP-Code Eingabe (ersetzt Magic Link Bestaetigung) === */}
        {mode === "magic_link_sent" && (
          <OtpCodeEntry
            email={email}
            redirectTo="/dashboard"
            onBack={() => { setMode("magic_link"); setError(null); }}
            onResend={() => {
              const supabase = createClient();
              supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
              });
            }}
          />
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
