'use client';

// components/care/InviteCodeModal.tsx
// Nachbar.io — Modal zum Erstellen und Anzeigen eines Einladungs-Codes

import { useState } from 'react';
import { Copy, Check, Loader2, KeyRound } from 'lucide-react';

interface InviteCodeModalProps {
  onClose: () => void;
}

export function InviteCodeModal({ onClose }: InviteCodeModalProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/caregiver/invite', { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Einladung fehlgeschlagen');
      }
      const json = await res.json();
      setCode(json.data.code);
      setExpiresAt(json.data.expires_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: nichts tun
    }
  };

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-6">
        {/* Titel */}
        <div className="text-center">
          <KeyRound className="h-10 w-10 text-[#4CAF87] mx-auto mb-2" />
          <h2 className="text-xl font-bold text-[#2D3142]">
            Einladungs-Code
          </h2>
        </div>

        {/* Fehlermeldung */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {!code ? (
          // Zustand 1: Code noch nicht erstellt
          <div className="space-y-4">
            <p className="text-sm text-[#2D3142] text-center">
              Erstellen Sie einen Einladungs-Code für eine/n Angehörige/n.
              Der Code ist 24 Stunden gültig.
            </p>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-semibold text-lg hover:bg-[#3d9a74] transition-colors disabled:opacity-50"
              style={{ minHeight: '80px' }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Code erstellen'
              )}
            </button>
          </div>
        ) : (
          // Zustand 2: Code wurde generiert
          <div className="space-y-4">
            {/* Code-Anzeige */}
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p
                className="font-mono font-bold tracking-widest text-[#2D3142]"
                style={{ fontSize: '48px' }}
              >
                {code}
              </p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Geben Sie diesen Code Ihrem Angehörigen.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Gültig für 24 Stunden (bis {formattedExpiry})
            </p>

            {/* Kopieren-Button */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-[#4CAF87] text-[#4CAF87] font-semibold text-lg hover:bg-[#4CAF87]/5 transition-colors"
              style={{ minHeight: '80px' }}
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Code kopieren
                </>
              )}
            </button>
          </div>
        )}

        {/* Schliessen-Button */}
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center rounded-xl border border-gray-300 text-[#2D3142] font-medium text-base hover:bg-gray-50 transition-colors"
          style={{ minHeight: '80px' }}
        >
          Schliessen
        </button>
      </div>
    </div>
  );
}
