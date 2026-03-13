"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// BeforeInstallPromptEvent ist nicht in allen Browsern typisiert
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Pruefen ob schon dismissed
    if (localStorage.getItem("pwa-install-dismissed")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialer Zustand aus localStorage
      setDismissed(true);
      return;
    }

    // Prüfen ob bereits installiert (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    setDeferredPrompt(null);
    localStorage.setItem("pwa-install-dismissed", "true");
  }

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border-2 border-quartier-green/20 bg-white p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-quartier-green/10">
          <Download className="h-5 w-5 text-quartier-green" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-anthrazit">App installieren</p>
          <p className="text-xs text-muted-foreground">
            Schnellerer Zugriff direkt vom Homescreen
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleInstall}
          className="bg-quartier-green hover:bg-quartier-green-dark"
        >
          Installieren
        </Button>
        <button
          onClick={handleDismiss}
          className="rounded-full p-1 hover:bg-muted"
          aria-label="Schließen"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
