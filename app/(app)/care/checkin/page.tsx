'use client';

// Aktive Check-in Seite: Taeglicher Check-in + letzte Eintraege

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CheckinDialog } from '@/components/care/CheckinDialog';
import { CheckinHistory } from '@/components/care/CheckinHistory';
import type { CareCheckin } from '@/lib/care/types';
import { getCachedUser } from "@/lib/supabase/cached-auth";

export default function CheckinPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CareCheckin[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    getCachedUser(supabase).then(({ user }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Check-in-Verlauf laden
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/care/checkin?limit=5`);
      if (res.ok) {
        const data = await res.json();
        setRecentCheckins(data);
      }
    } catch { /* silent */ }
    setLoadingHistory(false);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
  }, [loadHistory]);

  if (!userId) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Zurueck-Link */}
      <Link
        href="/care"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
          <Clock className="h-6 w-6 text-quartier-green" />
          Taeglicher Check-in
        </h1>
        <p className="text-muted-foreground mt-1">
          Melden Sie uns kurz, wie es Ihnen geht
        </p>
      </div>

      {/* Check-in Dialog (3 Mood-Buttons + Notiz) */}
      <div className="rounded-xl border bg-card p-6">
        <CheckinDialog onComplete={loadHistory} />
      </div>

      {/* Letzte Check-ins */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground">Letzte Check-ins</h2>
          <Link
            href="/care/checkins"
            className="flex items-center gap-1 text-sm text-quartier-green font-medium hover:underline"
          >
            Alle anzeigen
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <CheckinHistory checkins={recentCheckins} loading={loadingHistory} />
      </div>
    </div>
  );
}
