"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, KeyRound } from "lucide-react";
import { signInWithApple } from "@/lib/auth/apple";

// Apple-Logo SVG nach Apple HIG (kein Lucide — das waere ein Frucht-Apfel)
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}
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

        {/* === Sign in with Apple (Guideline 4.8) === */}
        {mode === "magic_link" && (
          <div className="mb-4">
            <Button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError(null);
                const { error: appleError } = await signInWithApple();
                if (appleError) {
                  setError("Apple-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.");
                }
                setLoading(false);
              }}
              disabled={loading}
              className="w-full bg-black text-white hover:bg-black/90"
              style={{ minHeight: '48px' }}
            >
              <AppleLogo className="mr-2 h-5 w-5" />
              Mit Apple anmelden
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">oder per E-Mail</span>
              </div>
            </div>
          </div>
        )}

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
