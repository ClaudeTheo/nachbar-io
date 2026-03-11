// components/care/AuditLogViewer.tsx
// Nachbar.io — Filterbares Aktivitaetsprotokoll
'use client';

import { useState, useMemo } from 'react';
import { ScrollText, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useAuditLog } from '@/lib/care/hooks/useAuditLog';
import { AUDIT_EVENT_LABELS } from '@/lib/care/constants';
import type { CareAuditEventType } from '@/lib/care/types';

interface AuditLogViewerProps {
  seniorId: string;
}

export function AuditLogViewer({ seniorId }: AuditLogViewerProps) {
  const { entries, loading } = useAuditLog(seniorId, 200);
  const [filterType, setFilterType] = useState<CareAuditEventType | ''>('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Gefilterte Eintraege
  const filtered = useMemo(() => {
    let result = entries;
    if (filterType) {
      result = result.filter(e => e.event_type === filterType);
    }
    if (filterStart) {
      const start = new Date(filterStart).getTime();
      result = result.filter(e => new Date(e.created_at).getTime() >= start);
    }
    if (filterEnd) {
      const end = new Date(filterEnd + 'T23:59:59').getTime();
      result = result.filter(e => new Date(e.created_at).getTime() <= end);
    }
    return result;
  }, [entries, filterType, filterStart, filterEnd]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse rounded-lg border bg-card p-3 h-14" />
        ))}
      </div>
    );
  }

  const eventTypes = Object.entries(AUDIT_EVENT_LABELS) as [CareAuditEventType, string][];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filter</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ereignistyp</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as CareAuditEventType | '')}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Alle Ereignisse</option>
              {eventTypes.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Von</label>
            <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bis</label>
            <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Ergebnisse */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <ScrollText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-[#2D3142]">Keine Eintraege vorhanden</p>
          <p className="text-xs text-muted-foreground mt-1">
            {entries.length > 0 ? 'Passen Sie die Filter an.' : 'Es wurden noch keine Aktivitaeten protokolliert.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground mb-2">{filtered.length} Eintraege</p>
          {filtered.map(entry => {
            const isExpanded = expandedId === entry.id;
            const label = AUDIT_EVENT_LABELS[entry.event_type as CareAuditEventType] ?? entry.event_type;
            const ts = new Date(entry.created_at).toLocaleDateString('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={entry.id} className="rounded-lg border bg-card">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#2D3142]">{label}</span>
                      {entry.reference_type && (
                        <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                          {entry.reference_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{ts}</span>
                      <span>·</span>
                      <span>{entry.actor?.display_name ?? 'System'}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
                {isExpanded && entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <div className="px-3 pb-3 border-t">
                    <pre className="text-xs text-muted-foreground mt-2 bg-gray-50 rounded p-2 overflow-auto max-h-40">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
