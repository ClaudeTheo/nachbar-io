// components/org/OrgMemberList.tsx
// Nachbar.io — Mitgliederverwaltung für Pro Community Organisationen
"use client";

import { useCallback, useEffect, useState } from "react";

// Typen für Mitgliederdaten (aus API)
interface OrgMemberWithUser {
  id: string;
  org_id: string;
  user_id: string;
  role: "admin" | "viewer";
  assigned_quarters: string[];
  created_at: string;
  user: {
    id: string;
    display_name: string | null;
    email_hash: string | null;
  } | null;
}

// Rollen-Anzeigenamen
const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  admin: {
    label: "Admin",
    className: "bg-[#2D3142]/10 text-[#2D3142]",
  },
  viewer: {
    label: "Leserechte",
    className: "bg-gray-100 text-gray-600",
  },
};

interface OrgMemberListProps {
  orgId: string;
  currentUserRole: "admin" | "viewer";
}

export function OrgMemberList({ orgId, currentUserRole }: OrgMemberListProps) {
  const [members, setMembers] = useState<OrgMemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const isAdmin = currentUserRole === "admin";

  // Mitglieder laden
  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`);
      if (!res.ok) {
        setError("Mitglieder konnten nicht geladen werden.");
        return;
      }
      const data: OrgMemberWithUser[] = await res.json();
      setMembers(data);
    } catch {
      setError("Verbindungsfehler beim Laden der Mitglieder.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Rolle ändern (nur für Admins)
  async function handleRoleToggle(memberId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "viewer" : "admin";
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, role: newRole }),
      });
      if (res.ok) {
        // Lokal aktualisieren
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, role: newRole as "admin" | "viewer" } : m
          )
        );
      }
    } catch {
      // Fehler still ignorieren
    }
  }

  // Mitglied entfernen (2-Schritt-Bestätigung)
  async function handleRemove(memberId: string) {
    if (confirmRemoveId !== memberId) {
      // Erster Klick: Bestätigung anfordern
      setConfirmRemoveId(memberId);
      return;
    }

    // Zweiter Klick: Tatsaechlich entfernen
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    } catch {
      // Fehler still ignorieren
    } finally {
      setConfirmRemoveId(null);
    }
  }

  // Ladezustand
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4CAF87] border-t-transparent" />
      </div>
    );
  }

  // Fehler
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header mit Hinzufügen-Button (nur für Admins) */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#2D3142]">
          Mitglieder ({members.length})
        </h2>
        {isAdmin && (
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-[#4CAF87] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3d9a73]"
          >
            Mitglied hinzufügen
          </button>
        )}
      </div>

      {/* Mitgliederliste */}
      {members.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-400">Noch keine Mitglieder.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const roleConfig = ROLE_LABELS[member.role] ?? ROLE_LABELS.viewer;
            const displayName =
              member.user?.display_name ?? "Unbekannter Benutzer";

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
              >
                {/* Name + Rolle + Quartiere */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[#2D3142]">
                      {displayName}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${roleConfig.className}`}
                    >
                      {roleConfig.label}
                    </span>
                  </div>
                  {member.assigned_quarters.length > 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      Quartiere: {member.assigned_quarters.join(", ")}
                    </p>
                  )}
                </div>

                {/* Admin-Aktionen */}
                {isAdmin && (
                  <div className="ml-3 flex items-center gap-2">
                    {/* Rollen-Toggle */}
                    <button
                      type="button"
                      onClick={() => handleRoleToggle(member.id, member.role)}
                      className="min-h-[44px] rounded-lg border px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-50"
                      title={`Rolle ändern zu ${member.role === "admin" ? "Leserechte" : "Admin"}`}
                    >
                      {member.role === "admin" ? "Leserechte" : "Admin"}
                    </button>
                    {/* Entfernen (2-Schritt) */}
                    <button
                      type="button"
                      onClick={() => handleRemove(member.id)}
                      className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        confirmRemoveId === member.id
                          ? "bg-[#EF4444] text-white"
                          : "border text-red-500 hover:bg-red-50"
                      }`}
                    >
                      {confirmRemoveId === member.id
                        ? "Wirklich entfernen?"
                        : "Entfernen"}
                    </button>
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
