"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, LargeTitle, SegmentedControl } from "@/components/ui";
import { HelpRequestCard } from "@/modules/hilfe/components/HelpRequestCard";
import type { HelpRequest } from "@/modules/hilfe/services/types";

/** Hauptseite Nachbarschaftshilfe — zeigt offene Gesuche */
export default function HilfePage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [hilfeFilter, setHilfeFilter] = useState("Alle");

  useEffect(() => {
    fetch("/api/hilfe/requests")
      .then((res) => res.json())
      .then((data: HelpRequest[]) => setRequests(data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleApply(id: string) {
    try {
      const res = await fetch(`/api/hilfe/requests/${id}/match`, {
        method: "POST",
      });
      if (res.ok) {
        // Status lokal aktualisieren
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: "matched" as const } : r,
          ),
        );
      }
    } catch {
      // Fehler stillschweigend ignorieren — Nutzer sieht Status unverändert
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <LargeTitle title="Nachbar Hilfe" />

      <Link href="/hilfe/neu">
        <Button className="min-h-[56px] w-full text-lg font-semibold">
          Neues Gesuch erstellen
        </Button>
      </Link>

      <SegmentedControl
        items={["Alle", "Offen", "Vermittelt"]}
        active={hilfeFilter}
        onChange={setHilfeFilter}
      />

      {loading && (
        <p className="text-center text-gray-500">Gesuche werden geladen…</p>
      )}

      <div className="space-y-4">
        {(() => {
          if (loading) return null;
          const filtered =
            hilfeFilter === "Offen"
              ? requests.filter((r) => r.status === "active")
              : hilfeFilter === "Vermittelt"
                ? requests.filter(
                    (r) => r.status === "matched" || r.status === "closed",
                  )
                : requests;
          return filtered.length > 0 ? (
            filtered.map((req) => (
              <HelpRequestCard
                key={req.id}
                request={req}
                onApply={handleApply}
              />
            ))
          ) : (
            <p className="text-center text-gray-500">
              {hilfeFilter === "Alle"
                ? "Noch keine Gesuche vorhanden."
                : "Keine Gesuche in dieser Kategorie."}
            </p>
          );
        })()}
      </div>
    </div>
  );
}
