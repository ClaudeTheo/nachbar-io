"use client";

import React from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Globale Error Boundary — faengt Client-Crashes ab und zeigt hilfreiche Meldung
// statt weissen Bildschirm. WICHTIG: Notfall-Hinweis immer sichtbar.
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Fehler an Sentry melden (Client-Side)
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
    console.error("[ErrorBoundary] Unbehandelter Fehler:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-warmwhite px-6 text-center">
          {/* Notfall-Hinweis — IMMER sichtbar (kritische Regel) */}
          <div className="mb-8 w-full max-w-sm rounded-2xl bg-[#EF4444] px-6 py-4 text-white shadow-lg">
            <p className="text-lg font-bold">Notruf: 112 / 110</p>
            <p className="mt-1 text-sm opacity-90">
              Bei medizinischen Notfaellen oder Gefahr immer zuerst den Notruf
              waehlen.
            </p>
          </div>

          {/* Fehlermeldung */}
          <div className="mb-6 text-6xl" aria-hidden="true">
            ⚠️
          </div>
          <h1 className="mb-2 text-xl font-extrabold text-[#2D3142]">
            Etwas ist schiefgelaufen
          </h1>
          <p className="mb-6 max-w-xs text-sm text-[#2D3142]/60">
            Die App hat einen unerwarteten Fehler festgestellt. Bitte laden Sie
            die Seite neu.
          </p>

          {/* Reload-Button — 80px Touch-Target (Senior-Mode) */}
          <button
            onClick={this.handleReload}
            className="rounded-2xl bg-quartier-green px-8 py-4 text-base font-semibold text-white shadow-soft transition-all active:scale-95"
            style={{
              minHeight: "80px",
              minWidth: "200px",
              touchAction: "manipulation",
            }}
          >
            Seite neu laden
          </button>

          {/* Technische Details (nur fuer Debugging) */}
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-8 max-w-sm text-left">
              <summary className="cursor-pointer text-xs text-[#2D3142]/40">
                Technische Details
              </summary>
              <pre className="mt-2 overflow-auto rounded-lg bg-[#f5f0eb] p-3 text-xs text-[#2D3142]/60">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
