'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SessionDocForm from '@/components/hilfe/SessionDocForm';
import type { HelpMatch, NeighborhoodHelper } from '@/lib/hilfe/types';

interface MatchData {
  match: HelpMatch;
  helper: NeighborhoodHelper;
}

/**
 * Einsatz-Dokumentationsseite — lädt Match-Daten und rendert das Formular.
 */
export default function EinsatzPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;

    fetch(`/api/hilfe/matches/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Match nicht gefunden.');
        return res.json();
      })
      .then((result: MatchData) => setData(result))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Fehler beim Laden.')
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-gray-500">Einsatz wird geladen…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <p className="rounded-md bg-red-50 p-4 text-red-700">
          {error || 'Einsatz konnte nicht geladen werden.'}
        </p>
      </div>
    );
  }

  return (
    <SessionDocForm
      matchId={data.match.id}
      helperRate={data.helper.hourly_rate_cents}
    />
  );
}
