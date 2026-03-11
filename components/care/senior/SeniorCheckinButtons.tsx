'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SeniorCheckinButtons({ scheduledAt }: { scheduledAt?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckin(status: 'ok' | 'not_well' | 'need_help', mood: 'good' | 'neutral' | 'bad') {
    setLoading(true);
    try {
      const res = await fetch('/api/care/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, mood, scheduled_at: scheduledAt }),
      });
      if (res.ok) router.push('/confirmed');
    } catch { /* Senior soll es erneut versuchen */ }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <button onClick={() => handleCheckin('ok', 'good')} disabled={loading}
        className="w-full rounded-2xl bg-green-600 px-8 py-8 text-2xl font-bold text-white shadow-lg active:bg-green-700 disabled:opacity-50"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}>
        😊 Mir geht es gut
      </button>
      <button onClick={() => handleCheckin('not_well', 'neutral')} disabled={loading}
        className="w-full rounded-2xl bg-yellow-500 px-8 py-8 text-2xl font-bold text-white shadow-lg active:bg-yellow-600 disabled:opacity-50"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}>
        😐 Nicht so gut
      </button>
      <button onClick={() => handleCheckin('need_help', 'bad')} disabled={loading}
        className="w-full rounded-2xl bg-red-600 px-8 py-8 text-2xl font-bold text-white shadow-lg active:bg-red-700 disabled:opacity-50"
        style={{ minHeight: '80px', touchAction: 'manipulation' }}>
        🆘 Brauche Hilfe
      </button>
    </div>
  );
}
