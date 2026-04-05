"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { GroupHeader } from "@/modules/gruppen/components/GroupHeader";
import { GroupPostFeed } from "@/modules/gruppen/components/GroupPostFeed";
import { GroupMemberList } from "@/modules/gruppen/components/GroupMemberList";
import type { Group, GroupMember } from "@/modules/gruppen/services/types";
import { GROUP_CATEGORY_LABELS } from "@/modules/gruppen/services/types";

type Tab = "beitraege" | "mitglieder" | "info";

export default function GruppenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [membership, setMembership] = useState<GroupMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("beitraege");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/groups/${id}`).then((r) => r.json()),
      fetch(`/api/groups?mine=true`).then((r) => r.json()),
    ])
      .then(([groupData, myGroups]) => {
        setGroup(groupData);
        const mine = (myGroups as Array<{ id: string; my_membership?: GroupMember | null }>)
          .find((g) => g.id === id);
        setMembership(mine?.my_membership ?? null);
      })
      .catch(() => setGroup(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleJoin() {
    if (!id) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/groups/${id}/join`, { method: "POST" });
      if (res.ok) {
        const data: GroupMember = await res.json();
        setMembership(data);
        setGroup((prev) => prev ? { ...prev, member_count: prev.member_count + (data.status === "active" ? 1 : 0) } : prev);
      }
    } catch {
      // Stille Fehlerbehandlung
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!id || !confirm("Moechten Sie diese Gruppe wirklich verlassen?")) return;
    const res = await fetch(`/api/groups/${id}/leave`, { method: "POST" });
    if (res.ok) {
      setMembership(null);
      setGroup((prev) => prev ? { ...prev, member_count: Math.max(0, prev.member_count - 1) } : prev);
    }
  }

  if (loading) return <p className="p-4 text-center text-gray-400">Laden...</p>;
  if (!group) return <p className="p-4 text-center text-gray-400">Gruppe nicht gefunden</p>;

  const isMember = membership?.status === "active";
  const isAdmin = membership?.role === "founder" || membership?.role === "admin";
  const canSeeContent = isMember || group.type === "open";

  const tabs: { key: Tab; label: string }[] = [
    { key: "beitraege", label: "Beitraege" },
    { key: "mitglieder", label: "Mitglieder" },
    { key: "info", label: "Info" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <GroupHeader
        group={group}
        membership={membership}
        onJoin={handleJoin}
        onLeave={handleLeave}
        joining={joining}
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 border-b-2 py-2.5 text-center text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-quartier-green text-quartier-green"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {tab === "beitraege" && (
        canSeeContent ? (
          <GroupPostFeed groupId={id} isMember={isMember} currentUserId={user?.id ?? ""} />
        ) : (
          <p className="py-8 text-center text-gray-400">
            Treten Sie der Gruppe bei, um Beitraege zu sehen.
          </p>
        )
      )}

      {tab === "mitglieder" && (
        <GroupMemberList groupId={id} isAdmin={isAdmin} />
      )}

      {tab === "info" && (
        <div className="space-y-4 rounded-xl border border-border bg-white p-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-600">Beschreibung</h3>
            <p className="mt-1 text-sm text-gray-700">
              {group.description || "Keine Beschreibung vorhanden."}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600">Kategorie</h3>
            <p className="mt-1 text-sm text-gray-700">{GROUP_CATEGORY_LABELS[group.category]}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-600">Erstellt am</h3>
            <p className="mt-1 text-sm text-gray-700">
              {new Date(group.created_at).toLocaleDateString("de-DE")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
