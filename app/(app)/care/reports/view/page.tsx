// app/(app)/care/reports/view/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Printer, Loader2, Heart } from 'lucide-react';
import { useReportData } from '@/lib/care/hooks/useReportData';
import type { CareDocumentType } from '@/lib/care/types';

const TYPE_LABELS: Record<CareDocumentType, string> = {
  care_report_daily: 'Tagesbericht',
  care_report_weekly: 'Wochenbericht',
  care_report_monthly: 'Monatsbericht',
  emergency_log: 'Hilfeanfrage-Protokoll',
  medication_report: 'Erinnerungs-Bericht',
  care_aid_application: 'Hilfsmittel-Antrag',
  tax_summary: 'Steuer-Zusammenfassung',
  usage_report: 'Nutzungsbericht',
};

function ReportViewContent() {
  const searchParams = useSearchParams();
  const seniorId = searchParams.get('senior_id') ?? undefined;
  const periodStart = searchParams.get('period_start') ?? undefined;
  const periodEnd = searchParams.get('period_end') ?? undefined;
  const type = (searchParams.get('type') as CareDocumentType) ?? undefined;

  const { reportData, loading } = useReportData({ seniorId, periodStart, periodEnd, type });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-quartier-green" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-muted-foreground">Keine Berichtsdaten verfuegbar.</p>
      </div>
    );
  }

  const typeLabel = TYPE_LABELS[reportData.type] ?? reportData.type;
  const periodFormatted = `${new Date(reportData.periodStart).toLocaleDateString('de-DE')} – ${new Date(reportData.periodEnd).toLocaleDateString('de-DE')}`;
  const generatedFormatted = new Date(reportData.generatedAt).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          /* Navigations und Buttons ausblenden */
          nav, footer, .no-print, [data-no-print] { display: none !important; }
          body { font-size: 11pt; color: #000; background: #fff; }
          @page { size: A4; margin: 15mm; }
          .print-container { padding: 0 !important; }
          .print-section { page-break-inside: avoid; margin-bottom: 12pt; }
          .print-header { border-bottom: 2pt solid #2D3142; padding-bottom: 8pt; margin-bottom: 16pt; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d1d5db; padding: 6pt 8pt; text-align: left; font-size: 10pt; }
          th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: 600; }
        }
      `}</style>

      <div className="print-container px-4 py-6 max-w-4xl mx-auto">
        {/* Drucken-Button (nur Screen) */}
        <div className="no-print mb-6">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-[#2D3142] px-6 py-3 text-sm font-medium text-white hover:bg-[#2D3142]/90 flex items-center gap-2"
          >
            <Printer className="h-5 w-5" />
            Bericht drucken / als PDF speichern
          </button>
        </div>

        {/* Bericht-Header */}
        <div className="print-header print-section mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-[#4CAF87]" />
              <span className="text-xl font-bold text-[#2D3142]">QuartierApp</span>
            </div>
            <span className="text-sm text-muted-foreground">Pflege-Bericht</span>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-[#2D3142]">{typeLabel}</h1>
            <p className="text-sm text-muted-foreground mt-1">Zeitraum: {periodFormatted}</p>
            <p className="text-xs text-muted-foreground">Erstellt am: {generatedFormatted}</p>
          </div>
        </div>

        {/* Senior-Info */}
        <div className="print-section mb-6">
          <h2 className="text-lg font-semibold text-[#2D3142] mb-3 border-b pb-2">Persoenliche Daten</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <span className="ml-2 font-medium">{reportData.senior.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Pflegestufe:</span>
              <span className="ml-2 font-medium">{reportData.senior.careLevel === 'none' ? 'Keine' : `Stufe ${reportData.senior.careLevel}`}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Profil erstellt:</span>
              <span className="ml-2 font-medium">{new Date(reportData.senior.profileCreatedAt).toLocaleDateString('de-DE')}</span>
            </div>
          </div>
        </div>

        {/* Check-in Zusammenfassung */}
        <div className="print-section mb-6">
          <h2 className="text-lg font-semibold text-[#2D3142] mb-3 border-b pb-2">Check-in Zusammenfassung</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-3 py-2 text-left font-medium">Kennzahl</th>
                <th className="border px-3 py-2 text-right font-medium">Wert</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border px-3 py-2">Gesamt Check-ins</td><td className="border px-3 py-2 text-right">{reportData.checkins.total}</td></tr>
              <tr><td className="border px-3 py-2">Mir geht es gut</td><td className="border px-3 py-2 text-right text-green-600">{reportData.checkins.ok}</td></tr>
              <tr><td className="border px-3 py-2">Nicht so gut</td><td className="border px-3 py-2 text-right text-amber-600">{reportData.checkins.notWell}</td></tr>
              <tr><td className="border px-3 py-2">Verpasst</td><td className="border px-3 py-2 text-right text-red-600">{reportData.checkins.missed}</td></tr>
              <tr className="font-semibold"><td className="border px-3 py-2">Compliance-Rate</td><td className="border px-3 py-2 text-right">{reportData.checkins.complianceRate}%</td></tr>
            </tbody>
          </table>
        </div>

        {/* Medikamenten-Compliance */}
        <div className="print-section mb-6">
          <h2 className="text-lg font-semibold text-[#2D3142] mb-3 border-b pb-2">Medikamenten-Compliance</h2>
          {reportData.medications.totalMedications === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Medikamente im Zeitraum.</p>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-[#2D3142]">{reportData.medications.overallComplianceRate}%</p>
                  <p className="text-xs text-muted-foreground">Gesamt-Compliance</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{reportData.medications.taken}</p>
                  <p className="text-xs text-muted-foreground">Eingenommen</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{reportData.medications.missed}</p>
                  <p className="text-xs text-muted-foreground">Verpasst</p>
                </div>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-3 py-2 text-left font-medium">Medikament</th>
                    <th className="border px-3 py-2 text-left font-medium">Dosierung</th>
                    <th className="border px-3 py-2 text-right font-medium">Einnahmen</th>
                    <th className="border px-3 py-2 text-right font-medium">Uebersprungen</th>
                    <th className="border px-3 py-2 text-right font-medium">Verpasst</th>
                    <th className="border px-3 py-2 text-right font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.medications.medications.map((med, i) => (
                    <tr key={i}>
                      <td className="border px-3 py-2 font-medium">{med.name}</td>
                      <td className="border px-3 py-2 text-muted-foreground">{med.dosage ?? '–'}</td>
                      <td className="border px-3 py-2 text-right text-green-600">{med.taken}</td>
                      <td className="border px-3 py-2 text-right text-amber-600">{med.skipped}</td>
                      <td className="border px-3 py-2 text-right text-red-600">{med.missed}</td>
                      <td className="border px-3 py-2 text-right font-semibold">{med.complianceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Hilfeanfrage-Aktivitaet */}
        <div className="print-section mb-6">
          <h2 className="text-lg font-semibold text-[#2D3142] mb-3 border-b pb-2">Hilfeanfrage-Aktivität</h2>
          {reportData.sos.total === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Hilfeanfragen im Zeitraum.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-[#2D3142]">{reportData.sos.total}</p>
                <p className="text-xs text-muted-foreground">Gesamt</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{reportData.sos.resolved}</p>
                <p className="text-xs text-muted-foreground">Geloest</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{reportData.sos.cancelled}</p>
                <p className="text-xs text-muted-foreground">Abgebrochen</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-[#2D3142]">
                  {reportData.sos.avgResponseMinutes != null ? `${reportData.sos.avgResponseMinutes} Min.` : '–'}
                </p>
                <p className="text-xs text-muted-foreground">Reaktionszeit</p>
              </div>
            </div>
          )}
        </div>

        {/* Termin-Uebersicht */}
        <div className="print-section mb-6">
          <h2 className="text-lg font-semibold text-[#2D3142] mb-3 border-b pb-2">Termin-Uebersicht</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-[#2D3142]">{reportData.appointments.total}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{reportData.appointments.upcoming}</p>
              <p className="text-xs text-muted-foreground">Bevorstehend</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-[#2D3142]">{reportData.appointments.past}</p>
              <p className="text-xs text-muted-foreground">Vergangen</p>
            </div>
          </div>
        </div>

        {/* Letzte Aktivitaeten */}
        {reportData.recentActivity.length > 0 && (
          <div className="print-section mb-6">
            <h2 className="text-lg font-semibold text-[#2D3142] mb-3 border-b pb-2">Letzte Aktivitaeten</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-3 py-2 text-left font-medium">Datum</th>
                  <th className="border px-3 py-2 text-left font-medium">Ereignis</th>
                  <th className="border px-3 py-2 text-left font-medium">Akteur</th>
                </tr>
              </thead>
              <tbody>
                {reportData.recentActivity.slice(0, 20).map((activity, i) => (
                  <tr key={i}>
                    <td className="border px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(activity.timestamp).toLocaleDateString('de-DE', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="border px-3 py-2">{activity.eventLabel}</td>
                    <td className="border px-3 py-2 text-muted-foreground">{activity.actorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Fusszeile */}
        <div className="print-section mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
          <p>Dieser Bericht wurde automatisch von QuartierApp generiert.</p>
          <p>QuartierApp — Hyperlokale Seniorenhilfe | DSGVO-konform | quartierapp.de</p>
        </div>
      </div>
    </>
  );
}

export default function ReportViewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-quartier-green" />
      </div>
    }>
      <ReportViewContent />
    </Suspense>
  );
}
