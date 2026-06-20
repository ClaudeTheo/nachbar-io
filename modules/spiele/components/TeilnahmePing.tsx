"use client";

// Welle SP1-4 — Teilnahme-Ping.
// Bewusst GETRENNT von der Tagesraetsel-Komponente: Tagesraetsel bleibt damit
// persistenzfrei (kein fetch beim Antworten). Dieser Ping vergibt Punkte nur
// fuers Mitmachen — er feuert einmalig beim Oeffnen einen fire-and-forget-POST
// auf /api/spiele/teilnahme und ignoriert das Ergebnis bewusst. Rendert nichts.

import { useEffect, useRef } from "react";

export function TeilnahmePing() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void fetch("/api/spiele/teilnahme", { method: "POST" }).catch(() => {
      // fire-and-forget: ein fehlgeschlagener Ping darf das Raetsel nie stoeren
    });
  }, []);

  return null;
}
