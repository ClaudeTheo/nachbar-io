// app/(app)/care/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart, AlertTriangle, Clock, Pill } from 'lucide-react';

export default function CareDashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
          <Heart className="h-6 w-6 text-quartier-green" />
          Pflege & Seniorenhilfe
        </h1>
        <p className="text-muted-foreground mt-1">
          Ihr persoenliches Pflege-Dashboard
        </p>
      </div>

      {/* Platzhalter-Karten fuer spaetere Phasen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Check-in
          </div>
          <p className="text-lg font-semibold mt-1 text-quartier-green">
            —
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Letzter SOS
          </div>
          <p className="text-lg font-semibold mt-1 text-muted-foreground">
            Keiner
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Pill className="h-4 w-4" />
          Medikamente heute
        </div>
        <p className="text-sm text-muted-foreground">
          Noch keine Medikamente eingerichtet.
        </p>
      </div>

      {/* Info-Hinweis */}
      <div className="rounded-xl bg-quartier-green/10 p-4 text-sm text-anthrazit">
        <p className="font-medium">Pflege-Modul wird eingerichtet</p>
        <p className="mt-1 text-muted-foreground">
          Hier werden bald Check-ins, SOS-Alarme, Medikamenten-Erinnerungen
          und Verlaufsprotokolle angezeigt.
        </p>
      </div>
    </div>
  );
}
