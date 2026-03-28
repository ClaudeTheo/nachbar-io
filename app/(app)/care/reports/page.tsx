// app/(app)/care/reports/page.tsx
"use client";

import { useState, useCallback } from "react";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ReportGenerator } from "@/modules/care/components/reports/ReportGenerator";
import { ReportList } from "@/modules/care/components/reports/ReportList";
import { useAuth } from "@/hooks/use-auth";

export default function ReportsPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGenerated = useCallback(() => {
    setRefreshKey((k) => k + 1);
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
      <PageHeader
        title={
          <>
            <FileText className="h-6 w-6 text-quartier-green" /> Berichte
          </>
        }
        subtitle="Erstellen und verwalten Sie Pflegeberichte."
        backHref="/care"
      />

      <ReportGenerator seniorId={user.id} onGenerated={handleGenerated} />

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Erstellte Berichte
        </h2>
        <ReportList key={refreshKey} seniorId={user.id} />
      </div>
    </div>
  );
}
