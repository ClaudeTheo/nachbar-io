// components/care/ConsultationSlotForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ConsultationProviderType } from '@/lib/care/types';

interface Props {
  quarterId: string;
}

export function ConsultationSlotForm({ quarterId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [providerType, setProviderType] = useState<ConsultationProviderType>('community');
  const [hostName, setHostName] = useState('');
  const [title, setTitle] = useState('Sprechstunde');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(15);
  const [joinUrl, setJoinUrl] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/care/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarter_id: quarterId,
          provider_type: providerType,
          host_name: hostName,
          title,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: duration,
          join_url: joinUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Fehler beim Erstellen');
        return;
      }

      router.push('/care/consultations');
    } catch {
      setError('Netzwerkfehler');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-red-700">{error}</div>
      )}

      {/* Typ */}
      <div>
        <label className="block text-sm font-medium text-anthrazit mb-1">Art der Sprechstunde</label>
        <select
          value={providerType}
          onChange={e => setProviderType(e.target.value as ConsultationProviderType)}
          className="w-full rounded-xl border border-anthrazit/20 p-3 text-lg"
        >
          <option value="community">Quartiers-Beratung (Jitsi)</option>
          <option value="medical">Ärztliche Sprechstunde (sprechstunde.online)</option>
        </select>
      </div>

      {/* Host-Name */}
      <div>
        <label className="block text-sm font-medium text-anthrazit mb-1">Ansprechperson</label>
        <input
          type="text"
          value={hostName}
          onChange={e => setHostName(e.target.value)}
          placeholder="z.B. Quartierslotse Schmidt"
          required
          className="w-full rounded-xl border border-anthrazit/20 p-3 text-lg"
        />
      </div>

      {/* Titel */}
      <div>
        <label className="block text-sm font-medium text-anthrazit mb-1">Titel</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full rounded-xl border border-anthrazit/20 p-3 text-lg"
        />
      </div>

      {/* Datum + Uhrzeit */}
      <div>
        <label className="block text-sm font-medium text-anthrazit mb-1">Datum und Uhrzeit</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={e => setScheduledAt(e.target.value)}
          required
          className="w-full rounded-xl border border-anthrazit/20 p-3 text-lg"
        />
      </div>

      {/* Dauer */}
      <div>
        <label className="block text-sm font-medium text-anthrazit mb-1">Dauer (Minuten)</label>
        <select
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          className="w-full rounded-xl border border-anthrazit/20 p-3 text-lg"
        >
          <option value={10}>10 Min.</option>
          <option value={15}>15 Min.</option>
          <option value={20}>20 Min.</option>
          <option value={30}>30 Min.</option>
          <option value={45}>45 Min.</option>
          <option value={60}>60 Min.</option>
        </select>
      </div>

      {/* sprechstunde.online-Link (nur bei medical) */}
      {providerType === 'medical' && (
        <div>
          <label className="block text-sm font-medium text-anthrazit mb-1">
            sprechstunde.online-Link (optional, wird vom Arzt-Portal gesetzt)
          </label>
          <input
            type="url"
            value={joinUrl}
            onChange={e => setJoinUrl(e.target.value)}
            placeholder="https://app.sprechstunde.online/..."
            className="w-full rounded-xl border border-anthrazit/20 p-3 text-lg"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-[56px] rounded-xl bg-quartier-green text-white text-lg font-bold disabled:opacity-50"
      >
        {loading ? 'Wird erstellt...' : 'Termin erstellen'}
      </button>
    </form>
  );
}
