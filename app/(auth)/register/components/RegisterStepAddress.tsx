// Adress-Schritt: Autocomplete, Hausnummer, PLZ, Geo-Standort
import { MapPin, Navigation, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import type { StepProps } from "./types";

export function RegisterStepAddress({ state, setState, setStep }: StepProps) {
  // Adresse bestaetigen
  async function handleAddressSelection(e: React.FormEvent) {
    e.preventDefault();
    setState({ error: null });

    if (!state.selectedAddress) {
      setState({ error: "Bitte wählen Sie eine Adresse aus der Liste aus." });
      return;
    }
    if (!state.houseNumber.trim()) {
      setState({ error: "Bitte geben Sie Ihre Hausnummer ein." });
      return;
    }
    if (!state.postalCode.trim() || state.postalCode.trim().length < 4) {
      setState({ error: "Bitte geben Sie eine gültige Postleitzahl ein." });
      return;
    }
    if (!state.city.trim()) {
      setState({ error: "Bitte geben Sie Ihren Ort ein." });
      return;
    }

    setState({ verificationMethod: "address_manual" });
    setStep("identity");
  }

  // Geo-Standort ermitteln
  async function handleGeoDetection() {
    setState({ geoLoading: true, error: null });
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const res = await fetch(
        `/api/quarters/find-by-location?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
      );
      if (res.ok) {
        const data = await res.json();
        setState({ geoQuarter: data, verificationMethod: "address_manual", geoLoading: false });
      } else {
        setState({ error: "Kein Quartier in Ihrer Nähe gefunden. Bitte wählen Sie stattdessen Ihre Straße aus der Liste.", geoLoading: false });
      }
    } catch {
      setState({ error: "Standort konnte nicht ermittelt werden. Bitte erlauben Sie den Zugriff oder wählen Sie Ihre Straße aus der Liste.", geoLoading: false });
    }
  }

  return (
    <form onSubmit={handleAddressSelection} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ihre Adresse ist im Pilot Pflicht. So ordnen wir Sie dem richtigen Quartier und Haushalt zu.
      </p>
      <p className="text-xs text-muted-foreground">
        Die Adresse wird fuer die Quartier-Zuordnung genutzt und nicht im oeffentlichen Profil angezeigt.
      </p>

      {/* Standort-Button */}
      <button
        type="button"
        onClick={handleGeoDetection}
        disabled={state.geoLoading}
        className="w-full rounded-lg border-2 border-dashed border-quartier-green/30 p-3 text-center transition-colors hover:border-quartier-green/60 hover:bg-quartier-green/5"
      >
        <div className="flex items-center justify-center gap-2">
          <Navigation className="h-4 w-4 text-quartier-green" />
          <span className="text-sm font-medium text-quartier-green">
            {state.geoLoading ? "Standort wird ermittelt..." : "Standort zur Quartier-Prüfung nutzen"}
          </span>
        </div>
      </button>

      {state.geoQuarter && (
        <div className="flex items-center gap-2 rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3">
          <MapPin className="h-4 w-4 shrink-0 text-quartier-green" />
          <p className="text-sm text-anthrazit">
            Quartier erkannt: <strong>{state.geoQuarter.quarter_name}</strong>. Bitte tragen Sie trotzdem Ihre Adresse ein.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">oder</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Adress-Suche via Photon Geocoding */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Straße
        </label>
        <AddressAutocomplete
          onSelect={(addr) => {
            const updates: Record<string, unknown> = { selectedAddress: addr };
            // PLZ + Stadt automatisch ausfuellen
            if (addr.postalCode) updates.postalCode = addr.postalCode;
            if (addr.city) updates.city = addr.city;
            setState(updates as Partial<typeof state>);
          }}
          placeholder="Straße eingeben..."
        />
      </div>

      {/* Hausnummer + PLZ in einer Zeile */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="house_number" className="mb-1 block text-sm font-medium">
            Hausnummer
          </label>
          <Input
            id="house_number"
            type="text"
            value={state.houseNumber}
            onChange={(e) => setState({ houseNumber: e.target.value })}
            placeholder="z.B. 35"
            autoComplete="off"
            style={{ minHeight: "52px" }}
          />
        </div>
        <div>
          <label htmlFor="postal_code" className="mb-1 block text-sm font-medium">
            PLZ
          </label>
          <Input
            id="postal_code"
            type="text"
            value={state.postalCode}
            onChange={(e) => setState({ postalCode: e.target.value })}
            placeholder="z.B. 79713"
            maxLength={5}
            inputMode="numeric"
            style={{ minHeight: "52px" }}
          />
        </div>
      </div>

      {/* Stadt */}
      <div>
        <label htmlFor="city" className="mb-1 block text-sm font-medium">
          Stadt / Ort
        </label>
        <Input
          id="city"
          type="text"
          value={state.city}
          onChange={(e) => setState({ city: e.target.value })}
          placeholder="z.B. Bad Säckingen"
          style={{ minHeight: "52px" }}
        />
      </div>

      {/* Adress-Vorschau */}
      {state.selectedAddress && state.houseNumber.trim() && state.postalCode && state.city && (
        <div className="flex items-center gap-2 rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3">
          <MapPin className="h-4 w-4 shrink-0 text-quartier-green" />
          <div className="text-sm">
            <span className="font-semibold text-anthrazit">{state.selectedAddress.street} {state.houseNumber.trim()}</span>
            <span className="ml-1 text-muted-foreground">· {state.postalCode} {state.city}</span>
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-emergency-red">{state.error}</p>}

      <Button
        type="submit"
        disabled={state.loading || !state.selectedAddress || !state.houseNumber.trim() || !state.postalCode.trim() || !state.city.trim()}
        className="w-full bg-quartier-green hover:bg-quartier-green-dark"
      >
        Weiter
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
