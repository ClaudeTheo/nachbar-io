"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { X, ExternalLink as ExternalLinkIcon, Globe, AlertTriangle } from "lucide-react";

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

// --- Provider + Overlay ---

export function ExternalLinkProvider({ children }: { children: React.ReactNode }) {
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [overlayTitle, setOverlayTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openExternal = useCallback((url: string, title?: string) => {
    // mailto: und tel: Links nativ oeffnen
    if (url.startsWith("mailto:") || url.startsWith("tel:")) {
      window.open(url, "_blank");
      return;
    }
    setOverlayUrl(url);
    setOverlayTitle(title ?? extractDomain(url));
    setLoading(true);
    setError(false);

    // Timeout: Falls iFrame nach 8s nicht laedt
    timeoutRef.current = setTimeout(() => {
      setError(true);
      setLoading(false);
    }, 8000);
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayUrl(null);
    setOverlayTitle("");
    setLoading(true);
    setError(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const openInBrowser = useCallback(() => {
    if (overlayUrl) {
      window.open(overlayUrl, "_blank", "noopener,noreferrer");
    }
  }, [overlayUrl]);

  return (
    <ExternalLinkContext.Provider value={{ openExternal }}>
      {children}

      {/* Fullscreen Overlay */}
      {overlayUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2.5">
            <button
              onClick={closeOverlay}
              className="flex items-center gap-1.5 rounded-lg p-1.5 text-sm font-medium text-anthrazit hover:bg-gray-200"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
              <span className="hidden sm:inline">Schließen</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span className="max-w-[180px] truncate">{extractDomain(overlayUrl)}</span>
            </div>

            <button
              onClick={openInBrowser}
              className="flex items-center gap-1 rounded-lg p-1.5 text-xs text-quartier-green hover:bg-quartier-green/10"
              aria-label="Im Browser öffnen"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Browser</span>
            </button>
          </div>

          {/* Disclaimer */}
          <div className="border-b bg-blue-50 px-3 py-1.5 text-center text-[11px] text-blue-700">
            Diese Seite wird von <strong>{extractDomain(overlayUrl)}</strong> bereitgestellt. Es gelten deren Datenschutzbestimmungen.
          </div>

          {/* Inhalt */}
          <div className="relative flex-1">
            {/* Loading Spinner */}
            {loading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-quartier-green border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  {overlayTitle} wird geladen...
                </p>
              </div>
            )}

            {/* Fehler-Fallback */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center">
                <AlertTriangle className="h-12 w-12 text-alert-amber" />
                <div>
                  <p className="font-semibold text-anthrazit">Seite konnte nicht geladen werden</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Die Seite blockiert möglicherweise die Einbettung.
                  </p>
                </div>
                <button
                  onClick={openInBrowser}
                  className="flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-quartier-green-dark"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  Im Browser öffnen
                </button>
              </div>
            )}

            {/* iFrame */}
            <iframe
              src={overlayUrl}
              title={overlayTitle}
              className={`h-full w-full border-0 ${loading || error ? "invisible" : "visible"}`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="no-referrer"
              onLoad={handleIframeLoad}
              onError={() => setError(true)}
            />
          </div>
        </div>
      )}
    </ExternalLinkContext.Provider>
  );
}
