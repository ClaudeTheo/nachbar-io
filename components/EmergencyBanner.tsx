"use client";

import { useEffect, useRef, useCallback } from "react";
import { Phone } from "lucide-react";

/**
 * KRITISCHE KOMPONENTE: EmergencyBanner (FMEA FM-NB-02)
 *
 * Zeigt den Notruf-Hinweis bei lebensbedrohlichen Situationen.
 * Muss IMMER angezeigt werden BEVOR andere Aktionen moeglich sind.
 *
 * SICHERHEIT: Banner kann NICHT geschlossen werden ohne explizite Bestaetigung.
 * Escape-Taste ist DEAKTIVIERT (FMEA-Massnahme: RPZ 60 → 12).
 * Zwei explizite Buttons: "Notruf gerufen" vs. "Kein Notruf noetig"
 *
 * Regel: Bei Feuer, medizinischem Notfall oder Einbruch → 112/110 zuerst.
 * Diese Regel ist NICHT verhandelbar.
 */

interface EmergencyBannerProps {
  onAcknowledge: (calledEmergency?: boolean) => void;
}

export function EmergencyBanner({ onAcknowledge }: EmergencyBannerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLAnchorElement>(null);

  // Focus-Trap: Tab innerhalb des Modals halten, Escape BLOCKIERT (FMEA FM-NB-02)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Escape absichtlich blockiert — Banner darf nur per Button geschlossen werden
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  useEffect(() => {
    // Erstes interaktives Element fokussieren
    firstFocusRef.current?.focus();

    // Keyboard-Events fuer Focus-Trap
    document.addEventListener("keydown", handleKeyDown);

    // Hintergrund-Scrolling verhindern
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div ref={dialogRef} className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        {/* Roter Notfall-Header */}
        <div className="mb-4 rounded-lg bg-emergency-red p-4 text-center text-white">
          <Phone className="mx-auto mb-2 h-10 w-10" aria-hidden="true" />
          <h2 id="emergency-title" className="text-xl font-bold">Notruf zuerst!</h2>
        </div>

        {/* Notrufnummern */}
        <div className="mb-6 space-y-3">
          <a
            ref={firstFocusRef}
            href="tel:112"
            className="flex items-center justify-center gap-3 rounded-lg border-2 border-emergency-red p-4 text-lg font-bold text-emergency-red transition-colors hover:bg-red-50"
          >
            <Phone className="h-6 w-6" aria-hidden="true" />
            112 — Feuerwehr / Rettungsdienst
          </a>
          <a
            href="tel:110"
            className="flex items-center justify-center gap-3 rounded-lg border-2 border-emergency-red p-4 text-lg font-bold text-emergency-red transition-colors hover:bg-red-50"
          >
            <Phone className="h-6 w-6" aria-hidden="true" />
            110 — Polizei
          </a>
        </div>

        {/* Hinweistext */}
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Bitte rufen Sie bei einem Notfall <strong>immer zuerst</strong> den
          offiziellen Notruf an. Diese App ist kein Ersatz fuer
          Rettungsdienste.
        </p>

        {/* Zwei explizite Bestaetigungsbuttons (FMEA FM-NB-02) */}
        <div className="space-y-2">
          <button
            onClick={() => onAcknowledge(true)}
            className="w-full rounded-lg border-2 border-green-600 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100"
          >
            Ich habe 112/110 angerufen — Nachbarn zusaetzlich informieren
          </button>
          <button
            onClick={() => onAcknowledge(false)}
            className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-50"
          >
            Kein Notruf noetig — nur Nachbarschaftshilfe
          </button>
        </div>
      </div>
    </div>
  );
}
