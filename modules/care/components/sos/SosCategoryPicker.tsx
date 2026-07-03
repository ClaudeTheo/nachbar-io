'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CARE_SOS_CATEGORIES } from '@/lib/care/constants';
import { EmergencyBanner } from '@/components/EmergencyBanner';
import { mapSosErrorForSenior } from './sos-error-messages';
import type { CareSosCategory } from '@/lib/care/types';

interface SosCategoryPickerProps {
  source?: 'app' | 'device';
  onSosCreated?: (alertId: string) => void;
}

export function SosCategoryPicker({ source = 'app', onSosCreated }: SosCategoryPickerProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CareSosCategory | null>(null);
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(false);
  // W8 (A3:4): Nicht-Notfall-Kategorien brauchen einen Bestaetigungs-Tap,
  // bevor ein Alarm gefeuert wird (Fehlalarm-Schutz — die Level-1-Pushes
  // gehen serverseitig synchron raus und sind nicht zurueckholbar).
  const [pendingCategory, setPendingCategory] = useState<CareSosCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function triggerSos(category: CareSosCategory) {
    // Re-Entrancy-Guard (Doppel-Tap): der Alarm loest nicht zurueckholbare
    // Level-1-Pushes aus — zusaetzlich zum disabled-Attribut absichern.
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/care/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, source }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        // W8 (A3:4): Auf der Senior-Flaeche keine Server-Fehlertexte
        // (Abo-Upsell, "Einwilligung erforderlich") 1:1 anzeigen.
        setError(
          source === 'device'
            ? mapSosErrorForSenior(res.status, data)
            : data?.error || 'SOS konnte nicht gesendet werden',
        );
        setLoading(false);
        return;
      }
      const alert = await res.json();
      if (onSosCreated) {
        onSosCreated(alert.id);
      } else {
        const statusPath = source === 'device' ? `/sos/status?id=${alert.id}` : `/care/sos/${alert.id}`;
        router.push(statusPath);
      }
      // Erfolgsfall: loading bewusst true lassen, bis die Navigation die
      // Seite ersetzt — sonst ist "Ja, Hilfe anfragen" waehrend der
      // Navigations-Latenz wieder aktiv und ein zweiter Tap feuert einen
      // Duplikat-Alarm.
      return;
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    }
    setLoading(false);
  }

  function handleCategorySelect(category: CareSosCategory) {
    setSelectedCategory(category);
    const cat = CARE_SOS_CATEGORIES.find((c) => c.id === category);
    if (cat?.isEmergency) {
      // Notfall-Pfad unveraendert: 112/110-Banner zuerst (FMEA FM-NB-02),
      // der Banner-Acknowledge IST dort der Bestaetigungsschritt.
      setShowEmergencyBanner(true);
    } else {
      setError(null);
      setPendingCategory(category);
    }
  }

  function handleEmergencyAcknowledge() {
    setShowEmergencyBanner(false);
    if (selectedCategory) {
      triggerSos(selectedCategory);
    }
  }

  const pendingCat = pendingCategory
    ? (CARE_SOS_CATEGORIES.find((c) => c.id === pendingCategory) ?? null)
    : null;

  return (
    <>
      {showEmergencyBanner && (
        <EmergencyBanner onAcknowledge={handleEmergencyAcknowledge} />
      )}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-anthrazit text-center mb-4">
          Was brauchen Sie?
        </h2>
        {error && (
          // Befund B3:3: Fehler hoerbar ansagen (role=alert), sonst bleibt ein
          // fehlgeschlagener SOS-Versand fuer sehbehinderte Nutzer unsichtbar.
          <div role="alert" className="rounded-lg bg-emergency-red/10 p-3 text-sm text-red-800 text-center">
            {error}
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {loading ? 'Ihre Anfrage wird gesendet …' : ''}
        </p>
        {pendingCat ? (
          // W8 (A3:4): Bestaetigungsansicht fuer Nicht-Notfall — 2 Taps gesamt
          // (Kategorie + Bestaetigung), Senior-Regel max. 4 Taps eingehalten.
          <>
            <div
              // role=status: der Ansichtswechsel muss fuer Screenreader
              // hoerbar sein — sonst wirkt der stille Zwischenschritt wie
              // eine bereits abgeschickte Anfrage (Geist von B3:3).
              role="status"
              className="rounded-xl border-2 border-gray-200 bg-white p-5 text-center"
              data-testid="sos-confirm"
            >
              <span className="text-3xl" role="img" aria-hidden="true">{pendingCat.icon}</span>
              <span className="mt-2 block text-lg font-bold text-anthrazit">
                {pendingCat.label}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Möchten Sie diese Hilfe anfragen?
              </span>
            </div>
            <button
              onClick={() => triggerSos(pendingCat.id)}
              disabled={loading}
              className={`w-full rounded-xl bg-quartier-green p-5 text-center text-lg font-bold text-white transition-opacity hover:opacity-90 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ minHeight: '80px', touchAction: 'manipulation' }}
            >
              Ja, Hilfe anfragen
            </button>
            <button
              onClick={() => {
                setPendingCategory(null);
                setError(null);
              }}
              disabled={loading}
              className={`w-full rounded-xl border-2 border-gray-200 bg-white p-5 text-center text-lg font-bold text-anthrazit transition-colors hover:bg-gray-50 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ minHeight: '80px', touchAction: 'manipulation' }}
            >
              Abbrechen
            </button>
          </>
        ) : (
          CARE_SOS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              disabled={loading}
              className={`w-full rounded-xl border-2 p-5 text-left transition-colors
                ${cat.isEmergency ? 'border-emergency-red bg-red-50 hover:bg-red-100' : 'border-gray-200 bg-white hover:bg-gray-50'}
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              style={{ minHeight: '80px', touchAction: 'manipulation' }}
            >
              <span className="flex items-center gap-4">
                <span className="text-3xl" role="img" aria-hidden="true">{cat.icon}</span>
                <span>
                  <span className={`block text-lg font-bold ${cat.isEmergency ? 'text-red-800' : 'text-anthrazit'}`}>
                    {cat.label}
                  </span>
                  <span className={`block text-sm ${cat.isEmergency ? 'text-red-900' : 'text-muted-foreground'}`}>
                    {cat.description}
                  </span>
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
}
