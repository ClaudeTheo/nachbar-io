"use client";

import { useEffect, useState, useCallback } from "react";
import { UpdateBanner } from "@/components/UpdateBanner";

const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Stunden
const LAST_CHECK_KEY = "pwa-last-update-check";

export function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration.scope);

        // Pruefen ob bereits ein wartender SW vorhanden ist
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
          return;
        }

        // Einmal pro Tag auf Updates pruefen
        try {
          const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
          const now = Date.now();
          if (!lastCheck || now - parseInt(lastCheck, 10) > UPDATE_CHECK_INTERVAL_MS) {
            localStorage.setItem(LAST_CHECK_KEY, String(now));
            registration.update().catch(() => {
              // Update-Check fehlgeschlagen (offline) — kein Problem
            });
          }
        } catch {
          // localStorage nicht verfuegbar (Private Browsing) — ignorieren
        }

        // Auf neue SW-Version lauschen
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Neuer SW wartet — Update verfuegbar
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((error) => {
        console.log("SW registration failed:", error);
      });

    // Seite neu laden wenn neuer SW die Kontrolle uebernimmt
    let refreshing = false;
    function handleControllerChange() {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  if (!updateAvailable) return null;

  return <UpdateBanner onUpdate={applyUpdate} onDismiss={dismissUpdate} />;
}
