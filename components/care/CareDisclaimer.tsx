'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'care_disclaimer_accepted';

/**
 * Einmaliger Disclaimer-Dialog beim ersten Zugriff auf Care-Features.
 * Wird in localStorage gespeichert und danach nicht mehr angezeigt.
 */
export function CareDisclaimer({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState(true); // Default true um Flash zu vermeiden

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage pruefen bei Mount */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== 'true') {
      setAccepted(false);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setAccepted(true);
  }

  if (accepted) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Hintergrund abgedunkelt */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-anthrazit mb-4">
            Nachbarschaftshilfe — Hinweis
          </h2>

          <p className="text-sm text-muted-foreground mb-4">
            QuartierApp unterstützt Sie bei der Organisation Ihres Alltags im Quartier.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex gap-3 rounded-lg bg-amber-50 p-3">
              <AlertTriangle className="h-5 w-5 text-alert-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-anthrazit">Kein Ersatz für Notruf</p>
                <p className="text-xs text-muted-foreground">
                  Wählen Sie bei Gefahr immer 112 (Rettung) oder 110 (Polizei).
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-amber-50 p-3">
              <AlertTriangle className="h-5 w-5 text-alert-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-anthrazit">Keine medizinische Beratung</p>
                <p className="text-xs text-muted-foreground">
                  Erinnerungen dienen der Alltagsorganisation und stellen keine
                  medizinischen Empfehlungen dar.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-lg bg-amber-50 p-3">
              <AlertTriangle className="h-5 w-5 text-alert-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-anthrazit">Freiwillige Organisationshilfe</p>
                <p className="text-xs text-muted-foreground">
                  Tages-Check-ins sind freiwillige Organisationshilfen.
                  Sie ersetzen keine professionelle Betreuung oder Pflege.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleAccept}
            className="w-full rounded-lg bg-quartier-green px-4 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            Verstanden
          </button>
        </div>
      </div>
    </>
  );
}
