"use client";

import type { HTMLAttributes, ButtonHTMLAttributes } from "react";

// Dekorativer KI-Hilfe-Punkt im AiConsent-Step.
// Zwei Modi:
// - decorative (default): <span aria-hidden="true">. Kein KI-Call.
// - asButton: <button> mit aria-label fuer Click-Handler (z.B. FAQ-Sheet-Trigger).
// CSS-only Pulse mit prefers-reduced-motion-Schutz via Tailwind motion-safe-Variante.

type DecorativeProps = HTMLAttributes<HTMLSpanElement> & {
  asButton?: false;
};
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asButton: true;
  ariaLabel: string;
};

type Props = DecorativeProps | ButtonProps;

function PulseInner() {
  return (
    <>
      <span
        data-pulse-outer
        className="motion-safe:animate-[ki-help-pulse_2.4s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-quartier-green/25"
      />
      <span
        data-pulse-inner
        className="relative inline-flex h-2.5 w-2.5 rounded-full bg-quartier-green"
      />
    </>
  );
}

export function KiHelpPulseDot(props: Props) {
  if (props.asButton) {
    const { asButton: _asButton, ariaLabel, className, ...rest } = props;
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        className={
          "relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-quartier-green/50 " +
          (className ?? "")
        }
        {...rest}
      >
        <PulseInner />
      </button>
    );
  }
  const { asButton: _asButton, className, ...rest } = props;
  return (
    <span
      aria-hidden="true"
      className={
        "relative inline-flex h-6 w-6 shrink-0 items-center justify-center " +
        (className ?? "")
      }
      {...rest}
    >
      <PulseInner />
    </span>
  );
}
