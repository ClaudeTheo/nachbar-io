"use client";

// components/care/CaregiverSettings.tsx
// Nachbar.io — Bewohner verwaltet seine Angehörigen (Einladen, Widerrufen, Heartbeat-Toggle)

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Loader2 } from "lucide-react";
import { MAX_CAREGIVERS_PER_RESIDENT } from "@/lib/care/constants";
import type { CaregiverLink } from "@/lib/care/types";
import { InviteCodeModal } from "../subscription/InviteCodeModal";
import { CaregiverList } from "./CaregiverList";

function extractResidentLinks(payload: unknown): CaregiverLink[] {
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const candidate = payload as {
    as_resident?: CaregiverLink[];
    data?: { as_resident?: CaregiverLink[] };
  };

  if (Array.isArray(candidate.as_resident)) {
    return candidate.as_resident;
  }

  if (Array.isArray(candidate.data?.as_resident)) {
    return candidate.data.as_resident;
  }

  return [];
}

export function CaregiverSettings() {
  const [links, setLinks] = useState<CaregiverLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const activeLinks = links.filter((l) => !l.revoked_at);
  const revokedLinks = links.filter((l) => l.revoked_at);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/caregiver/links");
      if (!res.ok) throw new Error("Laden fehlgeschlagen");
      const json = await res.json();
      setLinks(extractResidentLinks(json));
      setError(null);
    } catch {
      setError("Angehörige konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Widerruf einer Verknüpfung
  const handleRevoke = async (linkId: string, caregiverName: string) => {
    const confirmed = window.confirm(
      `Möchten Sie die Verknüpfung mit ${caregiverName} wirklich aufheben?\n\nDiese Person kann Ihren Aktivitätsstatus danach nicht mehr sehen.`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/caregiver/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoke: true }),
      });
      if (!res.ok) throw new Error("Widerruf fehlgeschlagen");
      await fetchLinks();
    } catch {
      setError("Widerruf fehlgeschlagen. Bitte versuchen Sie es erneut.");
    }
  };

  // Heartbeat-Sichtbarkeit umschalten
  const handleHeartbeatToggle = async (linkId: string, visible: boolean) => {
    try {
      const res = await fetch(`/api/caregiver/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heartbeat_visible: visible }),
      });
      if (!res.ok) throw new Error("Änderung fehlgeschlagen");
      await fetchLinks();
    } catch {
      setError("Einstellung konnte nicht geändert werden.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#4CAF87]" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Überschrift (Phase 1 Design-Doc 4.1: "Mein Kreis" Sprache) */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D3142] flex items-center gap-2">
          <Users className="h-6 w-6 text-[#4CAF87]" />
          Mein Kreis
        </h1>
        <p className="text-muted-foreground mt-1">
          Laden Sie Familie und Freunde in Ihren Kreis ein. Maximal{" "}
          {MAX_CAREGIVERS_PER_RESIDENT} Personen.
        </p>
      </div>

      {/* Fehlermeldung */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-[#2D3142]">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline text-red-600"
          >
            Schliessen
          </button>
        </div>
      )}

      {/* Einladungs-Button (Senior-Modus: min 80px). Cap-Anzeige + Voll-Status */}
      {activeLinks.length >= MAX_CAREGIVERS_PER_RESIDENT ? (
        <div
          className="w-full flex flex-col items-center justify-center gap-1 rounded-xl bg-gray-100 text-[#2D3142] font-semibold text-lg border-2 border-gray-300"
          style={{ minHeight: "80px" }}
          role="status"
          aria-live="polite"
        >
          <span>Ihr Kreis ist voll</span>
          <span className="text-sm font-normal text-muted-foreground">
            {activeLinks.length} von {MAX_CAREGIVERS_PER_RESIDENT} Personen
          </span>
        </div>
      ) : (
        <button
          onClick={() => setShowInviteModal(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-semibold text-lg hover:bg-[#3d9a74] transition-colors"
          style={{ minHeight: "80px" }}
        >
          <Plus className="h-5 w-5" />
          Jemanden einladen ({activeLinks.length}/{MAX_CAREGIVERS_PER_RESIDENT})
        </button>
      )}

      {/* Liste der Angehörigen */}
      <CaregiverList
        activeLinks={activeLinks}
        revokedLinks={revokedLinks}
        onRevoke={handleRevoke}
        onHeartbeatToggle={handleHeartbeatToggle}
      />

      {/* Modal */}
      {showInviteModal && (
        <InviteCodeModal
          onClose={() => {
            setShowInviteModal(false);
            fetchLinks();
          }}
        />
      )}
    </div>
  );
}
