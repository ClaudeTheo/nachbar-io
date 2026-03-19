// app/jugend/freigabe/[token]/page.tsx
// Jugend-Modul: Oeffentliche Elternfreigabe-Seite (kein Login noetig)
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function FreigabeSeite() {
  const { token } = useParams<{ token: string }>();
  const [guardianName, setGuardianName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guardianName.trim() || !accepted) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/youth/consent/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, guardian_name: guardianName.trim() }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Ein Fehler ist aufgetreten.');
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">✓</div>
          <h1 className="text-2xl font-bold text-green-700">Freigabe erteilt!</h1>
          <p className="text-gray-600 mt-4">
            Vielen Dank! Ihr Kind hat nun Zugang zu den erweiterten Funktionen der QuartierApp.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Sie können die Freigabe jederzeit widerrufen unter: quartierapp.de/jugend/freigabe/widerruf
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warmwhite flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        {/* QuartierApp-Branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-anthrazit">QuartierApp</h1>
          <p className="text-gray-500 mt-1">Elternfreigabe</p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-blue-800 font-medium">
            Ihr Kind möchte erweiterte Funktionen in der QuartierApp nutzen.
          </p>
          <p className="text-blue-700 text-sm mt-2">
            Dazu gehören: Aufgaben annehmen, Chat-Teilnahme und Event-Anmeldungen.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="guardian-name" className="block text-sm font-medium text-gray-700 mb-1">
              Ihr vollständiger Name
            </label>
            <input
              id="guardian-name"
              type="text"
              value={guardianName}
              onChange={e => setGuardianName(e.target.value)}
              placeholder="Max Mustermann"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:border-green-400 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Ich bestätige, dass ich der/die Erziehungsberechtigte bin und erteile die Freigabe
              für die erweiterten Funktionen der QuartierApp. Diese Freigabe kann jederzeit
              widerrufen werden.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !guardianName.trim() || !accepted}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-medium text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Wird verarbeitet...' : 'Freigabe erteilen'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          QuartierApp — Nachbarschaftshilfe mit Verantwortung.
          Datenschutz gemäß DSGVO Art. 8.
        </p>
      </div>
    </div>
  );
}
