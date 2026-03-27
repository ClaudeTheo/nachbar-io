"use client";

import { useState } from "react";
import Link from "next/link";
import { useGuidelinesAccepted } from "@/lib/hooks/useGuidelinesAccepted";

// Google Play Store Policy: Nutzer muessen Community Guidelines akzeptieren
// bevor sie Inhalte erstellen (Posts, Marktplatz, Hilferufe)

const GUIDELINES_SUMMARY = [
  "Respektvoller, ehrlicher und hilfsbereiter Umgang",
  "Keine Hassrede, Drohungen, Betrug oder Spam",
  "Marktplatz: Nur legale Artikel, wahrheitsgemäße Beschreibungen",
  "Verstöße führen zu Verwarnungen und Sperren",
  "Einspruch möglich per E-Mail an support@quartierapp.de",
] as const;

interface GuidelinesAcceptanceProps {
  /** Wird aufgerufen wenn Nutzer die Richtlinien akzeptiert hat */
  onAccepted: () => void;
}

export function GuidelinesAcceptance({ onAccepted }: GuidelinesAcceptanceProps) {
  const { acceptGuidelines } = useGuidelinesAccepted();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAccept() {
    if (!checked) return;
    setSubmitting(true);
    await acceptGuidelines();
    setSubmitting(false);
    onAccepted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidelines-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="guidelines-title"
          className="mb-3 text-center text-lg font-semibold text-[#2D3142]"
        >
          Community-Richtlinien
        </h2>

        <p className="mb-4 text-center text-sm text-gray-600">
          Bitte akzeptieren Sie unsere Richtlinien, bevor Sie Inhalte veröffentlichen.
        </p>

        <ul className="mb-4 space-y-2">
          {GUIDELINES_SUMMARY.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-0.5 flex-shrink-0 text-[#4CAF87]">✓</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/richtlinien"
          className="mb-4 block text-center text-sm text-[#4CAF87] underline"
          target="_blank"
        >
          Vollständige Richtlinien lesen →
        </Link>

        <label className="mb-4 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-[#4CAF87] focus:ring-[#4CAF87]"
          />
          <span className="text-sm text-gray-700">
            Ich habe die Community-Richtlinien gelesen und akzeptiere sie.
          </span>
        </label>

        <button
          onClick={handleAccept}
          disabled={!checked || submitting}
          className="w-full rounded-xl bg-[#4CAF87] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3d9a74] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Wird gespeichert..." : "Akzeptieren und fortfahren"}
        </button>
      </div>
    </div>
  );
}

/**
 * Wrapper-Komponente: Zeigt GuidelinesAcceptance Modal wenn nötig,
 * sonst rendert die children.
 */
interface GuidelinesGateProps {
  children: React.ReactNode;
}

export function GuidelinesGate({ children }: GuidelinesGateProps) {
  const { accepted, loading } = useGuidelinesAccepted();
  const [dismissed, setDismissed] = useState(false);

  if (loading) return null;

  if (!accepted && !dismissed) {
    return <GuidelinesAcceptance onAccepted={() => setDismissed(true)} />;
  }

  return <>{children}</>;
}
