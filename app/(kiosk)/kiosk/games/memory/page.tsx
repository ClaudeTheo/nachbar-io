"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";

const EMOJIS = ["🌻", "🏠", "☀️", "🐱", "🎵", "🍰", "⭐", "❤️"];

/** Fisher-Yates Shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Memory-Spiel: 4x4 Karten mit 8 Emoji-Paaren */
export default function MemoryGamePage() {
  const [cards, setCards] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  // Karten beim Mount mischen
  useEffect(() => {
    setCards(shuffle([...EMOJIS, ...EMOJIS]));
  }, []);

  const won = matched.size === cards.length && cards.length > 0;

  const resetGame = useCallback(() => {
    setCards(shuffle([...EMOJIS, ...EMOJIS]));
    setRevealed([]);
    setMatched(new Set());
    setMoves(0);
    setLocked(false);
  }, []);

  const handleClick = useCallback(
    (index: number) => {
      // Klick ignorieren wenn gesperrt, bereits aufgedeckt oder bereits gefunden
      if (locked || revealed.includes(index) || matched.has(index)) return;

      const next = [...revealed, index];
      setRevealed(next);

      if (next.length === 2) {
        setMoves((m) => m + 1);
        setLocked(true);

        const [a, b] = next;
        if (cards[a] === cards[b]) {
          // Treffer
          setMatched((prev) => {
            const s = new Set(prev);
            s.add(a);
            s.add(b);
            return s;
          });
          setRevealed([]);
          setLocked(false);
        } else {
          // Kein Treffer — nach 1s zurückdrehen
          setTimeout(() => {
            setRevealed([]);
            setLocked(false);
          }, 1000);
        }
      }
    },
    [revealed, matched, locked, cards]
  );

  const getCardClass = (index: number) => {
    if (matched.has(index)) return "kiosk-memory-card matched";
    if (revealed.includes(index)) return "kiosk-memory-card revealed";
    return "kiosk-memory-card hidden";
  };

  return (
    <div style={{ padding: "20px 28px" }}>
      <Link href="/kiosk/games" className="kiosk-back">
        &larr; Zurück
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          margin: "24px 0 20px",
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 700 }}>🧠 Memory</h1>
        <span style={{ fontSize: 18, color: "#6b7280" }}>
          {moves} {moves === 1 ? "Zug" : "Züge"}
        </span>
      </div>

      {won ? (
        <div
          className="kiosk-card"
          style={{ textAlign: "center", padding: "48px 24px" }}
        >
          <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
            🎉 Geschafft! {moves} Züge
          </p>
          <button
            onClick={resetGame}
            className="kiosk-chip"
            style={{ fontSize: 20, padding: "16px 32px", minHeight: 80 }}
          >
            Nochmal spielen
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            maxWidth: 500,
          }}
        >
          {cards.map((emoji, i) => (
            <button
              key={i}
              className={getCardClass(i)}
              onClick={() => handleClick(i)}
              aria-label={
                matched.has(i) || revealed.includes(i)
                  ? emoji
                  : "Verdeckte Karte"
              }
            >
              {matched.has(i) || revealed.includes(i) ? emoji : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
