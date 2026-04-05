"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Globe, Lock, Shield, Settings } from "lucide-react";
import type { Group, GroupMember } from "@/modules/gruppen/services/types";
import { GROUP_CATEGORY_LABELS, GROUP_TYPE_LABELS } from "@/modules/gruppen/services/types";

interface GroupHeaderProps {
  group: Group;
  membership: GroupMember | null;
  onJoin: () => void;
  onLeave: () => void;
  joining?: boolean;
}

export function GroupHeader({ group, membership, onJoin, onLeave, joining }: GroupHeaderProps) {
  const router = useRouter();
  const isActive = membership?.status === "active";
  const isPending = membership?.status === "pending";
  const isAdmin = membership?.role === "founder" || membership?.role === "admin";

  const TypeIcon = group.type === "open" ? Globe : group.type === "closed" ? Lock : Shield;

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push("/gruppen")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-anthrazit"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck
      </button>

      <div>
        <h1 className="text-2xl font-bold text-anthrazit">{group.name}</h1>
        {group.description && (
          <p className="mt-1 text-gray-600">{group.description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {group.member_count} {group.member_count === 1 ? "Mitglied" : "Mitglieder"}
        </span>
        <span className="flex items-center gap-1">
          <TypeIcon className="h-4 w-4" />
          {GROUP_TYPE_LABELS[group.type]}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
          {GROUP_CATEGORY_LABELS[group.category]}
        </span>
      </div>

      <div className="flex gap-2">
        {!membership && (
          <button
            onClick={onJoin}
            disabled={joining}
            className="rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white hover:bg-quartier-green/90 disabled:opacity-50"
          >
            {joining ? "..." : group.type === "closed" ? "Beitritt anfragen" : "Beitreten"}
          </button>
        )}
        {isPending && (
          <span className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
            Anfrage gestellt
          </span>
        )}
        {isActive && !isAdmin && (
          <button
            onClick={onLeave}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Verlassen
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => router.push(`/gruppen/${group.id}/bearbeiten`)}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Verwalten
          </button>
        )}
      </div>
    </div>
  );
}
