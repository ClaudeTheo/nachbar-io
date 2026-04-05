"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clipboard,
  ShoppingBag,
  MapPin,
  HandHeart,
  CalendarDays,
  AlertTriangle,
  Users,
  PartyPopper,
  Star,
  Search,
  MessageCircle,
  Wrench,
  Trash2,
  Building2,
  Paperclip,
  Lightbulb,
  ShoppingCart,
  ClipboardList,
  Stethoscope,
  Heart,
  ChevronDown,
} from "lucide-react";
import { haptic } from "@/lib/haptics";

interface DiscoverItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  bgColor: string;
  iconColor: string;
}

// Primäre 8 Kategorien (immer sichtbar)
const primaryItems: DiscoverItem[] = [
  {
    href: "/board",
    label: "Brett",
    icon: Clipboard,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
  },
  {
    href: "/marketplace",
    label: "Marktplatz",
    icon: ShoppingBag,
    bgColor: "bg-green-50",
    iconColor: "text-quartier-green",
  },
  {
    href: "/map",
    label: "Karte",
    icon: MapPin,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-500",
  },
  {
    href: "/hilfe",
    label: "Hilfe",
    icon: HandHeart,
    bgColor: "bg-amber-50",
    iconColor: "text-alert-amber",
  },
  {
    href: "/gruppen",
    label: "Gruppen",
    icon: Users,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    href: "/praevention",
    label: "Prävention",
    icon: Heart,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-700",
  },
  {
    href: "/waste-calendar",
    label: "Kalender",
    icon: CalendarDays,
    bgColor: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  {
    href: "/reports",
    label: "Mängel",
    icon: AlertTriangle,
    bgColor: "bg-violet-50",
    iconColor: "text-violet-500",
  },
  {
    href: "/events",
    label: "Events",
    icon: PartyPopper,
    bgColor: "bg-pink-50",
    iconColor: "text-pink-500",
  },
  {
    href: "/experts",
    label: "Experten",
    icon: Star,
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-600",
  },
];

// Weitere Kategorien (hinter "Mehr entdecken")
const secondaryItems: DiscoverItem[] = [
  {
    href: "/whohas",
    label: "Wer hat?",
    icon: Search,
    bgColor: "bg-slate-50",
    iconColor: "text-slate-500",
  },
  {
    href: "/messages",
    label: "Chat",
    icon: MessageCircle,
    bgColor: "bg-sky-50",
    iconColor: "text-sky-500",
  },
  {
    href: "/noise",
    label: "Lärm",
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    iconColor: "text-red-400",
  },
  {
    href: "/handwerker",
    label: "Handwerker",
    icon: Wrench,
    bgColor: "bg-stone-50",
    iconColor: "text-stone-500",
  },
  {
    href: "/lost-found",
    label: "Fundbüro",
    icon: Paperclip,
    bgColor: "bg-teal-50",
    iconColor: "text-teal-500",
  },
  {
    href: "/tips",
    label: "Tipps",
    icon: Lightbulb,
    bgColor: "bg-lime-50",
    iconColor: "text-lime-600",
  },
  {
    href: "/city-services",
    label: "Rathaus",
    icon: Building2,
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-500",
  },
  {
    href: "/care/shopping",
    label: "Einkaufshilfe",
    icon: ShoppingCart,
    bgColor: "bg-cyan-50",
    iconColor: "text-cyan-500",
  },
  {
    href: "/care/tasks",
    label: "Aufgabentafel",
    icon: ClipboardList,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
  },
  {
    href: "/sprechstunde",
    label: "Sprechstunde",
    icon: Stethoscope,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
];

function DiscoverTile({ item }: { item: DiscoverItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={() => haptic("light")}
      className={`flex flex-col items-center gap-1.5 rounded-xl ${item.bgColor} p-3 transition-all duration-200 animate-card-lift hover:shadow-soft`}
    >
      <Icon className={`h-6 w-6 ${item.iconColor}`} strokeWidth={1.5} />
      <span className="text-xs font-medium text-anthrazit">{item.label}</span>
    </Link>
  );
}

export function DiscoverGrid() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section>
      <h2 className="mb-2 font-semibold text-anthrazit">Entdecken</h2>
      <div className="grid grid-cols-4 gap-2" data-testid="discover-grid">
        {primaryItems.map((item) => (
          <DiscoverTile key={item.href} item={item} />
        ))}
        {expanded &&
          secondaryItems.map((item) => (
            <DiscoverTile key={item.href} item={item} />
          ))}
      </div>
      {!expanded && (
        <button
          onClick={() => {
            setExpanded(true);
            haptic("light");
          }}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-muted-foreground/20 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-quartier-green hover:text-quartier-green"
          data-testid="discover-expand"
        >
          Mehr entdecken
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
