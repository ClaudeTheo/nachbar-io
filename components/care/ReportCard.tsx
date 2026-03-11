// components/care/ReportCard.tsx
// Nachbar.io — Einzelne Bericht-Karte
'use client';

import { FileText, FileWarning, Pill, FileSpreadsheet, Eye } from 'lucide-react';
import type { CareDocument, CareDocumentType } from '@/lib/care/types';

const TYPE_ICONS: Record<CareDocumentType, typeof FileText> = {
  care_report_daily: FileText,
  care_report_weekly: FileText,
  care_report_monthly: FileText,
  emergency_log: FileWarning,
  medication_report: Pill,
  care_aid_application: FileSpreadsheet,
  tax_summary: FileSpreadsheet,
  usage_report: FileSpreadsheet,
};

const TYPE_LABELS: Record<CareDocumentType, string> = {
  care_report_daily: 'Tagesbericht',
  care_report_weekly: 'Wochenbericht',
  care_report_monthly: 'Monatsbericht',
  emergency_log: 'Notfall-Protokoll',
  medication_report: 'Medikamenten-Bericht',
  care_aid_application: 'Pflegehilfsmittel-Antrag',
  tax_summary: 'Steuer-Zusammenfassung',
  usage_report: 'Nutzungsbericht',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ReportCardProps {
  document: CareDocument;
  onView?: () => void;
}

export function ReportCard({ document: doc, onView }: ReportCardProps) {
  const Icon = TYPE_ICONS[doc.type] ?? FileText;
  const label = TYPE_LABELS[doc.type] ?? doc.type;

  const periodStr = doc.period_start && doc.period_end
    ? `${new Date(doc.period_start).toLocaleDateString('de-DE')} – ${new Date(doc.period_end).toLocaleDateString('de-DE')}`
    : null;

  const createdStr = new Date(doc.created_at).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const viewUrl = doc.period_start && doc.period_end
    ? `/care/reports/view?senior_id=${doc.senior_id}&period_start=${doc.period_start}&period_end=${doc.period_end}&type=${doc.type}`
    : undefined;

  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className="rounded-lg bg-quartier-green/10 p-2 shrink-0">
        <Icon className="h-5 w-5 text-quartier-green" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#2D3142] line-clamp-1">{doc.title || label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {periodStr && <p className="text-xs text-muted-foreground">{periodStr}</p>}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{createdStr}</span>
          {doc.file_size_bytes && <span>· {formatFileSize(doc.file_size_bytes)}</span>}
        </div>
      </div>
      {viewUrl && (
        <a
          href={viewUrl}
          onClick={(e) => { if (onView) { e.preventDefault(); onView(); } }}
          className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium text-[#2D3142] hover:bg-gray-50 flex items-center gap-1"
        >
          <Eye className="h-3.5 w-3.5" />
          Ansehen
        </a>
      )}
    </div>
  );
}
