"use client";

// Kiosk-Spiel „Paare finden" — nutzt seit SP2-1 die geteilte Komponente
// modules/spiele/components/PaareFinden (eine Quelle/DRY). Kiosk-Modus:
// Zug-Zaehler an (showMoves) + Kiosk-CSS-Klassen fuers Karten-Aussehen.

import Link from "next/link";
import { PaareFinden } from "@/modules/spiele/components/PaareFinden";
import { buildEmojiPaare } from "@/modules/spiele/services/paare-board";

const PAARE = buildEmojiPaare();

export default function PairsGamePage() {
  return (
    <div style={{ padding: "20px 28px" }}>
      <Link href="/kiosk/games" className="kiosk-back">
        &larr; Zurück
      </Link>

      <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 20px" }}>
        🧩 Paare finden
      </h1>

      <PaareFinden
        paare={PAARE}
        columns={4}
        showMoves
        maxWidth={500}
        cardClassName={(state) => `kiosk-pairs-card ${state}`}
      />
    </div>
  );
}
