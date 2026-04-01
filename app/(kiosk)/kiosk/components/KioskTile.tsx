"use client";

import Link from "next/link";

interface KioskTileProps {
  /** Emoji-Symbol für die Kachel */
  icon: string;
  /** Beschriftung unter dem Icon */
  label: string;
  /** Ziel-URL */
  href: string;
  /** Akzentfarbe (CSS-Klassenname: green, blue, orange, purple, pink, cyan, red, teal) */
  accent: string;
}

/** Wiederverwendbare Kachel für das Kiosk-Dashboard-Grid */
export default function KioskTile({ icon, label, href, accent }: KioskTileProps) {
  return (
    <Link href={href} className="kiosk-tile" data-accent={accent}>
      <span className="kiosk-tile-icon">{icon}</span>
      <span className="kiosk-tile-label">{label}</span>
    </Link>
  );
}
