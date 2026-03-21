"use client";

// components/ExternalLinkProvider.tsx
// Nachbar.io — Externe Links sicher im Browser oeffnen
// Zeigt kurzen Disclaimer + Domain vor dem Oeffnen

import { createContext, useContext, useState, useCallback } from "react";
import { ExternalLink as ExternalLinkIcon, Globe, X } from "lucide-react";

// --- Context ---

interface ExternalLinkState {
  openExternal: (url: string, title?: string) => void;
}

const ExternalLinkContext = createContext<ExternalLinkState>({
  openExternal: () => {},
});

export function useExternalLink() {
  return useContext(ExternalLinkContext);
}

// --- Domain aus URL extrahieren ---
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// --- Provider + Bestaetigungs-Dialog ---

export function ExternalLinkProvider({ children }: { children: React.ReactNode }) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string>("");

  const openExternal = useCallback((url: string, title?: string) => {
    // mailto: und tel: Links direkt oeffnen
    if (url.startsWith("mailto:") || url.startsWith("tel:")) {
      window.open(url, "_blank");
      return;
    }
    setPendingUrl(url);
    setPendingTitle(title ?? extractDomain(url));
  }, []);

  const closeDialog = useCallback(() => {
    setPendingUrl(null);
    setPendingTitle("");
  }, []);

  const openInBrowser = useCallback(() => {
    if (pendingUrl) {
      window.open(pendingUrl, "_blank", "noopener,noreferrer");
    }
    closeDialog();
  }, [pendingUrl, closeDialog]);

  return (
    <ExternalLinkContext.Provider value={{ openExternal }}>
      {children}

      {/* Bestaetigungs-Dialog */}
      {pendingUrl && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in-up">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-anthrazit font-semibold">
                <Globe className="h-5 w-5 text-quartier-green" />
                Externe Seite
              </div>
              <button
                onClick={closeDialog}
                className="rounded-full p-1.5 hover:bg-gray-100"
                aria-label="Schließen"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Domain + Hinweis */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 mb-4">
              <p className="text-sm font-medium text-blue-900 truncate">
                {extractDomain(pendingUrl)}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Sie verlassen die QuartierApp. Es gelten die Datenschutzbestimmungen des Anbieters.
              </p>
            </div>

            {/* Aktionen */}
            <div className="flex gap-3">
              <button
                onClick={closeDialog}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={openInBrowser}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-quartier-green px-4 py-3 text-sm font-semibold text-white hover:bg-quartier-green-dark"
              >
                <ExternalLinkIcon className="h-4 w-4" />
                Öffnen
              </button>
            </div>
          </div>
        </div>
      )}
    </ExternalLinkContext.Provider>
  );
}
