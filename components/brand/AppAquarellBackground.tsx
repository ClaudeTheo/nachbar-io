import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppAquarellBackgroundProps {
  /**
   * Sichtbarkeit des Quartier-Hintergrunds. Default 0.10 (sehr dezent —
   * Foto ist intensiver als das Aquarell-Logo, deshalb staerker
   * zurueckgenommen). Werte zwischen 0 und 0.18 empfohlen.
   */
  opacity?: number;
  className?: string;
}

/**
 * Visual-Polish v7 Iteration 2 — Photo/Pattern-Schicht (Folgewelle 2026-05-12).
 *
 * Dezenter Quartier-Hintergrund (Stadt + Bäume + Nachbarinnen) fuer die
 * App-Shell. Founder-Wunsch: "ganz oben" → object-top, damit die
 * Stadt-Silhouette und der Baumkronen-Bereich sichtbar bleiben und nicht
 * unten oder seitlich abgeschnitten werden.
 *
 * Liegt im hintersten z-Index (-z-10), ist decorative (aria-hidden) und
 * blockiert keine Klicks (pointer-events-none). Wird zentral im
 * (app)/layout.tsx eingesetzt — bringt das Quartier-Motiv auf alle
 * eingeloggten Seiten ohne Mehraufwand pro Page.
 *
 * Asset: public/images/hero-quartier.webp (komprimierte Marketing-Hero-
 * Aufnahme aus Pre-Closed-Pilot-Welle; jetzt als atmosphaerischer
 * BG-Layer wiederverwendet).
 */
export function AppAquarellBackground({
  opacity = 0.1,
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
        src="/images/hero-quartier.webp"
        alt=""
        fill
        sizes="100vw"
        priority={false}
        draggable={false}
        className={cn(
          "select-none object-cover object-top",
          opacityClass,
        )}
      />
    </div>
  );
}
