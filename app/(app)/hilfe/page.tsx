'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HelpRequestCard } from '@/components/hilfe/HelpRequestCard';
import type { HelpRequest } from '@/lib/hilfe/types';

/** Hauptseite Nachbarschaftshilfe — zeigt offene Gesuche */
export default function HilfePage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hilfe/requests')
      .then((res) => res.json())
      .then((data: HelpRequest[]) => setRequests(data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleApply(id: string) {
    try {
      const res = await fetch(`/api/hilfe/requests/${id}/match`, {
        method: 'POST',
      });
      if (res.ok) {
        // Status lokal aktualisieren
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'matched' as const } : r))
        );
      }
    } catch {
      // Fehler stillschweigend ignorieren — Nutzer sieht Status unverändert
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold text-[#2D3142]">Nachbarschaftshilfe</h1>

      <Link href="/hilfe/neu">
        <Button className="min-h-[56px] w-full text-lg font-semibold">
          Neues Gesuch erstellen
        </Button>
      </Link>

      {loading && <p className="text-center text-gray-500">Gesuche werden geladen…</p>}

      {!loading && requests.length === 0 && (
        <p className="text-center text-gray-500">Noch keine Gesuche vorhanden.</p>
      )}

      <div className="space-y-4">
        {requests.map((req) => (
          <HelpRequestCard
            key={req.id}
            request={req}
            onApply={handleApply}
          />
        ))}
      </div>
    </div>
  );
}
