'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SeniorCheckinButtons({ scheduledAt }: { scheduledAt?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleCheckin(status: 'ok' | 'not_well' | 'need_help', mood: 'good' | 'neutral' | 'bad') {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/care/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, mood, scheduled_at: scheduledAt }),
      });
      if (res.ok) {
        // Buttons bleiben bis zur Navigation deaktiviert
        router.push('/confirmed');
        return;
      }
      // Stiller Fehlschlag waere falsche Beruhigung — Familie wartet sonst
      // auf einen Check-in, der nie ankam (Befund B3:1 / A3:1)
      setError(true);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-red-600 bg-red-50 px-6 py-5 text-center text-xl font-bold text-anthrazit"
        >
          Das hat leider nicht geklappt.
          <br />
          Bitte tippen Sie noch einmal.
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {loading ? 'Ihr Check-in wird gesendet …' : ''}
      </p>
      <button onClick={() => handleCheckin('ok', 'good')} disabled={loading}
        className="w-full rounded-2xl bg-green-600 px-8 py-8 text-2xl font-bold text-white shadow-lg active:bg-green-700 disabled:opacity-50"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}>
        <span aria-hidden="true">😊</span> Mir geht es gut
      </button>
      {/* Dunkler Text auf Gelb: Weiss auf yellow-500 waere nur ~2:1 (Befund B1:2) */}
      <button onClick={() => handleCheckin('not_well', 'neutral')} disabled={loading}
        className="w-full rounded-2xl bg-yellow-500 px-8 py-8 text-2xl font-bold text-anthrazit shadow-lg active:bg-yellow-600 disabled:opacity-50"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}>
        <span aria-hidden="true">😐</span> Nicht so gut
      </button>
      <button onClick={() => handleCheckin('need_help', 'bad')} disabled={loading}
        className="w-full rounded-2xl bg-red-600 px-8 py-8 text-2xl font-bold text-white shadow-lg active:bg-red-700 disabled:opacity-50"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}>
        <span aria-hidden="true">🆘</span> Brauche Hilfe
      </button>
    </div>
  );
}
