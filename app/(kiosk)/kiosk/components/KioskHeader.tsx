"use client";

import { useEffect, useState } from "react";

/**
 * Uhr + Datum fuer das Kiosk-Dashboard.
 *
 * Wetter-Widget seit 2026-05-17 stillgelegt: Kiosk-Bereich ist im Pilot
 * archiviert (vgl. Layout-Metadata), der oeffentliche `/api/weather`-Endpunkt
 * antwortet im Closed-Pilot mit 503 und produziert sonst nur Console-Errors.
 * Sobald der Kiosk-Modus wieder aktiviert wird, kann das Wetter-Widget
 * reaktiviert werden — bis dahin zeigt der Header nur Uhr + Datum.
 */
export default function KioskHeader() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  // Uhrzeit + Datum aktualisieren
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
      );
      setDate(
        now.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    }

    updateClock();
    const interval = setInterval(updateClock, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="kiosk-header">
      <div>
        <div className="kiosk-clock">{time}</div>
        <div className="kiosk-date">{date}</div>
      </div>
    </header>
  );
}
