"use client";

import Link from "next/link";

/** Spiele-Menue: Auswahl zwischen Memory und Tagesquiz */
export default function GamesMenuPage() {
  return (
    <div style={{ padding: "20px 28px" }}>
      <Link href="/kiosk" className="kiosk-back">
        &larr; Zurück
      </Link>

      <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 20px" }}>
        🎮 Spiele
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Link href="/kiosk/games/memory" className="kiosk-tile" data-accent="green">
          <span className="kiosk-tile-icon">🧠</span>
          <span className="kiosk-tile-label">Memory</span>
        </Link>

        <Link href="/kiosk/games/quiz" className="kiosk-tile" data-accent="orange">
          <span className="kiosk-tile-icon">❓</span>
          <span className="kiosk-tile-label">Tagesquiz</span>
        </Link>
      </div>
    </div>
  );
}
