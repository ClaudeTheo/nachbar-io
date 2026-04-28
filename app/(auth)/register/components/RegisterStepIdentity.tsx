// Identitäts-Schritt: Pilot-Pflichtdaten + E-Mail → Magic Link senden
import { useState } from "react";
import { MapPin, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StepProps } from "./types";

function buildFullName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function isValidDateOfBirth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().slice(0, 10) !== value) return false;
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return parsed <= todayUtc;
}

export function RegisterStepIdentity({ state, setState, setStep }: StepProps) {
  const [honeypot, setHoneypot] = useState("");

  // Registrierung abschließen: User erstellen + Magic Link senden
  async function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ loading: true, error: null });

    if (!state.firstName.trim()) {
      setState({ error: "Bitte geben Sie Ihren Vornamen ein.", loading: false });
      return;
    }

    if (!state.lastName.trim()) {
      setState({ error: "Bitte geben Sie Ihren Nachnamen ein.", loading: false });
      return;
    }

    if (!state.dateOfBirth.trim()) {
      setState({ error: "Bitte geben Sie Ihr Geburtsdatum ein.", loading: false });
      return;
    }

    if (!isValidDateOfBirth(state.dateOfBirth.trim())) {
      setState({ error: "Bitte geben Sie ein gültiges Geburtsdatum ein.", loading: false });
      return;
    }

    if (!state.email.trim()) {
      setState({ error: "Bitte geben Sie eine E-Mail-Adresse ein.", loading: false });
      return;
    }

    try {
      const displayName = buildFullName(state.firstName, state.lastName);
      setState({ displayName, website: honeypot, loading: false });
      setStep("pilot_role");
    } catch (err) {
      console.error("Registrierung Netzwerkfehler:", err);
      setState({ error: "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.", loading: false });
    }
  }

  return (
    <form onSubmit={handleIdentitySubmit} className="space-y-4">
      {/* Honeypot-Feld für Bot-Erkennung (unsichtbar für Menschen) */}
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

      <div className="rounded-lg border border-quartier-green/25 bg-quartier-green/5 p-3">
        <div className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-quartier-green" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-anthrazit">
              Pflichtdaten für den geschlossenen Pilot
            </p>
            <p className="text-sm text-muted-foreground">
              Wir nutzen Vorname, Nachname und Geburtsdatum für Vertrauen, Sicherheit und Pilot-Zuordnung.
            </p>
          </div>
        </div>
      </div>

      {/* Quartier-Info anzeigen */}
      {state.geoQuarter && (
        <div className="flex items-center gap-2 rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3">
          <MapPin className="h-4 w-4 shrink-0 text-quartier-green" />
          <span className="text-sm text-anthrazit">
            Quartier: <strong>{state.geoQuarter.quarter_name}</strong>
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="first_name" className="mb-1 block text-sm font-medium">
            Vorname
          </label>
          <Input
            id="first_name"
            type="text"
            value={state.firstName}
            onChange={(e) => setState({ firstName: e.target.value })}
            placeholder="z.B. Thomas"
            required
            autoComplete="given-name"
            autoFocus
            style={{ minHeight: "52px" }}
          />
        </div>
        <div>
          <label htmlFor="last_name" className="mb-1 block text-sm font-medium">
            Nachname
          </label>
          <Input
            id="last_name"
            type="text"
            value={state.lastName}
            onChange={(e) => setState({ lastName: e.target.value })}
            placeholder="z.B. Theobald"
            required
            autoComplete="family-name"
            style={{ minHeight: "52px" }}
          />
        </div>
      </div>

      <div>
        <label htmlFor="date_of_birth" className="mb-1 block text-sm font-medium">
          Geburtsdatum
        </label>
        <Input
          id="date_of_birth"
          type="date"
          value={state.dateOfBirth}
          onChange={(e) => setState({ dateOfBirth: e.target.value })}
          required
          autoComplete="bday"
          style={{ minHeight: "52px" }}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Das Geburtsdatum hilft bei Verantwortung und eindeutiger Zuordnung im Test.
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
        {state.loading ? "Wird verarbeitet..." : "Weiter zur Pilot-Rolle"}
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
