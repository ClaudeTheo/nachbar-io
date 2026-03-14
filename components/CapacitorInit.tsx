"use client";

import { useEffect } from "react";

export function CapacitorInit() {
  useEffect(() => {
    // Nur auf nativer Platform initialisieren
    import("@capacitor/core").then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) {
        import("@/lib/capacitor-init").then(({ initCapacitor }) => {
          initCapacitor();
        });
      }
    }).catch(() => {
      // Capacitor nicht verfuegbar (reiner Web-Modus) — ignorieren
    });
  }, []);

  return null;
}
