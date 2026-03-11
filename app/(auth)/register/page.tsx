"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { QUARTIER_STREETS } from "@/lib/constants";
import { normalizeCode, formatCode } from "@/lib/invite-codes";
import { createNotification } from "@/lib/notifications";

type Step = "credentials" | "verify_method" | "invite" | "address" | "profile" | "mode";
type VerificationMethod = "invite_code" | "address_manual" | "neighbor_invite";

// Wrapper mit Suspense-Boundary fuer useSearchParams
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Laden...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [uiMode, setUiMode] = useState<"active" | "senior">("active");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("invite_code");
  const [selectedStreet, setSelectedStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // QR-Code / Einladungslink: Invite-Code und Referrer aus URL uebernehmen
  useEffect(() => {
    const invite = searchParams.get("invite");
    const ref = searchParams.get("ref");
    if (invite) {
      setInviteCode(normalizeCode(invite));
      setVerificationMethod("invite_code");
    }
    if (ref) {
      setReferrerId(ref);
      setVerificationMethod("neighbor_invite");
    }
  }, [searchParams]);

  const totalSteps = 5;
  const currentStep = (() => {
    if (step === "credentials") return 1;
    if (step === "verify_method") return 2;
    if (step === "invite" || step === "address") return 3;
    if (step === "profile") return 4;
    if (step === "mode") return 5;
    return 1;
  })();

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    // Wenn Invite-Code aus URL vorhanden, direkt zum Code-Schritt
    if (inviteCode) {
      setStep("invite");
    } else {
      setStep("verify_method");
    }
  }

  async function handleInviteCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: household, error: queryError } = await supabase
        .from("households")
        .select("id, street_name, house_number")
        .eq("invite_code", normalizeCode(inviteCode))
        .single();

      if (queryError) {
        console.error("Invite-Code Pruefung fehlgeschlagen:", queryError);
        if (queryError.code === "PGRST116") {
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

      setHouseholdId(household.id);
      setVerificationMethod(referrerId ? "neighbor_invite" : "invite_code");
      setLoading(false);
      setStep("profile");
    } catch (err) {
      console.error("Netzwerkfehler bei Invite-Code:", err);
      setError("Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.");
      setLoading(false);
    }
  }

  async function handleAddressSelection(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // API-Route sucht oder erstellt den Haushalt automatisch
      const res = await fetch("/api/household/find-or-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streetName: selectedStreet,
          houseNumber: houseNumber.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Adresse konnte nicht verarbeitet werden.");
        setLoading(false);
        return;
      }

      setHouseholdId(data.householdId);
      setVerificationMethod("address_manual");
      setLoading(false);
      setStep("profile");
    } catch (err) {
      console.error("Netzwerkfehler bei Adressauswahl:", err);
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

      // 2. User-Profil erstellen (trust_level wird per DB-Trigger gesetzt)
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email_hash: "",
        display_name: displayName.trim(),
        ui_mode: uiMode,
      });

      if (profileError) {
        console.error("Profil-Fehler:", profileError);
        setError(`Profil konnte nicht erstellt werden: ${profileError.message}`);
        setLoading(false);
        return;
      }

      // 3. Haushalt-Zuordnung erstellen
      if (householdId) {
        const { error: memberError } = await supabase.from("household_members").insert({
          household_id: householdId,
          user_id: authData.user.id,
          verification_method: verificationMethod,
        });

        if (memberError) {
          console.error("Mitglied-Fehler:", memberError);
        }

        // 4. Bei manueller Adress-Verifikation: Anfrage erstellen
        if (verificationMethod === "address_manual") {
          const { error: requestError } = await supabase.from("verification_requests").insert({
            user_id: authData.user.id,
            household_id: householdId,
            method: "address_manual",
            status: "pending",
          });

          if (requestError) {
            console.error("Verifizierungsanfrage-Fehler:", requestError);
          }
        }

        // 5. Bei Nachbar-Einladung: Einladung als akzeptiert markieren + Punkte
        if (verificationMethod === "neighbor_invite" && referrerId) {
          await supabase
            .from("neighbor_invitations")
            .update({
              status: "accepted",
              accepted_at: new Date().toISOString(),
              accepted_by: authData.user.id,
            })
            .eq("invite_code", normalizeCode(inviteCode))
            .eq("status", "sent");

          // Punkte fuer den Einladenden
          await supabase.from("reputation_points").insert({
            user_id: referrerId,
            points: 50,
            reason: "neighbor_invited",
            reference_id: authData.user.id,
          });

          // Push-Notification an den Einladenden
          createNotification({
            userId: referrerId,
            type: "neighbor_invited",
            title: "Nachbar registriert! 🎉",
            body: `${displayName.trim()} hat Ihre Einladung angenommen. +50 Punkte!`,
            referenceId: authData.user.id,
            referenceType: "user",
          }).catch(() => {
            // Fehler still ignorieren — Registrierung nicht blockieren
          });

          // Reputation des Einladenden neu berechnen (fire-and-forget)
          fetch("/api/reputation/recompute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: referrerId }),
          }).catch(() => {});
        }
      }

      // 6. Weiterleitung
      if (uiMode === "senior") {
        router.push("/senior/home");
      } else {
        router.push("/welcome");
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

        {/* Schritt 2: Verifizierungsmethode waehlen */}
        {step === "verify_method" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Wie möchten Sie sich als Nachbar verifizieren?
            </p>

            <button
              onClick={() => {
                setVerificationMethod("invite_code");
                setStep("invite");
              }}
              className="w-full rounded-lg border-2 border-border p-4 text-left transition-colors hover:border-quartier-green/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-quartier-green/10">
                  <Mail className="h-5 w-5 text-quartier-green" />
                </div>
                <div>
                  <p className="font-semibold text-anthrazit">Einladungscode eingeben</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sie haben einen Code per Brief oder von einem Nachbarn erhalten
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setVerificationMethod("address_manual");
                setStep("address");
              }}
              className="w-full rounded-lg border-2 border-border p-4 text-left transition-colors hover:border-quartier-green/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <MapPin className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-anthrazit">Adresse manuell angeben</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ich wohne im Quartier und möchte mich verifizieren lassen
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStep("credentials")}
              className="w-full text-sm text-muted-foreground hover:underline"
            >
              Zurück
            </button>
          </div>
        )}

        {/* Schritt 2a: Invite-Code */}
        {step === "invite" && (
          <form onSubmit={handleInviteCode} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Den Einladungscode haben Sie per Brief oder von einem Nachbarn erhalten.
            </p>
            <div>
              <label htmlFor="invite" className="mb-1 block text-sm font-medium">
                Einladungscode
              </label>
              <Input
                id="invite"
                type="text"
                value={formatCode(inviteCode)}
                onChange={(e) => setInviteCode(normalizeCode(e.target.value))}
                placeholder="z.B. ABCD-EF23"
                required
                maxLength={9}
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
              onClick={() => {
                setError(null);
                setStep(searchParams.get("invite") ? "credentials" : "verify_method");
              }}
              className="w-full text-sm text-muted-foreground hover:underline"
            >
              Zurück
            </button>
          </form>
        )}

        {/* Schritt 2b: Adress-Auswahl */}
        {step === "address" && (
          <form onSubmit={handleAddressSelection} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Wählen Sie Ihre Straße und Hausnummer. Ein Admin wird Ihre Zugehörigkeit prüfen.
            </p>
            <div>
              <label htmlFor="street" className="mb-1 block text-sm font-medium">
                Straße
              </label>
              <select
                id="street"
                value={selectedStreet}
                onChange={(e) => setSelectedStreet(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Straße wählen...</option>
                {QUARTIER_STREETS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="house_number" className="mb-1 block text-sm font-medium">
                Hausnummer
              </label>
              <Input
                id="house_number"
                type="text"
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                placeholder="z.B. 5 oder 12a"
                required
              />
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
              <p className="font-medium">Hinweis zur Verifikation</p>
              <p className="mt-1">
                Ein Admin wird Ihre Zugehörigkeit zum Quartier prüfen. Sie erhalten eine Benachrichtigung, sobald Ihr Konto freigeschaltet wurde.
              </p>
            </div>

            {error && <p className="text-sm text-emergency-red">{error}</p>}
            <Button
              type="submit"
              disabled={loading || !selectedStreet || !houseNumber.trim()}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
            >
              {loading ? "Wird geprüft..." : "Adresse bestätigen"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("verify_method");
              }}
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
