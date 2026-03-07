"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Step = "credentials" | "invite" | "profile" | "mode";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [uiMode, setUiMode] = useState<"active" | "senior">("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const totalSteps = 4;
  const currentStep = { credentials: 1, invite: 2, profile: 3, mode: 4 }[step];

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    setStep("invite");
  }

  async function handleInviteCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Invite-Code gegen die Datenbank prüfen
      const supabase = createClient();
      const { data: household, error: queryError } = await supabase
        .from("households")
        .select("id, street_name, house_number")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .single();

      if (queryError) {
        console.error("Invite-Code Prüfung fehlgeschlagen:", queryError);
        if (queryError.code === "PGRST116") {
          // No rows found — invalid code
          setError("Ungültiger Einladungscode. Bitte prüfen Sie den Code auf Ihrem Brief.");
        } else {
          setError(`Verbindungsfehler: ${queryError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!household) {
        setError("Ungültiger Einladungscode. Bitte prüfen Sie den Code auf Ihrem Brief.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setStep("profile");
    } catch (err) {
      console.error("Netzwerkfehler bei Invite-Code:", err);
      setError("Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.");
      setLoading(false);
    }
  }

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Bitte geben Sie einen Namen ein.");
      return;
    }
    setStep("mode");
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Account erstellen
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error("SignUp-Fehler:", authError);
        setError(`Registrierung fehlgeschlagen: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.");
        setLoading(false);
        return;
      }

      // 2. User-Profil erstellen
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email_hash: "",
        display_name: displayName.trim(),
        ui_mode: uiMode,
        trust_level: "verified",
      });

      if (profileError) {
        console.error("Profil-Fehler:", profileError);
        setError(`Profil konnte nicht erstellt werden: ${profileError.message}`);
        setLoading(false);
        return;
      }

      // 3. Haushalt-Zuordnung erstellen
      const { data: household, error: householdError } = await supabase
        .from("households")
        .select("id")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .single();

      if (householdError) {
        console.error("Haushalt-Fehler:", householdError);
      }

      if (household) {
        const { error: memberError } = await supabase.from("household_members").insert({
          household_id: household.id,
          user_id: authData.user.id,
          role: "member",
          verified_at: new Date().toISOString(),
        });

        if (memberError) {
          console.error("Mitglied-Fehler:", memberError);
        }
      }

      // 4. Weiterleitung
      if (uiMode === "senior") {
        router.push("/senior/home");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Registrierung Netzwerkfehler:", err);
      setError("Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.");
      setLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mb-2 text-4xl">🏘️</div>
        <CardTitle className="text-2xl text-anthrazit">Registrieren</CardTitle>
        {/* Fortschrittsbalken */}
        <div className="mt-4 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentStep ? "bg-quartier-green" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Schritt {currentStep} von {totalSteps}
        </p>
      </CardHeader>
      <CardContent>
        {/* Schritt 1: E-Mail & Passwort */}
        {step === "credentials" && (
          <form onSubmit={handleCredentials} className="space-y-4">
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
                placeholder="Mindestens 8 Zeichen"
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-emergency-red">{error}</p>}
            <Button type="submit" className="w-full bg-quartier-green hover:bg-quartier-green-dark">
              Weiter
            </Button>
          </form>
        )}

        {/* Schritt 2: Invite-Code */}
        {step === "invite" && (
          <form onSubmit={handleInviteCode} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Den Einladungscode haben Sie per Brief erhalten. Er besteht aus 8 Zeichen.
            </p>
            <div>
              <label htmlFor="invite" className="mb-1 block text-sm font-medium">
                Einladungscode
              </label>
              <Input
                id="invite"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="z.B. ABCD1234"
                required
                maxLength={8}
                className="text-center text-lg font-mono tracking-widest"
                autoComplete="off"
              />
            </div>
            {error && <p className="text-sm text-emergency-red">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full bg-quartier-green hover:bg-quartier-green-dark">
              {loading ? "Wird geprüft..." : "Code prüfen"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("credentials")}
              className="w-full text-sm text-muted-foreground hover:underline"
            >
              Zurück
            </button>
          </form>
        )}

        {/* Schritt 3: Name */}
        {step === "profile" && (
          <form onSubmit={handleProfile} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Wie möchten Sie in der Nachbarschaft angezeigt werden?
            </p>
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                Anzeigename
              </label>
              <Input
                id="name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="z.B. Thomas L. oder Ihr Vorname"
                required
                autoComplete="name"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Ihr Klarname ist nicht erforderlich. Ein Vorname oder Kürzel genügt.
              </p>
            </div>
            {error && <p className="text-sm text-emergency-red">{error}</p>}
            <Button type="submit" className="w-full bg-quartier-green hover:bg-quartier-green-dark">
              Weiter
            </Button>
          </form>
        )}

        {/* Schritt 4: UI-Modus */}
        {step === "mode" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Wählen Sie die Darstellung, die am besten zu Ihnen passt.
            </p>

            <button
              onClick={() => setUiMode("active")}
              className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                uiMode === "active"
                  ? "border-quartier-green bg-quartier-green/5"
                  : "border-border hover:border-quartier-green/50"
              }`}
            >
              <p className="font-semibold text-anthrazit">Aktiver Modus</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Voller Funktionsumfang: Karte, Marktplatz, News, Profile
              </p>
            </button>

            <button
              onClick={() => setUiMode("senior")}
              className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                uiMode === "senior"
                  ? "border-quartier-green bg-quartier-green/5"
                  : "border-border hover:border-quartier-green/50"
              }`}
            >
              <p className="font-semibold text-anthrazit">Einfacher Modus</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Große Schrift, wenige Buttons — ideal für einfache Bedienung
              </p>
            </button>

            {error && <p className="text-sm text-emergency-red">{error}</p>}

            <Button
              onClick={handleComplete}
              disabled={loading}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
            >
              {loading ? "Konto wird erstellt..." : "Registrierung abschließen"}
            </Button>
          </div>
        )}

        {step === "credentials" && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Bereits registriert?{" "}
              <Link href="/login" className="text-quartier-green hover:underline">
                Jetzt anmelden
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
