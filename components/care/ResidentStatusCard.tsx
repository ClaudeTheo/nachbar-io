"use client";

import { CAREGIVER_RELATIONSHIP_TYPES } from "@/lib/care/constants";
import type { CaregiverRelationshipType, ResidentStatus } from "@/lib/care/types";
import { HeartbeatTimeline } from "./HeartbeatTimeline";

interface ResidentStatusData {
  resident_id: string;
  display_name: string;
  status: ResidentStatus;
  last_heartbeat: string | null;
  last_checkin_status: "ok" | "not_well" | "need_help" | null;
  heartbeat_visible: boolean;
}

interface ResidentStatusCardProps {
  data: ResidentStatusData;
  relationshipType: CaregiverRelationshipType;
}

// Farben für Status-Indikator
const STATUS_COLORS: Record<ResidentStatus, string> = {
  ok: "#4CAF87",
  warning: "#F59E0B",
  missing: "#F97316",
  critical: "#EF4444",
};

const STATUS_LABELS: Record<ResidentStatus, string> = {
  ok: "Aktiv",
  warning: "Erinnerung gesendet",
  missing: "Keine Aktivität",
  critical: "Dringend",
};

const CHECKIN_LABELS: Record<string, string> = {
  ok: "Alles gut",
  not_well: "Geht so",
  need_help: "Braucht Hilfe",
};

// Relative Zeitangabe
function relativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 2) return "eben erst";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffH < 24) return `vor ${diffH}h`;
  return `vor ${diffDays} Tagen`;
}

// Beziehungstyp-Label
function getRelationshipLabel(type: CaregiverRelationshipType): string {
  return CAREGIVER_RELATIONSHIP_TYPES.find((rt) => rt.id === type)?.label ?? type;
}

export function ResidentStatusCard({ data, relationshipType }: ResidentStatusCardProps) {
  const statusColor = STATUS_COLORS[data.status];
  const statusLabel = STATUS_LABELS[data.status];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
      {/* Kopfzeile: Name + Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-anthrazit">{data.display_name}</h3>
          <p className="text-xs text-muted-foreground">{getRelationshipLabel(relationshipType)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: statusColor }}
            aria-hidden="true"
          />
          <span className="text-xs font-medium" style={{ color: statusColor }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 space-y-2">
        {data.heartbeat_visible ? (
          <>
            {/* Letzter Heartbeat */}
            {data.last_heartbeat && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Letzte Aktivität</span>
                <span className="font-medium text-anthrazit">
                  {relativeTime(data.last_heartbeat)}
                </span>
              </div>
            )}

            {/* Letzter Check-in-Status */}
            {data.last_checkin_status && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Letzter Check-in</span>
                <span className="font-medium text-anthrazit">
                  {CHECKIN_LABELS[data.last_checkin_status] ?? data.last_checkin_status}
                </span>
              </div>
            )}

            {/* Heartbeat-Timeline */}
            <HeartbeatTimeline residentId={data.resident_id} />
          </>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            Aktivitätsstatus nicht freigegeben
          </p>
        )}
      </div>
    </div>
  );
}
