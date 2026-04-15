// app/(app)/org/layout.tsx
// Nachbar.io — Layout fuer den Organisations-Bereich (Pro Community)
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// Navigations-Tabs fuer den Org-Bereich
const ORG_TABS = [
  { href: "/org", label: "Übersicht" },
  { href: "/org/reports", label: "Meldungen" },
  { href: "/org/announcements", label: "Bekanntmachungen" },
] as const;

export default function OrgLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Tab-Navigation */}
      <nav
        aria-label="Organisations-Navigation"
        className="flex gap-1 overflow-x-auto rounded-xl border bg-white p-1 shadow-sm"
      >
        {ORG_TABS.map((tab) => {
          // Exakter Match fuer /org, Prefix-Match fuer Unter-Seiten
          const isActive =
            tab.href === "/org"
              ? pathname === "/org"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex min-h-[44px] items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#2D3142] text-white"
                  : "text-[#2D3142] hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Seiteninhalt */}
      {children}
    </div>
  );
}
