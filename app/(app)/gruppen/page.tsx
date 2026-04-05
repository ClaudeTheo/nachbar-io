"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { GroupCard } from "@/modules/gruppen/components/GroupCard";
import type { GroupWithMembership, GroupCategory } from "@/modules/gruppen/services/types";
import { GROUP_CATEGORY_LABELS, GROUP_CATEGORIES } from "@/modules/gruppen/services/types";

export default function GruppenPage() {
  const [groups, setGroups] = useState<GroupWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GroupCategory | "alle">("alle");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: GroupWithMembership[]) => setGroups(data))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = groups.filter((g) => {
    if (filter !== "alle" && g.category !== filter) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const myGroups = filtered.filter((g) => g.my_membership?.status === "active");
  const otherGroups = filtered.filter((g) => g.my_membership?.status !== "active");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <LargeTitle title="Gruppen" />

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Gruppe suchen..."
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-quartier-green focus:outline-none"
      />

      {/* Kategorie-Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("alle")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "alle"
              ? "bg-anthrazit text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Alle
        </button>
        {GROUP_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === cat
                ? "bg-anthrazit text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {GROUP_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-gray-400">Laden...</p>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-400">Noch keine Gruppen in Ihrem Quartier</p>
          <p className="mt-1 text-sm text-gray-400">Gruenden Sie die erste Gruppe!</p>
        </div>
      ) : (
        <>
          {myGroups.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-600">Meine Gruppen</h2>
              {myGroups.map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
            </div>
          )}

          {otherGroups.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-600">
                {myGroups.length > 0 ? "Weitere Gruppen" : "Alle Gruppen"}
              </h2>
              {otherGroups.map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <Link
        href="/gruppen/neue-gruppe"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-quartier-green text-white shadow-lg hover:bg-quartier-green/90"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
