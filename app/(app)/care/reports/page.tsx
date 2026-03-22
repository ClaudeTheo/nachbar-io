// app/(app)/care/reports/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { ReportGenerator } from '@/components/care/ReportGenerator';
import { ReportList } from '@/components/care/ReportList';
import { useAuth } from '@/hooks/use-auth';

export default function ReportsPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGenerated = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

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
          <FileText className="h-6 w-6 text-quartier-green" />
          Berichte
        </h1>
        <p className="text-muted-foreground mt-1">
          Erstellen und verwalten Sie Pflegeberichte.
        </p>
      </div>

      <ReportGenerator seniorId={user.id} onGenerated={handleGenerated} />

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Erstellte Berichte</h2>
        <ReportList key={refreshKey} seniorId={user.id} />
      </div>
    </div>
  );
}
