"use client";

// Welle SP1-3 — Tagesrätsel (failure-free Denkpause).
// `fragen` ist bereits die Tagesauswahl (Server berechnet sie via
// getDailyQuestions, damit es keine Hydration-Diskrepanz gibt). Reine UI,
// KEINE Persistenz: nichts wird gespeichert oder ausgewertet (Founder-Regel,
// Art.-9-Schutz). Im failure-free-Modus (Senioren) gibt es keine Rot-/Falsch-
// Markierung — jede Antwort öffnet nur die Geschichte; kein Score.

import { useState } from "react";
import type { TagesraetselFrage } from "@/modules/spiele/services/tagesraetsel.service";

type OptionState = "idle" | "best" | "wrong" | "neutral" | "dim";

function optionStyle(failureFree: boolean): React.CSSProperties {
  return {
    minHeight: failureFree ? "80px" : "64px",
    touchAction: "manipulation",
  };
}

function optionClass(state: OptionState): string {
  const base =
    "flex w-full items-center justify-center rounded-2xl border-2 px-5 py-3 text-center text-lg font-semibold transition-colors";
  switch (state) {
    case "best":
      return `${base} border-quartier-green bg-quartier-green/15 text-anthrazit`;
    case "wrong":
      return `${base} border-red-500 bg-red-500/10 text-anthrazit`;
    case "dim":
      return `${base} border-anthrazit/15 bg-white text-anthrazit/50`;
    case "neutral":
      return `${base} border-anthrazit/20 bg-white text-anthrazit`;
    default:
      return `${base} border-anthrazit/30 bg-white text-anthrazit hover:border-quartier-green/60`;
  }
}

export function Tagesraetsel({
  fragen,
  failureFree = false,
}: {
  fragen: TagesraetselFrage[];
  failureFree?: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (fragen.length === 0) {
    return (
      <p className="text-center text-lg text-anthrazit">
        Heute gibt es kein Rätsel — schauen Sie morgen wieder vorbei.
      </p>
    );
  }

  const frage = fragen[current];
  const answered = selected !== null;

  function choose(index: number) {
    if (answered) return;
    setSelected(index);
    if (!failureFree && index === frage.answer) {
      setScore((s) => s + 1);
    }
  }

  function next() {
    if (current + 1 >= fragen.length) {
      setFinished(true);
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
  }

  function stateFor(index: number): OptionState {
    if (!answered) return "idle";
    const isBest = index === frage.answer;
    if (failureFree) {
      // failure-free: nur die beste Antwort sanft hervorheben, NIE etwas als falsch markieren
      return isBest ? "best" : "neutral";
    }
    if (isBest) return "best";
    if (index === selected) return "wrong";
    return "dim";
  }

  if (finished) {
    return (
      <section
        aria-label="Tagesrätsel beendet"
        data-testid="raetsel-finished"
        className="rounded-2xl border-2 border-anthrazit/15 bg-white p-6 text-center"
      >
        {failureFree ? (
          <p className="text-xl font-semibold text-anthrazit">
            Schön gespielt! Bis morgen gibt es ein neues Rätsel.
          </p>
        ) : (
          <p className="text-xl font-semibold text-anthrazit">
            {score} von {fragen.length} richtig — gut gemacht!
          </p>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Tagesrätsel" data-testid="tagesraetsel">
      <p className="mb-2 text-base text-anthrazit/70">
        Frage {current + 1} von {fragen.length}
      </p>
      <h2 className="mb-5 text-2xl font-bold leading-snug text-anthrazit">
        {frage.q}
      </h2>

      <div className="flex flex-col gap-3">
        {frage.options.map((option, index) => {
          const state = stateFor(index);
          return (
            <button
              key={index}
              type="button"
              data-testid="raetsel-option"
              data-state={state}
              onClick={() => choose(index)}
              disabled={answered}
              className={optionClass(state)}
              style={optionStyle(failureFree)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div
          data-testid="raetsel-story"
          className="mt-5 rounded-2xl border-2 border-quartier-green/30 bg-quartier-green/5 p-5"
        >
          <p className="text-lg leading-snug text-anthrazit">
            {failureFree ? "Interessant! " : ""}
            {frage.story}
          </p>
          <button
            type="button"
            data-testid="raetsel-next"
            onClick={next}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-quartier-green px-6 text-lg font-bold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
            style={{ minHeight: "80px", touchAction: "manipulation" }}
          >
            {current + 1 >= fragen.length ? "Fertig" : "Weiter"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
