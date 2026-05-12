import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppAquarellBackgroundProps {
  /**
   * Sichtbarkeit des Aquarell-Hintergrunds. Default 0.15 (dezent
   * sichtbar gegen den Warmwhite-Page-BG). Werte zwischen 0 und 0.25
   * empfohlen; darueber wird der Content schwerer lesbar.
   */
  opacity?: number;
  className?: string;
}

/**
 * Visual-Polish v7 Iteration 2 — Photo/Pattern-Schicht.
 *
 * Dezenter Schwarzwald-Aquarell-Hintergrund (Tanne + Haeuser + Sonne)
 * fuer die App-Shell. Liegt im hintersten z-Index (-z-10), ist decorative
 * (aria-hidden) und blockiert keine Klicks (pointer-events-none).
 *
 * Wird zentral im (app)/layout.tsx eingesetzt — bringt das Brand-Motiv
 * auf alle eingeloggten Seiten (Dashboard, Care, Quartier-Info,
 * Praevention, Org) ohne Mehraufwand pro Page.
 *
 * Brand-Asset: public/brand/quartierapp-symbol.png (Cream-BG matched
 * Warmwhite-Token, verschmilzt visuell mit Page-Background).
 */
export function AppAquarellBackground({
  opacity = 0.15,
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
          "select-none object-contain object-right-bottom sm:object-center",
          opacityClass,
        )}
      />
    </div>
  );
}
