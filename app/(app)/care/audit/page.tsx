// app/(app)/care/audit/page.tsx
'use client';

import { ScrollText } from 'lucide-react';
import { AuditLogViewer } from '@/components/care/AuditLogViewer';
import { useAuth } from '@/hooks/use-auth';

export default function AuditLogPage() {
  const { user } = useAuth();

  if (!user) {
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

      <AuditLogViewer seniorId={user.id} />
    </div>
  );
}
