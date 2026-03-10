// app/(app)/care/audit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuditLogViewer } from '@/components/care/AuditLogViewer';

export default function AuditLogPage() {
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
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3142] flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-quartier-green" />
          Aktivitaetsprotokoll
        </h1>
        <p className="text-muted-foreground mt-1">
          Lueckenloses Protokoll aller Pflege-Aktivitaeten.
        </p>
      </div>

      <AuditLogViewer seniorId={userId} />
    </div>
  );
}
