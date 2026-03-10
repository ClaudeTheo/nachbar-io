'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CareCheckinStatus, CareCheckinMood } from '@/lib/care/types';

interface CheckinDialogProps {
  scheduledAt?: string;
  source?: 'app' | 'device';
  onComplete?: () => void;
}

const MOOD_OPTIONS: Array<{ mood: CareCheckinMood; status: CareCheckinStatus; label: string; icon: string; color: string }> = [
  { mood: 'good', status: 'ok', label: 'Mir geht es gut', icon: '😊', color: 'bg-quartier-green text-white' },
  { mood: 'neutral', status: 'not_well', label: 'Nicht so gut', icon: '😐', color: 'bg-alert-amber text-white' },
  { mood: 'bad', status: 'need_help', label: 'Brauche Hilfe', icon: '🆘', color: 'bg-emergency-red text-white' },
];

export function CheckinDialog({ scheduledAt, source = 'app', onComplete }: CheckinDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCheckin(status: CareCheckinStatus, mood: CareCheckinMood) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/care/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, mood, note: note || undefined, scheduled_at: scheduledAt }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Check-in fehlgeschlagen');
        setLoading(false);
        return;
      }
      setSuccess(true);
      if (onComplete) onComplete();
      else if (source === 'device') router.push('/confirmed');
    } catch { setError('Verbindungsfehler'); }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-quartier-green">Danke!</h2>
        <p className="text-muted-foreground mt-2">Ihr Check-in wurde gespeichert.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-anthrazit text-center">Wie geht es Ihnen?</h2>
      {error && <div className="rounded-lg bg-emergency-red/10 p-3 text-sm text-emergency-red text-center">{error}</div>}
      <div className="space-y-3">
        {MOOD_OPTIONS.map((opt) => (
          <button key={opt.mood} onClick={() => handleCheckin(opt.status, opt.mood)} disabled={loading}
            className={`w-full rounded-xl ${opt.color} p-5 text-left font-bold text-xl transition-opacity ${loading ? 'opacity-50 cursor-not-allowed' : 'active:opacity-80'}`}
            style={{ minHeight: '80px', touchAction: 'manipulation' }}>
            <span className="flex items-center gap-4">
              <span className="text-3xl">{opt.icon}</span>
              {opt.label}
            </span>
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="checkin-note" className="block text-sm text-muted-foreground mb-1">
          Moechten Sie etwas hinzufuegen? (optional)
        </label>
        <textarea id="checkin-note" value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border p-3 text-sm" rows={2} placeholder="z.B. Kopfschmerzen seit gestern..." />
      </div>
    </div>
  );
}
