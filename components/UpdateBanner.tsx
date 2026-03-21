"use client";

import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpdateBannerProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

// Banner fuer verfuegbare App-Updates (PWA Service Worker)
export function UpdateBanner({ onUpdate, onDismiss }: UpdateBannerProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border-2 border-quartier-green/20 bg-white p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-quartier-green/10">
          <RefreshCw className="h-5 w-5 text-quartier-green" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-anthrazit">Neue Version verfügbar</p>
          <p className="text-xs text-muted-foreground">
            Tippen Sie auf den Button für die neuesten Funktionen
          </p>
        </div>
        <Button
          size="sm"
          onClick={onUpdate}
          data-testid="update-apply-btn"
          className="bg-quartier-green hover:bg-quartier-green-dark min-h-[44px] px-4"
        >
          Aktualisieren
        </Button>
        <button
          onClick={onDismiss}
          data-testid="update-dismiss-btn"
          className="rounded-full p-2 hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Schließen"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
