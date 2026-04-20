// modules/memory/components/SeniorMemoryFactList.tsx
// Welle C C7 — Senior-Variante der Memory-Fakten-Liste.
//
// Senior-Mode-Anforderungen die diese Variante von MemoryFactList unterscheidet:
// - 80px Touch-Targets pro Aktion (Delete + Reset + Confirm-Buttons)
// - Inline Confirm-Overlay vor JEDEM Loeschvorgang (DSGVO Art. 17 — User
//   muss aktiv bestaetigen, kein versehentliches Loeschen)
// - KEINE Inline-Edit-Funktion (Senior soll nur sehen + loeschen)
// - Reset-Scope vereinfacht: nur "alles loeschen", keine Mehrfach-Auswahl
// - Anthrazit/Gruen-Palette statt muted-foreground (Kontrast 4.5:1)
//
// API:
//   facts:        MemoryFact[]                   — vom useMemoryFacts-Hook
//   onDelete:     (id: string) => void | Promise — Eintrag-Loeschung (mit Confirm)
//   onResetAll:   () => void | Promise           — alles loeschen (mit Confirm)
//
// Nicht enthalten (bewusst):
// - onUpdate / Edit-Modus — Senior aendert keine Werte; bei Falscheintrag wird
//   geloescht und im Wizard neu erfasst.
// - Pro-Kategorie-Reset — UX-Komplexitaet zu hoch fuer Senior; bei Bedarf koennen
//   einzelne Eintraege geloescht werden.

"use client";

import { useState } from "react";
import type { MemoryFact, MemoryCategory, MemorySource } from "../types";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  profile: "Profil",
  routine: "Routinen",
  preference: "Vorlieben",
  contact: "Kontakte",
  care_need: "Alltagsbedarf",
  personal: "Persoenlich",
};

const CATEGORY_ORDER: MemoryCategory[] = [
  "profile",
  "routine",
  "preference",
  "contact",
  "care_need",
  "personal",
];

const SOURCE_LABELS: Record<MemorySource, string> = {
  self: "Selbst",
  caregiver: "Angehoeriger",
  ai_learned: "KI gelernt",
  care_team: "Pflege-Team",
};

interface SeniorMemoryFactListProps {
  facts: MemoryFact[];
  onDelete: (id: string) => void | Promise<void>;
  onResetAll: () => void | Promise<void>;
}

export function SeniorMemoryFactList({
  facts,
  onDelete,
  onResetAll,
}: SeniorMemoryFactListProps) {
  const [deleteCandidate, setDeleteCandidate] = useState<MemoryFact | null>(
    null,
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (facts.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-[#2D3142]/10 bg-white p-8 text-center">
        <p className="text-xl font-medium text-[#2D3142]">
          Noch keine Eintraege
        </p>
        <p className="mt-3 text-base text-[#2D3142]/70">
          Wenn Sie mit dem Assistenten sprechen, merkt er sich nach Ihrer
          Erlaubnis Wichtiges fuer Sie.
        </p>
      </div>
    );
  }

  // Fakten nach Kategorie gruppieren — Reihenfolge fix nach CATEGORY_ORDER
  const grouped = new Map<MemoryCategory, MemoryFact[]>();
  for (const fact of facts) {
    if (!grouped.has(fact.category)) grouped.set(fact.category, []);
    grouped.get(fact.category)!.push(fact);
  }

  async function handleConfirmDelete() {
    const candidate = deleteCandidate;
    if (!candidate) return;
    setDeleteCandidate(null);
    await onDelete(candidate.id);
  }

  async function handleConfirmResetAll() {
    setShowResetConfirm(false);
    await onResetAll();
  }

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((category) => {
        const categoryFacts = grouped.get(category);
        if (!categoryFacts || categoryFacts.length === 0) return null;
        return (
          <section key={category}>
            <h3 className="mb-3 text-lg font-semibold text-[#2D3142]">
              {CATEGORY_LABELS[category]}
            </h3>
            <ul className="space-y-3">
              {categoryFacts.map((fact) => (
                <li
                  key={fact.id}
                  className="flex items-start gap-3 rounded-2xl border-2 border-[#2D3142]/10 bg-white p-4"
                >
                  <div className="flex-1">
                    <p className="text-lg font-medium text-[#2D3142]">
                      {fact.value}
                    </p>
                    {fact.source === "caregiver" && (
                      <span className="mt-2 inline-block rounded-full bg-[#4CAF87]/15 px-3 py-1 text-sm font-semibold text-[#4CAF87]">
                        Von Angehoerigen
                      </span>
                    )}
                    <p className="mt-1 text-sm text-[#2D3142]/70">
                      {SOURCE_LABELS[fact.source]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(fact)}
                    aria-label={`${fact.value} loeschen`}
                    className="shrink-0 rounded-xl bg-[#2D3142]/5 px-4 text-base font-semibold text-[#2D3142] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                    style={{
                      minHeight: "80px",
                      minWidth: "80px",
                      touchAction: "manipulation",
                    }}
                  >
                    Loeschen
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="border-t-2 border-[#2D3142]/10 pt-6">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="w-full rounded-2xl border-2 border-[#EF4444]/40 bg-white px-6 text-lg font-semibold text-[#EF4444] hover:bg-[#EF4444]/5"
          style={{ minHeight: "80px", touchAction: "manipulation" }}
        >
          Alle Eintraege loeschen
        </button>
      </div>

      {/* Confirm: einzelnen Eintrag loeschen */}
      {deleteCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Loeschen bestaetigen"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-[#2D3142]">
              Wirklich loeschen?
            </h2>
            <p className="mt-3 text-lg text-[#2D3142]">
              {deleteCandidate.value}
            </p>
            <p className="mt-2 text-base text-[#2D3142]/70">
              Dieser Eintrag wird sofort und unwiderruflich entfernt.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="rounded-xl bg-[#EF4444] px-6 text-lg font-semibold text-white hover:bg-[#EF4444]/90"
                style={{ minHeight: "80px", touchAction: "manipulation" }}
              >
                Ja, loeschen
              </button>
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="rounded-xl bg-[#2D3142]/10 px-6 text-lg font-semibold text-[#2D3142] hover:bg-[#2D3142]/20"
                style={{ minHeight: "80px", touchAction: "manipulation" }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm: alles loeschen */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Alle Eintraege loeschen bestaetigen"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-[#2D3142]">
              Wirklich alles loeschen?
            </h2>
            <p className="mt-3 text-lg text-[#2D3142]">
              Alle {facts.length} Eintraege werden sofort und unwiderruflich
              entfernt.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void handleConfirmResetAll()}
                className="rounded-xl bg-[#EF4444] px-6 text-lg font-semibold text-white hover:bg-[#EF4444]/90"
                style={{ minHeight: "80px", touchAction: "manipulation" }}
              >
                Ja, alles loeschen
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-xl bg-[#2D3142]/10 px-6 text-lg font-semibold text-[#2D3142] hover:bg-[#2D3142]/20"
                style={{ minHeight: "80px", touchAction: "manipulation" }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
