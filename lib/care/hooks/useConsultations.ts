// lib/care/hooks/useConsultations.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConsultationSlot } from '@/lib/care/types';

/**
 * Hook zum Laden und Verwalten von Sprechstunden-Terminen.
 * Aktualisiert automatisch alle 30 Sekunden.
 */
export function useConsultations(quarterId?: string, myOnly = false) {
  const [slots, setSlots] = useState<ConsultationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (quarterId) params.set('quarter_id', quarterId);
      if (myOnly) params.set('my', 'true');
      const res = await fetch(`/api/care/consultations?${params}`);
      if (res.ok) {
        setSlots(await res.json());
        setError(null);
      } else {
        setError('Termine konnten nicht geladen werden');
      }
    } catch {
      setError('Netzwerkfehler');
    }
    setLoading(false);
  }, [quarterId, myOnly]);

  useEffect(() => {
    load();
    // Polling alle 30 Sekunden fuer aktuelle Slot-Statuswechsel
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  /** Slot buchen — aktualisiert lokalen State bei Erfolg */
  async function bookSlot(slotId: string): Promise<ConsultationSlot> {
    const res = await fetch(`/api/care/consultations/${slotId}/book`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Buchung fehlgeschlagen');
    }
    const updated = await res.json();
    setSlots(prev => prev.map(s => s.id === slotId ? updated : s));
    return updated;
  }

  return { slots, loading, error, bookSlot, refresh: load };
}
