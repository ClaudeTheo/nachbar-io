'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Pill } from 'lucide-react';
import { MedicationList } from '@/components/care/MedicationList';

export default function MedicationsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  if (!userId) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
          <Pill className="h-6 w-6 text-quartier-green" />
          Medikamente
        </h1>
        <p className="text-muted-foreground mt-1">Medikamenten-Verwaltung und Einnahme-Protokoll</p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Heute faellig</h2>
        <MedicationList seniorId={userId} />
      </div>
    </div>
  );
}
