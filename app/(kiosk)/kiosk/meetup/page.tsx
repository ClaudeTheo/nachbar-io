"use client";

import Link from "next/link";
import { useState } from "react";

interface Activity {
  emoji: string;
  title: string;
  wann: string;
  wo: string;
  teilnehmer: number;
}

const ACTIVITIES: Activity[] = [
  { emoji: "☕", title: "Kaffeerunde", wann: "Jeden Dienstag, 15:00 Uhr", wo: "Quartierstreff", teilnehmer: 4 },
  { emoji: "🚶", title: "Spaziergruppe", wann: "Montag & Donnerstag, 10:00 Uhr", wo: "Treffpunkt Brunnen", teilnehmer: 6 },
  { emoji: "🃏", title: "Spielenachmittag", wann: "Jeden Mittwoch, 14:00 Uhr", wo: "Gemeinschaftsraum", teilnehmer: 8 },
  { emoji: "📖", title: "Vorlesekreis", wann: "Freitag, 16:00 Uhr", wo: "Quartierstreff", teilnehmer: 3 },
  { emoji: "🌿", title: "Garten-AG", wann: "Samstag, 9:00 Uhr", wo: "Gemeinschaftsgarten", teilnehmer: 5 },
  { emoji: "🎨", title: "Malkurs", wann: "Donnerstag, 14:00 Uhr", wo: "Quartierstreff", teilnehmer: 7 },
];

/** Treffpunkt / Kontaktbörse: Gemeinsame Aktivitäten im Quartier */
export default function MeetupPage() {
  const [joined, setJoined] = useState<Set<number>>(new Set());

  const handleJoin = (index: number) => {
    setJoined((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div style={{ padding: "20px 28px" }}>
      <Link href="/kiosk" className="kiosk-back">
        &larr; Zurück
      </Link>

      <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 4px" }}>
        🤝 Treffpunkt — Gemeinsam aktiv
      </h1>
      <p
        style={{
          fontSize: 18,
          color: "#6b7280",
          marginBottom: 20,
        }}
      >
        Finden Sie Nachbarn für gemeinsame Aktivitäten
      </p>

      <div
        className="kiosk-scroll"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: "calc(100vh - 260px)",
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {ACTIVITIES.map((act, i) => (
          <div key={i} className="kiosk-card kiosk-activity-card">
            {/* Emoji-Bereich */}
            <div
              style={{
                fontSize: 40,
                lineHeight: 1,
                flexShrink: 0,
                width: 56,
                textAlign: "center",
              }}
            >
              {act.emoji}
            </div>

            {/* Info-Bereich */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                {act.title}
              </p>
              <p style={{ fontSize: 16, color: "#4b5563" }}>
                📅 {act.wann}
              </p>
              <p style={{ fontSize: 16, color: "#4b5563" }}>
                📍 {act.wo}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <span className="kiosk-activity-badge">
                  👥 {joined.has(i) ? act.teilnehmer + 1 : act.teilnehmer} Teilnehmer
                </span>
                <button
                  onClick={() => handleJoin(i)}
                  className="kiosk-chip"
                  style={{
                    fontSize: 16,
                    padding: "12px 20px",
                    minHeight: 56,
                    background: joined.has(i)
                      ? "rgba(76,175,135,0.2)"
                      : undefined,
                    borderColor: joined.has(i)
                      ? "rgba(76,175,135,0.4)"
                      : undefined,
                  }}
                >
                  {joined.has(i) ? "✓ Angemeldet" : "Ich möchte teilnehmen"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Eigene Aktivität vorschlagen */}
        <button
          className="kiosk-card"
          style={{
            width: "100%",
            textAlign: "center",
            fontSize: 20,
            fontWeight: 600,
            padding: "24px",
            minHeight: 80,
            cursor: "pointer",
            color: "#2d3142",
            border: "1px dashed #e8ede3",
          }}
        >
          ➕ Eigene Aktivität vorschlagen
        </button>
      </div>
    </div>
  );
}
