'use client';

// components/care/CaregiverSettings.tsx
// Nachbar.io — Bewohner verwaltet seine Angehoerigen (Einladen, Widerrufen, Heartbeat-Toggle)

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Loader2 } from 'lucide-react';
import { MAX_CAREGIVERS_PER_RESIDENT } from '@/lib/care/constants';
import type { CaregiverLink } from '@/lib/care/types';
import { InviteCodeModal } from './InviteCodeModal';
import { CaregiverList } from './CaregiverList';

export function CaregiverSettings() {
  const [links, setLinks] = useState<CaregiverLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const activeLinks = links.filter((l) => !l.revoked_at);
  const revokedLinks = links.filter((l) => l.revoked_at);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/caregiver/links');
      if (!res.ok) throw new Error('Laden fehlgeschlagen');
      const json = await res.json();
      setLinks(json.data.as_resident ?? []);
    } catch {
      setError('Angehoerige konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Widerruf einer Verknuepfung
  const handleRevoke = async (linkId: string, caregiverName: string) => {
    const confirmed = window.confirm(
      `Moechten Sie die Verknuepfung mit ${caregiverName} wirklich aufheben?\n\nDiese Person kann Ihren Aktivitaetsstatus danach nicht mehr sehen.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/caregiver/links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revoke: true }),
      });
      if (!res.ok) throw new Error('Widerruf fehlgeschlagen');
      await fetchLinks();
    } catch {
      setError('Widerruf fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }
  };

  // Heartbeat-Sichtbarkeit umschalten
  const handleHeartbeatToggle = async (linkId: string, visible: boolean) => {
    try {
      const res = await fetch(`/api/caregiver/links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heartbeat_visible: visible }),
      });
      if (!res.ok) throw new Error('Aenderung fehlgeschlagen');
      await fetchLinks();
    } catch {
      setError('Einstellung konnte nicht geaendert werden.');
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
      {/* Ueberschrift */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D3142] flex items-center gap-2">
          <Users className="h-6 w-6 text-[#4CAF87]" />
          Angehoerige verwalten
        </h1>
        <p className="text-muted-foreground mt-1">
          Laden Sie Angehoerige ein, Ihren Aktivitaetsstatus zu sehen.
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

      {/* Einladungs-Button (Senior-Modus: min 80px) */}
      <button
        onClick={() => setShowInviteModal(true)}
        disabled={activeLinks.length >= MAX_CAREGIVERS_PER_RESIDENT}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3d9a74] transition-colors"
        style={{ minHeight: '80px' }}
      >
        <Plus className="h-5 w-5" />
        Einladungs-Code erstellen ({activeLinks.length}/{MAX_CAREGIVERS_PER_RESIDENT})
      </button>

      {/* Liste der Angehoerigen */}
      <CaregiverList
        activeLinks={activeLinks}
        revokedLinks={revokedLinks}
        onRevoke={handleRevoke}
        onHeartbeatToggle={handleHeartbeatToggle}
      />

      {/* Modal */}
      {showInviteModal && (
        <InviteCodeModal onClose={() => { setShowInviteModal(false); fetchLinks(); }} />
      )}
    </div>
  );
}
