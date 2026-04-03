"use client";

import { useEffect, useState } from "react";
import type { CaregiverLink, CaregiverRelationshipType, ResidentStatus } from "@/lib/care/types";
import { ResidentStatusCard } from "./ResidentStatusCard";

interface ResidentStatusData {
  resident_id: string;
  display_name: string;
  status: ResidentStatus;
  last_heartbeat: string | null;
  last_checkin_status: "ok" | "not_well" | "need_help" | null;
  heartbeat_visible: boolean;
}

// Sortierreihenfolge: Kritisch zuerst
const STATUS_ORDER: Record<ResidentStatus, number> = {
  critical: 0,
  missing: 1,
  warning: 2,
  ok: 3,
};

export function CaregiverDashboard() {
  const [links, setLinks] = useState<CaregiverLink[]>([]);
  const [statuses, setStatuses] = useState<Map<string, ResidentStatusData>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Caregiver-Links laden
        const linksRes = await fetch("/api/caregiver/links");
        if (!linksRes.ok) {
          // 403 = kein Plus-Abo, kein Caregiver → nichts anzeigen (kein Fehler)
          setLoading(false);
          return;
        }

        const linksData = await linksRes.json();
        const caregiverLinks: CaregiverLink[] = linksData.as_caregiver ?? [];

        if (caregiverLinks.length === 0) {
          setLoading(false);
          return;
        }

        setLinks(caregiverLinks);

        // 2. Status für jeden Bewohner laden
        const statusMap = new Map<string, ResidentStatusData>();
        await Promise.all(
          caregiverLinks.map(async (link) => {
            try {
              const statusRes = await fetch(
                `/api/resident/status?resident_id=${link.resident_id}`,
              );
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                statusMap.set(link.resident_id, statusData);
              }
            } catch {
              // Einzelne Fehler ignorieren
            }
          }),
        );

        setStatuses(statusMap);
      } catch {
        // Netzwerkfehler — still bleiben
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Nichts anzeigen wenn keine Links vorhanden
  if (!loading && links.length === 0) return null;

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="font-semibold text-anthrazit">Ihre Angehörigen</h2>
        <p className="text-sm text-muted-foreground">Laden...</p>
      </section>
    );
  }

  // Nach Kritikalität sortieren
  const sortedLinks = [...links].sort((a, b) => {
    const statusA = statuses.get(a.resident_id)?.status ?? "ok";
    const statusB = statuses.get(b.resident_id)?.status ?? "ok";
    return STATUS_ORDER[statusA] - STATUS_ORDER[statusB];
  });

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-anthrazit">Ihre Angehörigen</h2>
      <div className="space-y-3">
        {sortedLinks.map((link) => {
          const statusData = statuses.get(link.resident_id);
          if (!statusData) return null;

          return (
            <ResidentStatusCard
              key={link.id}
              data={statusData}
              relationshipType={link.relationship_type as CaregiverRelationshipType}
            />
          );
        })}
      </div>
    </section>
  );
}
