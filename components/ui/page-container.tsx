// Nachbar.io — Einheitlicher Seitencontainer
// Standardisiert Außenabstaende und Animationen für alle App-Seiten
import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  /** Vertikaler Abstand zwischen Kindern (Standard: 4 = space-y-4) */
  spacing?: 3 | 4 | 6;
  /** Fade-In-Animation (Standard: true) */
  animate?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * Konsistenter äußerer Container für App-Seiten.
 * Setzt Standard-Spacing und optionale Fade-In-Animation.
 *
 * Beispiel:
 * ```tsx
 * <PageContainer>
 *   <PageHeader title="Board" backHref="/dashboard" />
 *   <Section>...</Section>
 * </PageContainer>
 * ```
 */
export function PageContainer({
  children,
  spacing = 4,
  animate = true,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        `space-y-${spacing}`,
        animate && "animate-fade-in-up",
        className
      )}
    >
      {children}
    </div>
  );
}
