// modules/memory/components/CaregiverGedaechtnisClient.tsx
// Welle C C8 — Caregiver-UI fuer das Senior-Gedaechtnis (Architektur 1b+2a+3a).
//
// Scope:
// - Liest alle Memory-Fakten des verlinkten Seniors via subjectUserId
// - Eigene Caregiver-Eintraege sind durch ein "Von Ihnen"-Badge markiert
// - Formular erlaubt das Hinzufuegen neuer Fakten (targetUserId = Senior)
// - Kein Loesch-UI fuer den Caregiver (Senior loescht selbst in /profil/gedaechtnis)
//
// Provenance: POST /api/memory/facts setzt bei targetUserId !== user.id
// automatisch source='caregiver' + source_user_id=user.id, sodass der
// Senior die Eintraege spaeter mit Badge "von <Caregiver-Name>" sieht.

"use client";

import { useState } from "react";
import { useMemoryFacts } from "@/modules/memory/hooks/useMemoryFacts";
import type { MemoryFact, MemoryCategory } from "@/modules/memory/types";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  profile: "Profil",
  routine: "Routinen",
  preference: "Vorlieben",
  contact: "Kontakte",
  care_need: "Alltagsbedarf",
  personal: "Persoenlich",
};

interface Props {
  seniorId: string;
  seniorName: string;
  currentUserId: string;
}

export function CaregiverGedaechtnisClient({
  seniorId,
  seniorName,
  currentUserId,
}: Props) {
  const { facts, loading, reload } = useMemoryFacts({
    subjectUserId: seniorId,
  });
  const [category, setCategory] = useState<MemoryCategory>("profile");
  const [factKey, setFactKey] = useState("");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!factKey.trim() || !value.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/memory/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          key: factKey.trim(),
          value: value.trim(),
          targetUserId: seniorId,
        }),
      });

      if (!res.ok) {
        let body: { error?: string } = {};
        try {
          body = await res.json();
        } catch {
          // noop
        }
        if (body.error === "no_caregiver_link") {
          setError(
            "Keine Berechtigung fuer diesen Senior. Die Verbindung wurde moeglicherweise widerrufen.",
          );
        } else if (body.error === "no_consent") {
          setError(
            `${seniorName} hat die Einwilligung fuer diese Kategorie nicht erteilt.`,
          );
        } else if (body.error === "medical_blocked") {
          setError(
            "Der Text enthaelt medizinische Begriffe. Bitte umformulieren.",
          );
        } else {
          setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
        }
        return;
      }

      setFactKey("");
      setValue("");
      reload();
    } catch {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold text-[#2D3142]">
          Gedaechtnis fuer {seniorName}
        </h1>
        <p className="mt-3 text-base text-[#2D3142]">
          Hier koennen Sie festhalten, was der Assistent ueber {seniorName}
          wissen soll. {seniorName} sieht alle Eintraege und kann sie jederzeit
          loeschen.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border-2 border-[#2D3142]/10 bg-white p-4"
      >
        <div>
          <label
            htmlFor="cg-category"
            className="block text-sm font-medium text-[#2D3142]"
          >
            Kategorie
          </label>
          <select
            id="cg-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as MemoryCategory)}
            className="mt-1 w-full rounded-xl border-2 border-[#2D3142]/10 bg-white px-3 py-3 text-base"
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="cg-key"
            className="block text-sm font-medium text-[#2D3142]"
          >
            Stichwort
          </label>
          <input
            id="cg-key"
            type="text"
            value={factKey}
            onChange={(e) => setFactKey(e.target.value)}
            placeholder="z.B. lieblingsessen"
            className="mt-1 w-full rounded-xl border-2 border-[#2D3142]/10 px-3 py-3 text-base"
          />
        </div>

        <div>
          <label
            htmlFor="cg-value"
            className="block text-sm font-medium text-[#2D3142]"
          >
            Information
          </label>
          <input
            id="cg-value"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="z.B. Apfelstrudel mit Sahne"
            className="mt-1 w-full rounded-xl border-2 border-[#2D3142]/10 px-3 py-3 text-base"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-[#EF4444]/10 p-3 text-sm text-[#EF4444]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !factKey.trim() || !value.trim()}
          className="w-full rounded-xl bg-[#4CAF87] px-6 py-3 text-lg font-semibold text-white disabled:opacity-50"
          style={{ minHeight: "56px", touchAction: "manipulation" }}
        >
          {submitting ? "Wird gespeichert ..." : "Speichern"}
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[#2D3142]">
          Gespeicherte Eintraege ({facts.length})
        </h2>
        {loading && facts.length === 0 ? (
          <p className="text-sm text-[#2D3142]/60">Wird geladen ...</p>
        ) : facts.length === 0 ? (
          <p className="rounded-2xl border-2 border-[#2D3142]/10 bg-white p-6 text-center text-base text-[#2D3142]/70">
            Noch keine Eintraege.
          </p>
        ) : (
          <ul className="space-y-3">
            {facts.map((fact) => (
              <FactRow
                key={fact.id}
                fact={fact}
                isOwn={fact.source_user_id === currentUserId}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FactRow({ fact, isOwn }: { fact: MemoryFact; isOwn: boolean }) {
  return (
    <li className="rounded-2xl border-2 border-[#2D3142]/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-base font-medium text-[#2D3142]">{fact.value}</p>
          <p className="mt-1 text-xs text-[#2D3142]/60">
            {CATEGORY_LABELS[fact.category]} &middot; {fact.key}
          </p>
        </div>
        {isOwn && (
          <span className="shrink-0 rounded-full bg-[#4CAF87]/15 px-3 py-1 text-xs font-semibold text-[#4CAF87]">
            Von Ihnen
          </span>
        )}
      </div>
    </li>
  );
}
