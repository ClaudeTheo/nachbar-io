// app/(app)/care/reports/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ReportGenerator } from '@/components/care/ReportGenerator';
import { ReportList } from '@/components/care/ReportList';

export default function ReportsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const handleGenerated = useCallback(() => {
    setRefreshKey(k => k + 1);
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
          <FileText className="h-6 w-6 text-quartier-green" />
          Berichte
        </h1>
        <p className="text-muted-foreground mt-1">
          Erstellen und verwalten Sie Pflegeberichte.
        </p>
      </div>

      <ReportGenerator seniorId={userId} onGenerated={handleGenerated} />

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Erstellte Berichte</h2>
        <ReportList key={refreshKey} seniorId={userId} />
      </div>
    </div>
  );
}
