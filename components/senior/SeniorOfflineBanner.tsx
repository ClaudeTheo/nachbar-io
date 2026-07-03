"use client";

// components/senior/SeniorOfflineBanner.tsx
// W7 (Befund A3:6): Offline-Hinweis fuer das Senioren-Geraet.
// Die Zielgruppe 75+ kann einen Netzausfall nicht von "mir wird nicht
// geholfen" unterscheiden. Der Banner sagt ruhig, was los ist — und den
// wichtigsten Satz zuerst mitgedacht: der Telefon-Notruf 112 haengt NICHT
// am Internet und funktioniert weiterhin.

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function SeniorOfflineBanner() {
  // Initial false: SSR und Hydration kennen keinen navigator-Status;
  // der echte Zustand wird erst nach dem Mount gelesen.
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 -mx-6 mb-4 border-b-2 border-amber-300 bg-amber-50 px-6 py-4"
    >
      <p className="flex items-start gap-3 text-xl leading-relaxed text-amber-950">
        <WifiOff
          className="mt-1 h-7 w-7 flex-shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <span>
          <span className="font-bold">Keine Internet-Verbindung.</span>{" "}
          Der Notruf 112 über Ihr Telefon funktioniert weiterhin.
        </span>
      </p>
    </div>
  );
}
