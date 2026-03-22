// Nachbar.io — Einheitlicher Seitencontainer
// Standardisiert Aussenabstaende und Animationen fuer alle App-Seiten
import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  /** Vertikaler Abstand zwischen Kindern (Standard: 4 = space-y-4) */
  spacing?: 3 | 4 | 6;
  /** Fade-In-Animation (Standard: true) */
  animate?: boolean;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
}

/**
 * Konsistenter aeusserer Container fuer App-Seiten.
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
