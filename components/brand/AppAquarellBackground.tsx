import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppAquarellBackgroundProps {
  /**
   * Sichtbarkeit des Aquarell-Hintergrunds. Default 0.06 (sehr leise —
   * Founder-Feedback 2026-05-12: 0.15 war zu praesent, Headline-Schrift
   * stand im Kontrast-Konflikt mit Tanne + Sonne. 0.06 laesst das Symbol
   * als Atmosphaere durchschimmern, ohne die Schrift zu stoeren).
   */
  opacity?: number;
  className?: string;
}

/**
 * Visual-Polish v7 Iteration 2 — Aquarell-Symbol-Schicht fuer App-Shell.
 *
 * Dezenter Schwarzwald-Aquarell-Hintergrund (Tanne + Haeuser + Sonne)
 * fuer die App-Shell. Founder-Wunsch 2026-05-12: "ganz oben" → object-top,
 * Symbol wird oben am Header positioniert. Bleibt object-contain, damit
 * das Aquarell vollstaendig sichtbar bleibt (nicht beschnitten).
 *
 * Liegt im hintersten z-Index (-z-10), ist decorative (aria-hidden) und
 * blockiert keine Klicks (pointer-events-none). Wird zentral im
 * (app)/layout.tsx eingesetzt — bringt das Brand-Motiv auf alle
 * eingeloggten Seiten ohne Mehraufwand pro Page.
 *
 * Brand-Asset: public/brand/quartierapp-symbol.png. Foto
 * (hero-quartier.webp) ist explizit NICHT fuer die App-Shell — das ist
 * Landing-Page-only (Founder-Entscheidung 2026-05-12).
 */
export function AppAquarellBackground({
  opacity = 0.06,
  className,
}: AppAquarellBackgroundProps) {
  // Inline-Style fuer beliebige Opacity (Tailwind-Klasse bleibt zusaetzlich
  // im className-String fuer Tests/Snapshot-Stability).
  const opacityClass = `opacity-[${opacity}]`;
  return (
    <div
      aria-hidden="true"
      data-testid="app-bg-aquarell"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <Image
        src="/brand/quartierapp-symbol.png"
        alt=""
        fill
        sizes="100vw"
        priority={false}
        draggable={false}
        className={cn(
          "select-none object-contain object-top",
          opacityClass,
        )}
      />
    </div>
  );
}
