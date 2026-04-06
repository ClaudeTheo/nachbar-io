// Identitaets-Schritt: Name + E-Mail → Magic Link senden
import { useState } from "react";
import { MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { normalizeCode } from "@/lib/invite-codes";
import type { StepProps } from "./types";

export function RegisterStepIdentity({ state, setState, setStep }: StepProps) {
  const [honeypot, setHoneypot] = useState("");

  // Registrierung abschliessen: User erstellen + Magic Link senden
  async function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ loading: true, error: null });

    if (!state.displayName.trim()) {
      setState({ error: "Bitte geben Sie einen Namen ein.", loading: false });
      return;
    }

    if (!state.email.trim()) {
      setState({ error: "Bitte geben Sie eine E-Mail-Adresse ein.", loading: false });
      return;
    }

    try {
      // 1. User serverseitig erstellen (Admin-API, kein Passwort noetig)
      const completeRes = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          displayName: state.displayName.trim(),
          uiMode: "active", // UI-Modus wird spaeter im Onboarding gewaehlt
          householdId: state.householdId,
          streetName: state.selectedAddress?.street || undefined,
          houseNumber: state.houseNumber.trim() || undefined,
          lat: state.selectedAddress?.lat || undefined,
          lng: state.selectedAddress?.lng || undefined,
          postalCode: state.postalCode.trim() || state.selectedAddress?.postalCode || undefined,
          city: state.city.trim() || state.selectedAddress?.city || undefined,
          verificationMethod: state.verificationMethod,
          inviteCode: state.inviteCode ? normalizeCode(state.inviteCode) : undefined,
          referrerId: state.referrerId,
          quarterId: state.geoQuarter?.quarter_id || undefined,
          website: honeypot, // Honeypot-Feld fuer Bot-Erkennung
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        console.error("Registration-Complete Fehler:", completeData);
        setState({ error: completeData.error || "Registrierung fehlgeschlagen.", loading: false });
        return;
      }

      // 2. Magic Link senden via signInWithOtp
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: state.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
        },
      });

      if (otpError) {
        console.error("Magic Link Fehler:", otpError);
        // Fallback: User existiert bereits, Magic Link trotzdem senden
        if (otpError.message?.includes("rate limit")) {
          setState({ error: "Zu viele Versuche. Bitte warten Sie einen Moment.", loading: false });
        } else {
          setState({ error: "Magic Link konnte nicht gesendet werden. Bitte versuchen Sie es erneut.", loading: false });
        }
        return;
      }

      // 3. Bei Nachbar-Einladung: Reputation berechnen (fire-and-forget)
      if (state.verificationMethod === "neighbor_invite" && state.referrerId) {
        fetch("/api/reputation/recompute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: state.referrerId }),
        }).catch(() => {});
      }

      // 4. Bestaetigung anzeigen
      setState({ loading: false });
      setStep("magic_link_sent");
    } catch (err) {
      console.error("Registrierung Netzwerkfehler:", err);
      setState({ error: "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.", loading: false });
    }
  }

  return (
    <form onSubmit={handleIdentitySubmit} className="space-y-4">
      {/* Honeypot-Feld fuer Bot-Erkennung (unsichtbar fuer Menschen) */}
      <input
        name="website"
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
        aria-hidden="true"
        data-testid="register-extra"
      />

      <p className="text-sm text-muted-foreground">
        Noch Ihr Name und Ihre E-Mail — dann senden wir Ihnen einen Anmelde-Code.
      </p>

      {/* Quartier-Info anzeigen */}
      {state.geoQuarter && (
        <div className="flex items-center gap-2 rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3">
          <MapPin className="h-4 w-4 shrink-0 text-quartier-green" />
          <span className="text-sm text-anthrazit">
            Quartier: <strong>{state.geoQuarter.quarter_name}</strong>
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
          value={state.displayName}
          onChange={(e) => setState({ displayName: e.target.value })}
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
          value={state.email}
          onChange={(e) => setState({ email: e.target.value })}
          placeholder="ihre@email.de"
          required
          autoComplete="email"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Wir senden Ihnen einen Link — kein Passwort nötig.
        </p>
      </div>

      {state.error && <p className="text-sm text-emergency-red">{state.error}</p>}

      <Button type="submit" disabled={state.loading} className="w-full bg-quartier-green hover:bg-quartier-green-dark">
        {state.loading ? "Wird verarbeitet..." : "Anmelde-Code senden"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setState({ error: null });
          setStep("entry");
        }}
        className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Zurück
      </button>
    </form>
  );
}
