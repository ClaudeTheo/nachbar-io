'use client';

// Nachbar Hilfe — Helfer-Registrierung Formular
// Nachbarschaftshelfer koennen sich hier fuer die Abrechnung nach §45a SGB XI registrieren.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getAllStates } from '@/lib/hilfe/federal-states';
import type { FederalStateRule } from '@/lib/hilfe/types';

export function HelperRegistrationForm() {
  const states = getAllStates();

  const [federalState, setFederalState] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [hourlyRateEur, setHourlyRateEur] = useState('');
  const [relationshipCheck, setRelationshipCheck] = useState(false);
  const [householdCheck, setHouseholdCheck] = useState(false);
  const [termsCheck, setTermsCheck] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const _selectedState: FederalStateRule | undefined = states.find(
    (s) => s.state_code === federalState,
  );
  const isBremen = federalState === 'HB';
  const isNRW = federalState === 'NW';

  const canSubmit =
    !isBremen &&
    federalState !== '' &&
    dateOfBirth !== '' &&
    hourlyRateEur !== '' &&
    relationshipCheck &&
    householdCheck &&
    termsCheck &&
    (!isNRW || certFile !== null) &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    // EUR in Cents umrechnen (z.B. "15.50" -> 1550)
    const rateCents = Math.round(parseFloat(hourlyRateEur) * 100);

    // TODO: Schulungsnachweis zuerst in Supabase Storage hochladen
    const certUrl = certFile ? `uploads/${certFile.name}` : null;

    try {
      const res = await fetch('/api/hilfe/helpers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          federal_state: federalState,
          date_of_birth: dateOfBirth,
          hourly_rate_cents: rateCents,
          certification_url: certUrl,
          relationship_check: relationshipCheck,
          household_check: householdCheck,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Registrierung fehlgeschlagen');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-lg text-green-700">
            Ihre Registrierung als Nachbarschaftshelfer wurde erfolgreich eingereicht.
            Sie werden nach Pruefung freigeschaltet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bundesland-Auswahl */}
      <div className="space-y-2">
        <label htmlFor="federal-state" className="block text-sm font-medium">
          Bundesland
        </label>
        <select
          id="federal-state"
          value={federalState}
          onChange={(e) => setFederalState(e.target.value)}
          className="min-h-[80px] w-full rounded-md border border-gray-300 px-4 py-3 text-base"
        >
          <option value="">Bitte waehlen...</option>
          {states.map((s) => (
            <option key={s.state_code} value={s.state_code}>
              {s.state_name}
            </option>
          ))}
        </select>
      </div>

      {/* Bremen-Warnung */}
      {isBremen && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-800"
        >
          Nachbarschaftshilfe ist in Bremen nicht ueber den Entlastungsbetrag abrechenbar
        </div>
      )}

      {/* Geburtsdatum */}
      <div className="space-y-2">
        <label htmlFor="date-of-birth" className="block text-sm font-medium">
          Geburtsdatum
        </label>
        <Input
          id="date-of-birth"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      {/* Stundensatz */}
      <div className="space-y-2">
        <label htmlFor="hourly-rate" className="block text-sm font-medium">
          Stundensatz
        </label>
        <Input
          id="hourly-rate"
          type="number"
          step="0.50"
          min="0"
          placeholder="z.B. 15.00"
          value={hourlyRateEur}
          onChange={(e) => setHourlyRateEur(e.target.value)}
          className="min-h-[80px]"
        />
        <p className="text-sm text-gray-500">
          Ueblich: 12,50 - 20,00 EUR/Stunde
        </p>
      </div>

      {/* Checkboxen */}
      <div className="space-y-4">
        <label className="flex min-h-[80px] cursor-pointer items-center gap-3 rounded-md border p-4">
          <input
            type="checkbox"
            checked={relationshipCheck}
            onChange={(e) => setRelationshipCheck(e.target.checked)}
            className="h-6 w-6"
          />
          <span>
            Ich bin nicht verwandt oder verschwaegert bis zum 2. Grad mit den betreuten Personen
          </span>
        </label>

        <label className="flex min-h-[80px] cursor-pointer items-center gap-3 rounded-md border p-4">
          <input
            type="checkbox"
            checked={householdCheck}
            onChange={(e) => setHouseholdCheck(e.target.checked)}
            className="h-6 w-6"
          />
          <span>Ich lebe nicht im selben Haushalt</span>
        </label>

        <label className="flex min-h-[80px] cursor-pointer items-center gap-3 rounded-md border p-4">
          <input
            type="checkbox"
            checked={termsCheck}
            onChange={(e) => setTermsCheck(e.target.checked)}
            className="h-6 w-6"
          />
          <span>Ich bestaetige die Rahmenbedingungen nach §45a SGB XI</span>
        </label>
      </div>

      {/* Schulungsnachweis (nur NRW) */}
      {isNRW && (
        <div className="space-y-2">
          <label htmlFor="cert-upload" className="block text-sm font-medium">
            Schulungsnachweis
          </label>
          <Input
            id="cert-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
            className="min-h-[80px]"
          />
          <p className="text-sm text-gray-500">
            In Nordrhein-Westfalen ist ein Schulungsnachweis (30 Stunden) erforderlich.
          </p>
        </div>
      )}

      {/* Fehlermeldung */}
      {error && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className="min-h-[80px] w-full text-lg"
      >
        {submitting ? 'Wird gesendet...' : 'Registrieren'}
      </Button>
    </form>
  );
}
