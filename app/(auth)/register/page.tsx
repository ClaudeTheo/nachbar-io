"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, MapPin, Search, Navigation, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { normalizeCode, formatCode } from "@/lib/invite-codes";
import { OtpCodeEntry } from "@/components/auth/OtpCodeEntry";


// Schritt-Typen fuer den neuen 2-Schritt-Flow
type Step = "entry" | "invite_code" | "address" | "identity" | "magic_link_sent";

// Wrapper mit Suspense-Boundary fuer useSearchParams
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Laden...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  // === State ===
  const [step, setStep] = useState<Step>("entry");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<string>("invite_code");

  // Adress-State
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{
    street: string;
    houseNumber: string;
    display: string;
    postcode?: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressSelected, setAddressSelected] = useState(false);
  const [selectedStreet, setSelectedStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Geo-State
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoQuarter, setGeoQuarter] = useState<{ quarter_id: string; quarter_name: string; action: string } | null>(null);

  // UI-State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const _router = useRouter();
  const searchParams = useSearchParams();

  // === URL-Parameter: Invite-Code und Referrer aus QR-Code/Link ===
  /* eslint-disable react-hooks/set-state-in-effect -- URL-Params einmalig in State uebernehmen */
  useEffect(() => {
    const invite = searchParams.get("invite");
    const ref = searchParams.get("ref");
    if (invite) {
      setInviteCode(normalizeCode(invite));
      setVerificationMethod("invite_code");
      setStep("invite_code"); // Direkt zum Code-Schritt
    }
    if (ref) {
      setReferrerId(ref);
      setVerificationMethod("neighbor_invite");
    }
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // === Photon API (OpenStreetMap) fuer Adress-Autocomplete ===
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 2) {
      setAddressSuggestions([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        q: `${query}, Bad Säckingen`,
        lat: "47.5535",
        lon: "7.9640",
        limit: "8",
        lang: "de",
        layer: "house",
      });

      const res = await fetch(`https://photon.komoot.io/api/?${params}`);
      const data = await res.json();

      if (!data.features) {
        setAddressSuggestions([]);
        return;
      }

      const suggestions = data.features
        .filter((f: { properties: { city?: string; postcode?: string; street?: string; housenumber?: string } }) => {
          const p = f.properties;
          return p.street && p.housenumber && (
            p.city === "Bad Säckingen" ||
            p.postcode === "79713"
          );
        })
        .map((f: { properties: { street: string; housenumber: string; postcode?: string } }) => ({
          street: f.properties.street,
          houseNumber: f.properties.housenumber,
          display: `${f.properties.street} ${f.properties.housenumber}`,
          postcode: f.properties.postcode,
        }))
        .filter((s: { display: string }, i: number, arr: Array<{ display: string }>) =>
          arr.findIndex((a) => a.display === s.display) === i
        );

      setAddressSuggestions(suggestions);
    } catch {
      setAddressSuggestions([]);
    }
  }, []);

  // Debounced Suche bei Texteingabe
  useEffect(() => {
    if (!addressQuery || addressSelected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchAddress(addressQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [addressQuery, addressSelected, searchAddress]);

  // Klick ausserhalb der Vorschlaege schliesst die Liste
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // === Fortschrittsberechnung ===
  const totalSteps = 2;
  const currentStep = (() => {
    if (step === "entry" || step === "invite_code" || step === "address") return 1;
    if (step === "identity") return 2;
    return 2; // magic_link_sent
  })();

  // === Invite-Code pruefen ===
  async function handleInviteCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Serverseitiger Check (umgeht RLS fuer unauthentifizierte Nutzer)
      const res = await fetch("/api/register/check-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: normalizeCode(inviteCode) }),
      });
      const result = await res.json();

      if (!result.valid) {
        setError("Ungültiger Einladungscode. Bitte prüfen Sie den Code auf Ihrem Brief.");
        setLoading(false);
        return;
      }

      setHouseholdId(result.householdId);
      // referrerId kann aus URL (?ref=) oder aus API-Antwort kommen
      if (result.referrerId && !referrerId) {
        setReferrerId(result.referrerId);
      }
      setVerificationMethod((referrerId || result.referrerId) ? "neighbor_invite" : "invite_code");
      setLoading(false);
      setStep("identity");
    } catch (err) {
      console.error("Netzwerkfehler bei Invite-Code:", err);
      setError("Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.");
      setLoading(false);
    }
  }

  // === Adresse bestaetigen ===
  async function handleAddressSelection(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedStreet || !houseNumber.trim()) {
      setError("Bitte wählen Sie eine Adresse aus den Vorschlägen.");
      return;
    }

    // Bestehenden Haushalt suchen
    try {
      const supabase = createClient();
      const { data: household } = await supabase
        .from("households")
        .select("id")
        .eq("street_name", selectedStreet)
        .eq("house_number", houseNumber.trim())
        .maybeSingle();
      if (household) {
        setHouseholdId(household.id);
      }
    } catch {
      // Nicht blockierend — Server erstellt Haushalt im Fallback
    }

    setVerificationMethod("address_manual");
    setStep("identity");
  }

  // === Geo-Standort ermitteln ===
  async function handleGeoDetection() {
    setGeoLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const res = await fetch(
        `/api/quarters/find-by-location?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
      );
      if (res.ok) {
        const data = await res.json();
        setGeoQuarter(data);
        setVerificationMethod("address_manual");
        setStep("identity");
      } else {
        setError("Kein Quartier in Ihrer Nähe gefunden. Bitte geben Sie Ihre Adresse manuell ein.");
      }
    } catch {
      setError("Standort konnte nicht ermittelt werden. Bitte erlauben Sie den Zugriff oder geben Sie Ihre Adresse ein.");
    }
    setGeoLoading(false);
  }

  // === Registrierung abschliessen: User erstellen + Magic Link senden ===
  async function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!displayName.trim()) {
      setError("Bitte geben Sie einen Namen ein.");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Bitte geben Sie eine E-Mail-Adresse ein.");
      setLoading(false);
      return;
    }

    try {
      // 1. User serverseitig erstellen (Admin-API, kein Passwort noetig)
      const completeRes = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          displayName: displayName.trim(),
          uiMode: "active", // UI-Modus wird spaeter im Onboarding gewaehlt
          householdId,
          streetName: selectedStreet || undefined,
          houseNumber: houseNumber.trim() || undefined,
          verificationMethod,
          inviteCode: inviteCode ? normalizeCode(inviteCode) : undefined,
          referrerId,
          quarterId: geoQuarter?.quarter_id || undefined,
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        console.error("Registration-Complete Fehler:", completeData);
        setError(completeData.error || "Registrierung fehlgeschlagen.");
        setLoading(false);
        return;
      }

      // 2. Magic Link senden via signInWithOtp
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
        },
      });

      if (otpError) {
        console.error("Magic Link Fehler:", otpError);
        // Fallback: User existiert bereits, Magic Link trotzdem senden
        if (otpError.message?.includes("rate limit")) {
          setError("Zu viele Versuche. Bitte warten Sie einen Moment.");
        } else {
          setError("Magic Link konnte nicht gesendet werden. Bitte versuchen Sie es erneut.");
        }
        setLoading(false);
        return;
      }

      // 3. Bei Nachbar-Einladung: Reputation berechnen (fire-and-forget)
      if (verificationMethod === "neighbor_invite" && referrerId) {
        fetch("/api/reputation/recompute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: referrerId }),
        }).catch(() => {});
      }

      // 4. Bestaetigung anzeigen
      setLoading(false);
      setStep("magic_link_sent");
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
        <CardTitle className="text-2xl text-anthrazit">
          {step === "magic_link_sent" ? "Code eingeben" : "Willkommen bei QuartierApp"}
        </CardTitle>

        {/* Fortschrittsbalken (nicht auf Bestaetigungsseite) */}
        {step !== "magic_link_sent" && (
          <>
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
          </>
        )}
      </CardHeader>
      <CardContent>

        {/* ============================================ */}
        {/* SCHRITT 1a: Einstieg — Zwei Pfade            */}
        {/* ============================================ */}
        {step === "entry" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Wie möchten Sie beitreten?
            </p>

            {/* Pfad 1: Einladungscode */}
            <button
              onClick={() => {
                setError(null);
                setStep("invite_code");
              }}
              className="w-full rounded-lg border-2 border-border p-4 text-left transition-colors hover:border-quartier-green/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-quartier-green/10">
                  <Mail className="h-5 w-5 text-quartier-green" />
                </div>
                <div>
                  <p className="font-semibold text-anthrazit">Ich habe einen Einladungscode</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Per Brief, Aushang oder von einem Nachbarn erhalten
                  </p>
                </div>
              </div>
            </button>

            {/* Pfad 2: Quartier finden */}
            <button
              onClick={() => {
                setError(null);
                setStep("address");
              }}
              className="w-full rounded-lg border-2 border-border p-4 text-left transition-colors hover:border-quartier-green/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <MapPin className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-anthrazit">Ich möchte mein Quartier finden</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Über Adresse oder Standort dem nächsten Quartier beitreten
                  </p>
                </div>
              </div>
            </button>

            {error && <p className="text-sm text-emergency-red">{error}</p>}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Bereits registriert?{" "}
                <Link href="/login" className="text-quartier-green hover:underline">
                  Jetzt anmelden
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* SCHRITT 1b: Invite-Code eingeben              */}
        {/* ============================================ */}
        {step === "invite_code" && (
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
                placeholder="z.B. ABCD-EF23 oder PILOT-ABCD-EF23"
                required
                maxLength={20}
                className="text-center text-lg font-mono tracking-widest"
                autoComplete="off"
                autoFocus
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
                setStep("entry");
              }}
              className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück
            </button>
          </form>
        )}

        {/* ============================================ */}
        {/* SCHRITT 1c: Adresse / Standort               */}
        {/* ============================================ */}
        {step === "address" && (
          <form onSubmit={handleAddressSelection} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Geben Sie Ihre Adresse ein oder teilen Sie Ihren Standort.
            </p>

            {/* Standort-Button */}
            <button
              type="button"
              onClick={handleGeoDetection}
              disabled={geoLoading}
              className="w-full rounded-lg border-2 border-dashed border-quartier-green/30 p-3 text-center transition-colors hover:border-quartier-green/60 hover:bg-quartier-green/5"
            >
              <div className="flex items-center justify-center gap-2">
                <Navigation className="h-4 w-4 text-quartier-green" />
                <span className="text-sm font-medium text-quartier-green">
                  {geoLoading ? "Standort wird ermittelt..." : "Standort automatisch erkennen"}
                </span>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">oder</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Adress-Suche mit Photon Autocomplete */}
            <div className="relative" ref={suggestionsRef}>
              <label htmlFor="address_search" className="mb-1 block text-sm font-medium">
                Adresse
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="address_search"
                  type="text"
                  value={addressQuery}
                  onChange={(e) => {
                    setAddressQuery(e.target.value);
                    setAddressSelected(false);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="z.B. Purkersdorfer Straße 33"
                  autoComplete="off"
                  className="pl-9"
                />
              </div>

              {/* Live-Vorschlaege aus Photon API */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-input bg-white shadow-lg">
                  {addressSuggestions.map((s, i) => (
                    <button
                      key={`${s.display}-${i}`}
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-quartier-green/10"
                      onClick={() => {
                        setSelectedStreet(s.street);
                        setHouseNumber(s.houseNumber);
                        setAddressQuery(s.display);
                        setAddressSelected(true);
                        setShowSuggestions(false);
                      }}
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-quartier-green" />
                      <div>
                        <span className="font-medium text-anthrazit">{s.display}</span>
                        {s.postcode && (
                          <span className="ml-1.5 text-xs text-muted-foreground">{s.postcode} Bad Säckingen</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Gewaehlte Adresse anzeigen */}
            {addressSelected && selectedStreet && houseNumber && (
              <div className="flex items-center gap-2 rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3">
                <MapPin className="h-4 w-4 shrink-0 text-quartier-green" />
                <div className="text-sm">
                  <span className="font-semibold text-anthrazit">{selectedStreet} {houseNumber}</span>
                  <span className="ml-1 text-muted-foreground">· 79713 Bad Säckingen</span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-emergency-red">{error}</p>}

            <Button
              type="submit"
              disabled={loading || !selectedStreet || !houseNumber.trim()}
              className="w-full bg-quartier-green hover:bg-quartier-green-dark"
            >
              Weiter
            </Button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("entry");
              }}
              className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück
            </button>
          </form>
        )}

        {/* ============================================ */}
        {/* SCHRITT 2: Name + E-Mail → Magic Link        */}
        {/* ============================================ */}
        {step === "identity" && (
          <form onSubmit={handleIdentitySubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Noch Ihr Name und Ihre E-Mail — dann senden wir Ihnen einen Anmelde-Code.
            </p>

            {/* Quartier-Info anzeigen */}
            {geoQuarter && (
              <div className="flex items-center gap-2 rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3">
                <MapPin className="h-4 w-4 shrink-0 text-quartier-green" />
                <span className="text-sm text-anthrazit">
                  Quartier: <strong>{geoQuarter.quarter_name}</strong>
                </span>
              </div>
            )}

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
                autoFocus
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Ihr Klarname ist nicht erforderlich. Ein Vorname oder Kürzel genügt.
              </p>
            </div>

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
              <p className="mt-1 text-xs text-muted-foreground">
                Wir senden Ihnen einen Link — kein Passwort nötig.
              </p>
            </div>

            {error && <p className="text-sm text-emergency-red">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full bg-quartier-green hover:bg-quartier-green-dark">
              {loading ? "Wird verarbeitet..." : "Anmelde-Code senden"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("entry");
              }}
              className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück
            </button>
          </form>
        )}

        {/* ============================================ */}
        {/* BESTAETIGUNG: OTP-Code Eingabe               */}
        {/* ============================================ */}
        {step === "magic_link_sent" && (
          <OtpCodeEntry
            email={email}
            redirectTo="/welcome"
            onBack={() => { setStep("identity"); setError(null); }}
            onResend={() => {
              const supabase = createClient();
              supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome` },
              });
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
