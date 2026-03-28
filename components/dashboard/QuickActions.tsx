"use client";

import Link from "next/link";
import {
  Clipboard,
  ShoppingBag,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { haptic } from "@/lib/haptics";

const quickActions = [
  {
    href: "/board",
    label: "Brett",
    icon: Clipboard,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
    description: "Schwarzes Brett",
  },
  {
    href: "/marketplace",
    label: "Marktplatz",
    icon: ShoppingBag,
    bgColor: "bg-green-50",
    iconColor: "text-quartier-green",
    description: "Kaufen & Verkaufen",
  },
  {
    href: "/waste-calendar",
    label: "Kalender",
    icon: CalendarDays,
    bgColor: "bg-amber-50",
    iconColor: "text-alert-amber",
    description: "Müll & Events",
  },
  {
    href: "/reports/new",
    label: "Melden",
    icon: AlertTriangle,
    bgColor: "bg-violet-50",
    iconColor: "text-violet-500",
    description: "Mängel & Lärm",
  },
];

export function QuickActions() {
  return (
    <section data-testid="quick-actions" className="border-b border-[#ebe5dd] px-4 pb-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#2D3142]/40">
        Schnellzugriff
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => haptic("light")}
              className={`${action.bgColor} flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all duration-200 animate-card-lift`}
            >
              <Icon className={`h-6 w-6 ${action.iconColor}`} strokeWidth={1.5} />
              <span className="text-xs font-medium text-anthrazit">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
