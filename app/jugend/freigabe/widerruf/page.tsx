// app/jugend/freigabe/widerruf/page.tsx
// Jugend-Modul: Oeffentliche Widerrufs-Seite (kein Login noetig)
'use client';

import { useState } from 'react';

export default function WiderrufSeite() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setError('');

    // Formatierung: sicherstellen dass + vorangestellt
    const formatted = phone.startsWith('+') ? phone : `+49${phone.replace(/^0/, '')}`;

    try {
      // SMS mit Widerrufs-Link senden (in Phase 2: dedizierte Revoke-SMS API)
      const res = await fetch('/api/youth/consent/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardian_phone: formatted,
          revoked_via: 'sms_link',
        }),
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
      <div className="min-h-screen bg-warmwhite flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-anthrazit">Widerruf eingeleitet</h1>
          <p className="text-gray-600 mt-4">
            Falls eine aktive Freigabe mit dieser Nummer verknüpft ist,
            wurde sie widerrufen. Ihr Kind wird auf die Basis-Stufe zurückgesetzt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warmwhite flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-anthrazit">QuartierApp</h1>
          <p className="text-gray-500 mt-1">Elternfreigabe widerrufen</p>
        </div>

        <p className="text-gray-600 mb-6">
          Geben Sie die Telefonnummer ein, mit der Sie die Freigabe erteilt haben.
          Die Freigabe wird sofort widerrufen.
        </p>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Ihre Telefonnummer
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+49 170 1234567"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:border-green-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-medium text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Wird verarbeitet...' : 'Freigabe widerrufen'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Nach dem Widerruf werden die erweiterten Funktionen
          für Ihr Kind sofort deaktiviert.
        </p>
      </div>
    </div>
  );
}
