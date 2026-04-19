// app/(senior)/profil/gedaechtnis/page.tsx
// Welle C C7 — Senior-Memory-Uebersicht (DSGVO Art. 15 + 17).
//
// Komposition aus useMemoryFacts (Hook bleibt single-source-of-truth) +
// SeniorMemoryFactList (C7-step-1) + Senior-Mode-Consent-Toggles.
//
// Consent-Toggle-Design (Senior-Mode): grosse Buttons mit lesbarem
// Text-Status statt shadcn-Switch — bessere Touch-Target-Groesse, klarere
// Wahrnehmung fuer aeltere Augen.
//
// DSGVO-Pflichten erfuellt:
// - Art. 15 Auskunft: alle gespeicherten Fakten sichtbar
// - Art. 17 Loeschung: Einzel- + Sammel-Loeschung mit Confirm
// - Art. 7 (3) Widerruf: Consent-Toggles jederzeit umstellbar

"use client";

import { useMemoryFacts } from "@/modules/memory/hooks/useMemoryFacts";
import { SeniorMemoryFactList } from "@/modules/memory/components/SeniorMemoryFactList";
import type { MemoryConsentType } from "@/modules/memory/types";

const CONSENT_OPTIONS: Array<{
  type: MemoryConsentType;
  label: string;
  description: string;
}> = [
  {
    type: "memory_basis",
    label: "Profil und Routinen",
    description: "Name, Geburtstag, Vorlieben, Kontakte",
  },
  {
    type: "memory_care",
    label: "Alltagsbedarf",
    description: "Was Sie im Alltag brauchen",
  },
  {
    type: "memory_personal",
    label: "Private Notizen",
    description: "Persoenliche Eintraege, verschluesselt",
  },
];

export default function GedaechtnisPage() {
  const { facts, consents, loading, deleteFact, resetFacts, reload } =
    useMemoryFacts();

  async function toggleConsent(type: MemoryConsentType, granted: boolean) {
    const endpoint = granted
      ? "/api/memory/consent/revoke"
      : "/api/memory/consent/grant";
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent_type: type }),
    });
    reload();
  }

  if (loading) {
    return (
      <div className="px-4 py-6 text-center text-lg text-[#2D3142]">
        Wird geladen ...
      </div>
    );
  }

  const consentMap = new Map(
    consents.map((c) => [c.consent_type, c.granted && !c.revoked_at]),
  );

  return (
    <div className="mx-auto max-w-md space-y-8 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold text-[#2D3142]">Mein Gedaechtnis</h1>
        <p className="mt-3 text-base text-[#2D3142]">
          Hier sehen Sie, was sich der KI-Assistent ueber Sie merkt. Jeden
          Eintrag koennen Sie jederzeit loeschen.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#2D3142]">
          Was darf der Assistent merken?
        </h2>
        {CONSENT_OPTIONS.map(({ type, label, description }) => {
          const granted = consentMap.get(type) ?? false;
          return (
            <button
              key={type}
              type="button"
              onClick={() => void toggleConsent(type, granted)}
              aria-label={`${label} — ${granted ? "eingeschaltet" : "ausgeschaltet"}`}
              aria-pressed={granted}
              className={
                granted
                  ? "flex w-full items-center justify-between rounded-2xl border-2 border-[#4CAF87] bg-[#4CAF87]/10 p-4 text-left"
                  : "flex w-full items-center justify-between rounded-2xl border-2 border-[#2D3142]/10 bg-white p-4 text-left"
              }
              style={{ minHeight: "80px", touchAction: "manipulation" }}
            >
              <span>
                <span className="block text-lg font-medium text-[#2D3142]">
                  {label}
                </span>
                <span className="mt-1 block text-sm text-[#2D3142]/70">
                  {description}
                </span>
              </span>
              <span
                className={
                  granted
                    ? "shrink-0 rounded-xl bg-[#4CAF87] px-4 py-2 text-base font-semibold text-white"
                    : "shrink-0 rounded-xl bg-[#2D3142]/10 px-4 py-2 text-base font-semibold text-[#2D3142]"
                }
              >
                {granted ? "Eingeschaltet" : "Ausgeschaltet"}
              </span>
            </button>
          );
        })}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#2D3142]">
          Gespeicherte Eintraege
        </h2>
        <SeniorMemoryFactList
          facts={facts}
          onDelete={deleteFact}
          onResetAll={() => resetFacts("all")}
        />
      </section>

      <footer className="pt-2 text-center text-sm text-[#2D3142]/70">
        {facts.length} von 70 Eintraegen belegt
      </footer>
    </div>
  );
}
