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
    bgColor: "bg-blue-500",
    description: "Schwarzes Brett",
  },
  {
    href: "/marketplace",
    label: "Marktplatz",
    icon: ShoppingBag,
    bgColor: "bg-quartier-green",
    description: "Kaufen & Verkaufen",
  },
  {
    href: "/waste-calendar",
    label: "Kalender",
    icon: CalendarDays,
    bgColor: "bg-alert-amber",
    description: "Müll & Events",
  },
  {
    href: "/reports/new",
    label: "Melden",
    icon: AlertTriangle,
    bgColor: "bg-violet-500",
    description: "Mängel & Lärm",
  },
];

export function QuickActions() {
  return (
    <section data-testid="quick-actions">
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => haptic("light")}
              className={`${action.bgColor} flex flex-col items-center justify-center gap-2 rounded-2xl p-5 text-white shadow-soft transition-all duration-200 animate-card-lift active:shadow-lg hover:brightness-110`}
            >
              <Icon className="h-8 w-8" strokeWidth={1.5} />
              <span className="text-sm font-semibold">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
