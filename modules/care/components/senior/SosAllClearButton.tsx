"use client";

import { useState } from "react";
import Link from "next/link";
import { SeniorButton } from "@/components/SeniorButton";

interface SosAllClearButtonProps {
  alertId: string;
}

/**
 * Welle S1 / Befund A3:4 — Entwarnung am Senioren-Gerät.
 *
 * Bisher konnte nur ein Angehöriger/Helfer einen laufenden SOS-Alarm stoppen;
 * der Senior selbst sass vor einem Eskalations-Countdown (5/15/30 min bis
 * Stufe 4), den er nicht abbrechen konnte. Dieser Button nimmt den eigenen
 * Alarm zurück ("Mir geht es wieder gut") über die bereits vorhandene
 * cancelled-Transition (PATCH /api/care/sos/[id]).
 */
export function SosAllClearButton({ alertId }: SosAllClearButtonProps) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  async function handleAllClear() {
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch(`/api/care/sos/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div
        className="space-y-6 pt-4 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-xl text-gray-700">
          Entwarnung gesendet. Schön, dass es Ihnen wieder gut geht.
        </p>
        <Link
          href="/kreis-start"
          className="mx-auto flex max-w-sm items-center justify-center rounded-2xl border-2 border-anthrazit bg-white px-6 text-xl font-bold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
          style={{ minHeight: "80px", touchAction: "manipulation" }}
        >
          Zurück zur Startseite
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4">
      <SeniorButton
        icon="✅"
        label={state === "sending" ? "Wird gesendet…" : "Mir geht es wieder gut"}
        onClick={handleAllClear}
        variant="primary"
      />
      {state === "error" && (
        <p className="text-center text-lg text-red-700" role="alert">
          Das hat nicht geklappt. Bitte tippen Sie noch einmal.
        </p>
      )}
    </div>
  );
}
