"use client";

// Welle SP2-1 — geteiltes „Paare finden".
// Karten-Flip + Paar-Logik (aus dem Kiosk-Spiel extrahiert, eine Quelle/DRY).
// Senior-Default: keine Zug-Anzeige, Abschluss OHNE Leistungs-Feedback
// („Schön gespielt!" statt Zug-Bilanz), Karten >=80px. Kiosk-Modus (showMoves):
// Zug-Zaehler + Zug-Bilanz wie bisher, Karten via uebergebene CSS-Klasse.
// Reine UI, keine Persistenz, keine Auswertung (Founder-Regel: Spiele ohne
// Ergebnis-Speicherung).

import { useCallback, useState } from "react";
import type { PaarItem } from "@/modules/spiele/services/paare-board";

type CardState = "hidden" | "revealed" | "matched";

interface Card {
  /** stabiler Key pro Karte (zwei Karten je Paar) */
  key: string;
  item: PaarItem;
}

/** Fisher-Yates Shuffle (Spiel-Mischung, Random ist hier gewollt). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards(paare: PaarItem[]): Card[] {
  return shuffle(
    paare.flatMap((item) => [
      { key: `${item.id}-0`, item },
      { key: `${item.id}-1`, item },
    ]),
  );
}

export function PaareFinden({
  paare,
  columns = 4,
  showMoves = false,
  maxWidth = 560,
  cardClassName,
}: {
  paare: PaarItem[];
  columns?: number;
  /** Kiosk: true (Zug-Zaehler + Bilanz). Senior: false (Default, kein Feedback). */
  showMoves?: boolean;
  maxWidth?: number;
  /** Kiosk reicht seine CSS-Klassen rein; ohne -> Senior-Default-Styling. */
  cardClassName?: (state: CardState) => string;
}) {
  const [cards, setCards] = useState<Card[]>(() => buildCards(paare));
  const [revealed, setRevealed] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const won = cards.length > 0 && matched.size === cards.length;

  const resetGame = useCallback(() => {
    setCards(buildCards(paare));
    setRevealed([]);
    setMatched(new Set());
    setMoves(0);
    setLocked(false);
  }, [paare]);

  const handleClick = useCallback(
    (index: number) => {
      if (locked || revealed.includes(index) || matched.has(index)) return;

      const next = [...revealed, index];
      setRevealed(next);

      if (next.length === 2) {
        setMoves((m) => m + 1);
        setLocked(true);
        const [a, b] = next;
        if (cards[a].item.id === cards[b].item.id) {
          // Treffer
          setMatched((prev) => new Set(prev).add(a).add(b));
          setRevealed([]);
          setLocked(false);
        } else {
          // Kein Treffer — kurz zeigen, dann zurueckdrehen
          setTimeout(() => {
            setRevealed([]);
            setLocked(false);
          }, 1000);
        }
      }
    },
    [revealed, matched, locked, cards],
  );

  function stateFor(index: number): CardState {
    if (matched.has(index)) return "matched";
    if (revealed.includes(index)) return "revealed";
    return "hidden";
  }

  if (won) {
    return (
      <section
        aria-label="Paare finden beendet"
        data-testid="paare-finished"
        className="rounded-2xl border-2 border-anthrazit/15 bg-white p-6 text-center"
      >
        <p className="mb-4 text-xl font-semibold text-anthrazit">
          {showMoves ? `Geschafft! ${moves} Züge` : "Schön gespielt!"}
        </p>
        <button
          type="button"
          data-testid="paare-reset"
          onClick={resetGame}
          className="inline-flex items-center justify-center rounded-2xl bg-quartier-green px-6 text-lg font-bold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
          style={{ minHeight: "80px", touchAction: "manipulation" }}
        >
          Nochmal spielen
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Paare finden" data-testid="paare-finden">
      {showMoves ? (
        <p className="mb-3 text-base text-anthrazit/70">
          {moves} {moves === 1 ? "Zug" : "Züge"}
        </p>
      ) : null}

      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 12,
          maxWidth,
        }}
      >
        {cards.map((card, index) => {
          const state = stateFor(index);
          const faceUp = state !== "hidden";
          const label = faceUp
            ? (card.item.alt ?? card.item.emoji ?? "Karte")
            : "Verdeckte Karte";
          return (
            <button
              key={card.key}
              type="button"
              data-testid="paar-card"
              data-id={card.item.id}
              data-state={state}
              onClick={() => handleClick(index)}
              disabled={faceUp}
              aria-label={label}
              className={
                cardClassName
                  ? cardClassName(state)
                  : seniorCardClass(state)
              }
              style={
                cardClassName
                  ? undefined
                  : {
                      minHeight: "80px",
                      aspectRatio: "1",
                      fontSize: "2rem",
                      touchAction: "manipulation",
                    }
              }
            >
              {faceUp ? (
                card.item.imageUrl ? (
                  // Signed-URL ist dynamisch -> klassisches img statt next/image
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.item.imageUrl}
                    alt={card.item.alt ?? ""}
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  card.item.emoji
                )
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Senior-Default-Styling (ohne Kiosk-CSS): ruhig, kontraststark, grosse Ziele. */
function seniorCardClass(state: CardState): string {
  const base =
    "flex items-center justify-center overflow-hidden rounded-2xl border-2 p-1 transition-colors";
  switch (state) {
    case "matched":
      return `${base} border-quartier-green bg-quartier-green/10`;
    case "revealed":
      return `${base} border-quartier-green bg-quartier-green/5`;
    default:
      return `${base} border-anthrazit/25 bg-white text-2xl text-anthrazit/50 hover:border-quartier-green/60`;
  }
}
