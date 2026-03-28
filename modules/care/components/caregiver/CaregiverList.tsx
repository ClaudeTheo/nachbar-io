'use client';

// components/care/CaregiverList.tsx
// Nachbar.io — Liste der Angehörigen mit Heartbeat-Toggle und Entfernen-Button

import { UserMinus, Eye, EyeOff } from 'lucide-react';
import { CAREGIVER_RELATIONSHIP_TYPES } from '@/lib/care/constants';
import type { CaregiverLink, CaregiverRelationshipType } from '@/lib/care/types';

interface CaregiverListProps {
  activeLinks: CaregiverLink[];
  revokedLinks: CaregiverLink[];
  onRevoke: (linkId: string, caregiverName: string) => void;
  onHeartbeatToggle: (linkId: string, visible: boolean) => void;
}

// Hilfsfunktion: Beziehungstyp-Label aus Konstanten
function relationshipLabel(type: CaregiverRelationshipType): string {
  return CAREGIVER_RELATIONSHIP_TYPES.find((r) => r.id === type)?.label ?? type;
}

// Hilfsfunktion: Datum formatieren
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function CaregiverList({
  activeLinks,
  revokedLinks,
  onRevoke,
  onHeartbeatToggle,
}: CaregiverListProps) {
  if (activeLinks.length === 0 && revokedLinks.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 p-6 text-center text-muted-foreground">
        <p>Sie haben noch keine Angehörigen verknüpft.</p>
        <p className="text-sm mt-1">
          Erstellen Sie einen Einladungs-Code und teilen Sie ihn mit einem Angehörigen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aktive Verknüpfungen */}
      {activeLinks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Aktive Verknüpfungen ({activeLinks.length})
          </h2>
          <div className="space-y-3">
            {activeLinks.map((link) => {
              const name = link.caregiver?.display_name ?? 'Unbekannt';
              return (
                <div
                  key={link.id}
                  className="rounded-xl border border-gray-200 p-4 space-y-3"
                >
                  {/* Kopfzeile: Name + Beziehung + Datum */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[#2D3142]">{name}</p>
                      <p className="text-sm text-muted-foreground">
                        {relationshipLabel(link.relationship_type)} — seit{' '}
                        {formatDate(link.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Heartbeat-Toggle */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-[#2D3142]">
                      {link.heartbeat_visible ? (
                        <Eye className="h-4 w-4 text-[#4CAF87]" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>Aktivitätsstatus sichtbar</span>
                    </div>
                    <button
                      onClick={() =>
                        onHeartbeatToggle(link.id, !link.heartbeat_visible)
                      }
                      role="switch"
                      aria-checked={link.heartbeat_visible}
                      className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                        link.heartbeat_visible ? 'bg-[#4CAF87]' : 'bg-gray-300'
                      }`}
                      style={{ width: '48px', height: '28px', minHeight: '44px', minWidth: '48px' }}
                    >
                      <span
                        className={`pointer-events-none inline-block rounded-full bg-white shadow transform transition-transform duration-200 ${
                          link.heartbeat_visible ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                        style={{ width: '24px', height: '24px', marginTop: '2px' }}
                      />
                    </button>
                  </div>

                  {/* Datenschutz-Erklärung */}
                  {link.heartbeat_visible && (
                    <p className="text-xs text-muted-foreground bg-gray-50 rounded-lg p-2">
                      {name} sieht, WANN Sie die App nutzen, aber NICHT was Sie tun.
                    </p>
                  )}

                  {/* Entfernen-Button */}
                  <button
                    onClick={() => onRevoke(link.id, name)}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    <UserMinus className="h-4 w-4" />
                    Entfernen
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Widerrufene Verknüpfungen (eingeklappt) */}
      {revokedLinks.length > 0 && (
        <details className="rounded-xl border border-gray-200">
          <summary
            className="px-4 py-3 cursor-pointer text-sm text-muted-foreground hover:text-[#2D3142] transition-colors select-none"
            style={{ minHeight: '44px' }}
          >
            Frühere Verknüpfungen ({revokedLinks.length})
          </summary>
          <div className="px-4 pb-4 space-y-2">
            {revokedLinks.map((link) => {
              const name = link.caregiver?.display_name ?? 'Unbekannt';
              return (
                <div
                  key={link.id}
                  className="rounded-lg bg-gray-50 p-3 text-sm text-muted-foreground"
                >
                  <p className="font-medium">{name}</p>
                  <p className="text-xs">
                    {relationshipLabel(link.relationship_type)} — entfernt am{' '}
                    {link.revoked_at ? formatDate(link.revoked_at) : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
