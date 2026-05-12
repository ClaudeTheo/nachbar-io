import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MagazineHeaderProps {
  /**
   * Kontext-Zeile ueber dem Titel im Magazin-Stil. Wird in UPPERCASE
   * dargestellt mit tracking-[0.08em]. Pattern: "AERZTE · BAD SAECKINGEN".
   */
  eyebrow: ReactNode;
  /**
   * Hauptueberschrift (h1). 36 px / 600 / leading-[1.15] / -0.02em tracking.
   */
  title: ReactNode;
  /**
   * Optionaler Untertitel unter dem Titel (text-anthrazit-light, kein
   * tracking). Beispiel: "Im Umkreis von 20 km".
   */
  subtitle?: ReactNode;
  /**
   * Optionaler Zurueck-Link links neben dem Header. Wenn nicht gesetzt,
   * wird kein Link gerendert.
   */
  backHref?: string;
  /** Aria-Label fuer den Zurueck-Link (Standard "Zurueck"). */
  backLabel?: string;
  /** Optionale Aktions-Elemente rechts (z.B. Filter-Toggle, Plus-Button). */
  actions?: ReactNode;
  /** Zusaetzliche CSS-Klassen am aeusseren Container. */
  className?: string;
}

/**
 * Visual-Polish v7 — Magazin-Hero fuer App-Pages.
 *
 * Wiederverwendbares Hero-Pattern im Dashboard-Stil: Eyebrow (accent-dot
 * + UPPERCASE + tracking-[0.08em]) + H1 (36 px / 600 / -0.02em) +
 * optionaler Subtitle + optionaler Back-Link. Brand-Tokens ueberall,
 * keine hartcodierten Hex.
 *
 * Anwendung: ersetzt das alte PageHeader-Pattern auf Pages, die das
 * Visual-Polish-v7-Look bekommen sollen (Dashboard, Care, City-Services,
 * Quartier-Info). PageHeader bleibt fuer Pages mit altem Look erhalten,
 * bis sie umgestellt werden.
 */
export function MagazineHeader({
  eyebrow,
  title,
  subtitle,
  backHref,
  backLabel = "Zurueck",
  actions,
  className,
}: MagazineHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-anthrazit-light">
            {backHref ? (
              <Link
                href={backHref}
                aria-label={backLabel}
                className="inline-flex items-center rounded-md p-1 -m-1 transition-colors hover:bg-anthrazit-tint"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span
                data-testid="magazine-eyebrow-dot"
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-quartier-green"
              />
            )}
            {/* Wenn ein Back-Link gerendert wird, kommt der Accent-Dot
                trotzdem direkt vor dem Text (visuelle Konsistenz mit
                Dashboard-Pattern). */}
            {backHref && (
              <span
                data-testid="magazine-eyebrow-dot"
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-quartier-green"
              />
            )}
            <span>{eyebrow}</span>
          </p>
          <h1 className="mt-1 text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-anthrazit">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-anthrazit-light">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
