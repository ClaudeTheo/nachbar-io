"use client";

import type { HTMLAttributes } from "react";

// Dekorativer KI-Hilfe-Punkt fuer den Consent-Screen. Kein KI-Call.
// CSS-only Pulse mit prefers-reduced-motion-Schutz via Tailwind motion-safe-Variante.
export function KiHelpPulseDot(
  props: HTMLAttributes<HTMLSpanElement>,
) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center"
      {...props}
    >
      <span
        data-pulse-outer
        className="motion-safe:animate-[ki-help-pulse_2.4s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-quartier-green/25"
      />
      <span
        data-pulse-inner
        className="relative inline-flex h-2.5 w-2.5 rounded-full bg-quartier-green"
      />
    </span>
  );
}
