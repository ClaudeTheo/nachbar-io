"use client";

import Link from "next/link";
import { Users, Home, Activity, Flower2, Baby, Heart, Music, HandHeart, MoreHorizontal, Lock, Globe, Shield } from "lucide-react";
import type { GroupWithMembership, GroupCategory, GroupType } from "@/modules/gruppen/services/types";
import { GROUP_CATEGORY_LABELS, GROUP_TYPE_LABELS } from "@/modules/gruppen/services/types";

const CATEGORY_ICONS: Record<GroupCategory, React.ElementType> = {
  nachbarschaft: Home,
  sport: Activity,
  garten: Flower2,
  kinder: Baby,
  senioren: Heart,
  kultur: Music,
  ehrenamt: HandHeart,
  sonstiges: MoreHorizontal,
};

const TYPE_ICONS: Record<GroupType, React.ElementType> = {
  open: Globe,
  closed: Lock,
  official: Shield,
};

interface GroupCardProps {
  group: GroupWithMembership;
}

export function GroupCard({ group }: GroupCardProps) {
  const CategoryIcon = CATEGORY_ICONS[group.category] ?? MoreHorizontal;
  const TypeIcon = TYPE_ICONS[group.type];
  const isMember = group.my_membership?.status === "active";
  const isPending = group.my_membership?.status === "pending";

  return (
    <Link
      href={`/gruppen/${group.id}`}
      className={`block rounded-xl border bg-white p-4 transition-colors hover:bg-gray-50 ${
        isMember ? "border-l-4 border-l-quartier-green" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <CategoryIcon className="h-5 w-5 text-anthrazit" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-anthrazit">{group.name}</h3>
            {isPending && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                Anfrage
              </span>
            )}
          </div>
          {group.description && (
            <p className="mt-0.5 truncate text-sm text-gray-500">{group.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {group.member_count}
            </span>
            <span className="flex items-center gap-1">
              <TypeIcon className="h-3.5 w-3.5" />
              {GROUP_TYPE_LABELS[group.type]}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">
              {GROUP_CATEGORY_LABELS[group.category]}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
