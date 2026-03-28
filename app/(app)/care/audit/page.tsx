// app/(app)/care/audit/page.tsx
"use client";

import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { AuditLogViewer } from "@/modules/care/components/reports/AuditLogViewer";
import { useAuth } from "@/hooks/use-auth";

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
      <PageHeader
        title={
          <>
            <ScrollText className="h-6 w-6 text-quartier-green" />{" "}
            Aktivitaetsprotokoll
          </>
        }
        subtitle="Lueckenloses Protokoll aller Pflege-Aktivitaeten."
        backHref="/care"
      />

      <AuditLogViewer seniorId={user.id} />
    </div>
  );
}
