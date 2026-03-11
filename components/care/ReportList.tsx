// components/care/ReportList.tsx
// Nachbar.io — Bericht-Liste
'use client';

import { FileText } from 'lucide-react';
import { useDocuments } from '@/lib/care/hooks/useDocuments';
import { ReportCard } from './ReportCard';
import type { CareDocumentType } from '@/lib/care/types';

const TYPE_GROUP_ORDER: CareDocumentType[] = [
  'care_report_daily', 'care_report_weekly', 'care_report_monthly',
  'emergency_log', 'medication_report',
  'care_aid_application', 'tax_summary', 'usage_report',
];

const GROUP_LABELS: Record<string, string> = {
  care_report_daily: 'Tagesberichte',
  care_report_weekly: 'Wochenberichte',
  care_report_monthly: 'Monatsberichte',
  emergency_log: 'Notfall-Protokolle',
  medication_report: 'Medikamenten-Berichte',
  care_aid_application: 'Pflegehilfsmittel-Antraege',
  tax_summary: 'Steuer-Zusammenfassungen',
  usage_report: 'Nutzungsberichte',
};

interface ReportListProps {
  seniorId: string;
}

export function ReportList({ seniorId }: ReportListProps) {
  const { documents, loading } = useDocuments(seniorId);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-xl border bg-card p-4 h-20" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-[#2D3142]">Noch keine Berichte erstellt</p>
        <p className="text-xs text-muted-foreground mt-1">
          Erstellen Sie oben Ihren ersten Pflegebericht.
        </p>
      </div>
    );
  }

  // Gruppiert nach Typ
  const grouped = new Map<CareDocumentType, typeof documents>();
  for (const doc of documents) {
    const list = grouped.get(doc.type) ?? [];
    list.push(doc);
    grouped.set(doc.type, list);
  }

  return (
    <div className="space-y-6">
      {TYPE_GROUP_ORDER.filter(type => grouped.has(type)).map(type => (
        <div key={type}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            {GROUP_LABELS[type] ?? type}
          </h3>
          <div className="space-y-2">
            {grouped.get(type)!.map(doc => (
              <ReportCard key={doc.id} document={doc} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
