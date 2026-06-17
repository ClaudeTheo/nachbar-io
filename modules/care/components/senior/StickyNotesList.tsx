"use client";

// Welle SB-4 — Sticky Notes auf dem Senior-Home mit Ein-Tap-„Gesehen"-Quittung.
// Bekommt die offenen Zettel als Props (server-seitig geladen). Beim Quittieren
// POST an die Acknowledge-Route; bei Erfolg verschwindet der Zettel lokal.
// Medikamenten-Zettel bleiben einfache, selbst eingetragene Hinweise (keine
// neue Logik, Guardrails-Sprache).

import { useState } from "react";
import { Check } from "lucide-react";

export interface SeniorStickyItem {
  id: string;
  title: string;
}

export function StickyNotesList({
  stickies: initial,
}: {
  stickies: SeniorStickyItem[];
}) {
  const [stickies, setStickies] = useState<SeniorStickyItem[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function acknowledge(id: string) {
    setBusyId(id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/senior/reminders/${id}/acknowledge`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("ack failed");
      setStickies((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setErrorId(id);
    } finally {
      setBusyId(null);
    }
  }

  if (stickies.length === 0) return null;

  return (
    <section
      aria-label="Zettel von Ihrer Familie"
      data-testid="sticky-notes-list"
      className="mt-8 space-y-4"
    >
      <h2 className="text-xl font-bold text-anthrazit">Zettel von Ihrer Familie</h2>

      {stickies.map((sticky) => (
        <div
          key={sticky.id}
          data-testid="sticky-note"
          className="rounded-2xl border-2 border-alert-amber bg-alert-amber/10 p-5"
        >
          <p className="text-lg leading-snug text-anthrazit">{sticky.title}</p>

          {errorId === sticky.id ? (
            <p className="mt-2 text-base text-anthrazit/70">
              Konnte nicht bestätigt werden. Bitte tippen Sie erneut.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => acknowledge(sticky.id)}
            disabled={busyId === sticky.id}
            data-testid="sticky-ack"
            aria-label={`Zettel „${sticky.title}" als gesehen bestätigen`}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-quartier-green px-6 text-lg font-bold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40 disabled:opacity-50"
            style={{ minHeight: "80px", touchAction: "manipulation" }}
          >
            <Check className="h-7 w-7" />
            Gesehen ❤
          </button>
        </div>
      ))}
    </section>
  );
}
