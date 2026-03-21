"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// Kontextabhaengige Texte fuer Google Play Prominent Disclosure
// Google verlangt In-App-Offenlegung VOR dem System-Permission-Dialog
const DISCLOSURE_TEXTS = {
  emergency: {
    title: "Standortzugriff für Notfall",
    description:
      "QuartierApp möchte Ihren genauen Standort verwenden, um diesen bei Ihrem Hilferuf an den Rettungsdienst (112) weiterzugeben. Der Standort wird nur einmalig erfasst und nach Abschluss des Vorgangs gelöscht.",
    icon: "🚨",
  },
  map: {
    title: "Standortzugriff für Quartierskarte",
    description:
      "QuartierApp möchte Ihren ungefähren Standort verwenden, um Ihre Position auf der Quartierskarte anzuzeigen. Der Standort wird nicht gespeichert und verlässt nicht Ihr Gerät.",
    icon: "🗺️",
  },
  report: {
    title: "Standortzugriff für Meldung",
    description:
      "QuartierApp möchte Ihren genauen Standort verwenden, um den Ort Ihrer Meldung automatisch zu erfassen. Der Standort wird nur für diese Meldung verwendet.",
    icon: "📍",
  },
} as const;

export type LocationPurpose = keyof typeof DISCLOSURE_TEXTS;

interface LocationDisclosureProps {
  purpose: LocationPurpose;
  onAccept: () => void;
  onDecline: () => void;
}

// Pruefen ob Disclosure fuer diesen Zweck bereits akzeptiert wurde
export function isLocationDisclosed(purpose: LocationPurpose): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`nachbar-location-disclosed-${purpose}`) === "true";
}

// Disclosure als akzeptiert markieren
export function markLocationDisclosed(purpose: LocationPurpose): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`nachbar-location-disclosed-${purpose}`, "true");
}

export function LocationDisclosure({ purpose, onAccept, onDecline }: LocationDisclosureProps) {
  const [accepted, setAccepted] = useState(false);
  const text = DISCLOSURE_TEXTS[purpose];

  const handleAccept = useCallback(() => {
    markLocationDisclosed(purpose);
    setAccepted(true);
    onAccept();
  }, [purpose, onAccept]);

  if (accepted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-disclosure-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 text-center text-4xl">{text.icon}</div>

        <h2
          id="location-disclosure-title"
          className="mb-3 text-center text-lg font-semibold text-[#2D3142]"
        >
          {text.title}
        </h2>

        <p className="mb-4 text-center text-sm text-gray-600 leading-relaxed">
          {text.description}
        </p>

        <Link
          href="/datenschutz#standort"
          className="mb-6 block text-center text-sm text-[#4CAF87] underline"
          target="_blank"
        >
          Mehr erfahren →
        </Link>

        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Ablehnen
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 rounded-xl bg-[#4CAF87] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3d9a74]"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
