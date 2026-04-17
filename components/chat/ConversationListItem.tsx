"use client";

import Link from "next/link";
import { Users, User } from "lucide-react";

interface ConversationListItemProps {
  href: string;
  title: string;
  subtitle?: string;
  lastMessageAt?: string | null;
  isGroup?: boolean;
  unreadCount?: number;
}

export function ConversationListItem({
  href,
  title,
  subtitle,
  lastMessageAt,
  isGroup,
  unreadCount,
}: ConversationListItemProps) {
  return (
    <Link
      href={href}
      className="flex min-h-20 items-center gap-3 border-b border-[#2D3142]/10 bg-white px-4 py-3 transition-colors hover:bg-[#2D3142]/5"
    >
      <div
        className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${
          isGroup
            ? "bg-[#4CAF87]/20 text-[#4CAF87]"
            : "bg-[#2D3142]/10 text-[#2D3142]"
        }`}
      >
        {isGroup ? <Users className="h-6 w-6" /> : <User className="h-6 w-6" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-base font-semibold text-[#2D3142]">
            {title}
          </span>
          {lastMessageAt ? (
            <span className="flex-shrink-0 text-xs text-[#2D3142]/60">
              {formatRelative(lastMessageAt)}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="truncate text-sm text-[#2D3142]/70">{subtitle}</p>
        ) : null}
      </div>
      {unreadCount && unreadCount > 0 ? (
        <span className="flex h-7 min-w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#4CAF87] px-2 text-xs font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "jetzt";
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `vor ${diffD} T`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}
