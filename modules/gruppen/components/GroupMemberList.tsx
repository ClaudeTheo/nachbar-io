"use client";

import { useState, useEffect } from "react";
import { UserCheck, UserX, Shield, Crown } from "lucide-react";
import type { GroupMemberWithUser } from "@/modules/gruppen/services/types";

const ROLE_LABELS: Record<string, string> = {
  founder: "Gruender",
  admin: "Admin",
  member: "Mitglied",
};

interface GroupMemberListProps {
  groupId: string;
  isAdmin: boolean;
}

export function GroupMemberList({ groupId, isAdmin }: GroupMemberListProps) {
  const [members, setMembers] = useState<GroupMemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/members`)
      .then((r) => r.json())
      .then((data: GroupMemberWithUser[]) => setMembers(data))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [groupId]);

  async function handleApprove(userId: string) {
    const res = await fetch(`/api/groups/${groupId}/members/${userId}/approve`, {
      method: "POST",
    });
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, status: "active" as const } : m)),
      );
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Mitglied wirklich entfernen?")) return;
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "removed" }),
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    }
  }

  if (loading) return <p className="text-center text-gray-400">Laden...</p>;

  const active = members.filter((m) => m.status === "active");
  const pending = members.filter((m) => m.status === "pending");

  return (
    <div className="space-y-4">
      {pending.length > 0 && isAdmin && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-amber-700">
            Beitrittsanfragen ({pending.length})
          </h3>
          {pending.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-800">
                  {(m.users?.display_name ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm">{m.users?.display_name ?? "Unbekannt"}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(m.user_id)}
                  className="rounded-lg bg-quartier-green p-1.5 text-white hover:bg-quartier-green/90"
                >
                  <UserCheck className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleRemove(m.user_id)}
                  className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200"
                >
                  <UserX className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-600">
          Mitglieder ({active.length})
        </h3>
        {active.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                {(m.users?.display_name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm text-anthrazit">{m.users?.display_name ?? "Unbekannt"}</span>
              {m.role === "founder" && <Crown className="h-3.5 w-3.5 text-amber-500" />}
              {m.role === "admin" && <Shield className="h-3.5 w-3.5 text-blue-500" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{ROLE_LABELS[m.role]}</span>
              {isAdmin && m.role === "member" && (
                <button
                  onClick={() => handleRemove(m.user_id)}
                  className="text-gray-300 hover:text-red-400"
                >
                  <UserX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
