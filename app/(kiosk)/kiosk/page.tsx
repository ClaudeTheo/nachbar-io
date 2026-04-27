"use client";

import Link from "next/link";
import KioskHeader from "./components/KioskHeader";
import KioskTile from "./components/KioskTile";

/** Kiosk-Dashboard: 4x2 Kachel-Grid mit SOS-Footer */
const TILES = [
  { icon: "\uD83D\uDCFB", label: "Radio", href: "/kiosk/radio", accent: "cyan" },
  { icon: "\uD83D\uDCF0", label: "Nachrichten", href: "/kiosk/news", accent: "blue" },
  { icon: "\uD83D\uDC8A", label: "Gesundheit", href: "/kiosk/health", accent: "green" },
  { icon: "\uD83E\uDD16", label: "KI-Begleiter", href: "/kiosk/companion", accent: "purple" },
  { icon: "📹", label: "Sprechstunde", href: "/kiosk/sprechstunde", accent: "purple" },
  { icon: "\uD83C\uDFAE", label: "Spiele", href: "/kiosk/games", accent: "orange" },
  { icon: "\uD83E\uDD1D", label: "Treffpunkt", href: "/kiosk/meetup", accent: "pink" },
  { icon: "\uD83D\uDCCB", label: "Schwarzes Brett", href: "/kiosk/board", accent: "teal" },
  { icon: "\uD83C\uDFE5", label: "Pflege-Ratgeber", href: "/kiosk/care-guide", accent: "blue" },
] as const;

export default function KioskDashboard() {
  return (
    <>
      <KioskHeader />

      <section className="kiosk-parked-banner" aria-label="Kiosk-Bereich geparkt">
        <strong>Kiosk-Bereich geparkt</strong>
        <span>
          Dieser alte Web-Kiosk wird im aktuellen Pilot nicht genutzt. Die normale Nachbar.io-App bleibt der Fokus.
        </span>
      </section>

      <div className="kiosk-grid">
        {TILES.map((tile) => (
          <KioskTile
            key={tile.href}
            icon={tile.icon}
            label={tile.label}
            href={tile.href}
            accent={tile.accent}
          />
        ))}
      </div>

      {/* SOS-Footer: immer sichtbar am unteren Rand */}
      <footer className="kiosk-footer">
        <Link href="/kiosk/emergency" className="kiosk-sos-button">
          🆘 Notruf / SOS
        </Link>
      </footer>
    </>
  );
}
