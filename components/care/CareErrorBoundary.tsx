// components/care/CareErrorBoundary.tsx
// Nachbar.io — Fehlergrenze fuer Care-Komponenten
'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Faengt React-Fehler in Care-Komponenten ab und zeigt
 * eine benutzerfreundliche Fehlermeldung auf Deutsch.
 */
export class CareErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Strukturiertes Fehler-Logging
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      module: 'care/ui',
      action: 'error_boundary_caught',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    }));
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-[#2D3142] mb-2">
            Etwas ist schiefgelaufen
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {this.props.fallbackMessage ?? 'Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.'}
          </p>
          {this.state.error && (
            <p className="text-xs text-red-400 mb-4 font-mono">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2D3142] px-4 py-2 text-sm font-medium text-white hover:bg-[#2D3142]/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Seite neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
