// Nachbar.io — Benannte Sektion mit optionalem Titel
// Ersetzt wiederholte div + space-y Wrapper mit optionaler Ueberschrift
import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  /** Optionaler Sektionstitel (h2) */
  title?: string;
  /** Vertikaler Abstand (Standard: 3 = space-y-3) */
  spacing?: 2 | 3 | 4;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
}

/**
 * Semantische Inhaltssektion mit optionalem Titel.
 *
 * Beispiel:
 * ```tsx
 * <Section title="Aktuelle Meldungen">
 *   <AlertCard ... />
 *   <AlertCard ... />
 * </Section>
 * ```
 */
export function Section({
  children,
  title,
  spacing = 3,
  className,
}: SectionProps) {
  return (
    <section className={cn(`space-y-${spacing}`, className)}>
      {title && (
        <h2 className="text-base font-semibold text-anthrazit">{title}</h2>
      )}
      {children}
    </section>
  );
}
