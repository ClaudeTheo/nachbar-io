// Nachbar.io — Gemeinsamer Seitenkopf mit Zurueck-Button
// Ersetzt das duplizierte Pattern: ArrowLeft + h1 + optionale Actions
import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Seitentitel (h1) */
  title: React.ReactNode;
  /** Zurueck-Link Ziel (z.B. "/dashboard") */
  backHref: string;
  /** Aria-Label fuer Zurueck-Button (Standard: "Zurück") */
  backLabel?: string;
  /** Optionale Aktions-Elemente rechts (z.B. Plus-Button) */
  actions?: React.ReactNode;
  /** Zusaetzliche CSS-Klassen fuer den aeusseren Container */
  className?: string;
}

/**
 * Einheitlicher Seitenkopf mit Zurueck-Pfeil, Titel und optionalen Actions.
 *
 * Beispiel:
 * ```tsx
 * <PageHeader title="Mängelmelder" backHref="/dashboard" actions={<PlusButton />} />
 * ```
 */
export function PageHeader({
  title,
  backHref,
  backLabel = "Zurück",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="rounded-lg p-2 hover:bg-muted"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
