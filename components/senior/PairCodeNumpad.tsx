// components/senior/PairCodeNumpad.tsx
// Vollbild-Numpad fuer 6-stelligen Pair-Code (Senior-UX: 80px-Tasten, hoher Kontrast).
// Submit wird automatisch getriggert sobald 6 Ziffern eingegeben sind.
"use client";

import { useState } from "react";

type Props = {
  onSubmit: (code: string) => void;
  onCancel: () => void;
};

const LAYOUT: readonly string[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "loeschen",
  "0",
  "abbrechen",
];

export function PairCodeNumpad({ onSubmit, onCancel }: Props) {
  const [digits, setDigits] = useState("");

  const addDigit = (d: string) => {
    if (digits.length >= 6) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 6) {
      onSubmit(next);
    }
  };

  const del = () => setDigits((s) => s.slice(0, -1));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-4xl font-semibold">Code eingeben</h1>
      <p className="text-2xl leading-relaxed">
        Tippen Sie den 6-stelligen Code ein, den Ihnen Ihr Angehöriger genannt
        hat.
      </p>
      <div
        data-testid="numpad-display"
        className="font-mono text-5xl tracking-widest"
        aria-label="Eingegebener Code"
      >
        {digits.padEnd(6, "_")}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {LAYOUT.map((label) => {
          if (label === "loeschen") {
            return (
              <button
                key="loeschen"
                type="button"
                onClick={del}
                aria-label="Loeschen"
                className="h-20 min-w-[80px] rounded-lg bg-gray-200 px-6 text-xl"
              >
                Löschen
              </button>
            );
          }
          if (label === "abbrechen") {
            return (
              <button
                key="abbrechen"
                type="button"
                onClick={onCancel}
                aria-label="Abbrechen"
                className="h-20 min-w-[80px] rounded-lg bg-gray-200 px-6 text-xl"
              >
                Abbrechen
              </button>
            );
          }
          return (
            <button
              key={label}
              type="button"
              onClick={() => addDigit(label)}
              aria-label={label}
              className="h-20 w-20 rounded-lg bg-anthrazit text-3xl text-white"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
