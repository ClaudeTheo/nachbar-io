"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getFeatureFlags } from "@/lib/feature-flags";
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
  Building2,
  Paperclip,
  Lightbulb,
  ShoppingCart,
  ClipboardList,
  Stethoscope,
  Heart,
  Repeat,
  UtensilsCrossed,
  Sun,
  PackageOpen,
  ClipboardCheck,
  ChevronDown,
} from "lucide-react";
import { haptic } from "@/lib/haptics";

interface DiscoverItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  bgColor: string;
  iconColor: string;
  /**
   * Feature-Flag-Key fuer Admin-Toggle (Migration 192).
   * Default-Verhalten wenn Flag in DB fehlt: Tile sichtbar.
   */
  flagKey: string;
}

// Primäre Kategorien (immer sichtbar, 12 = 3 Reihen á 4)
const primaryItems: DiscoverItem[] = [
  {
    href: "/board",
    label: "Brett",
    icon: Clipboard,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
    flagKey: "DISCOVER_TILE_BOARD",
  },
  {
    href: "/marketplace",
    label: "Marktplatz",
    icon: ShoppingBag,
    bgColor: "bg-green-50",
    iconColor: "text-quartier-green",
    flagKey: "DISCOVER_TILE_MARKETPLACE",
  },
  {
    href: "/leihboerse",
    label: "Leihbörse",
    icon: Repeat,
    bgColor: "bg-green-50",
    iconColor: "text-quartier-green",
    flagKey: "DISCOVER_TILE_LEIHBOERSE",
  },
  {
    href: "/mitessen",
    label: "Mitessen",
    icon: UtensilsCrossed,
    bgColor: "bg-rose-50",
    iconColor: "text-rose-500",
    flagKey: "DISCOVER_TILE_MITESSEN",
  },
  {
    href: "/map",
    label: "Karte",
    icon: MapPin,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-500",
    flagKey: "DISCOVER_TILE_MAP",
  },
  {
    href: "/hilfe",
    label: "Hilfe",
    icon: HandHeart,
    bgColor: "bg-amber-50",
    iconColor: "text-alert-amber",
    flagKey: "DISCOVER_TILE_HILFE",
  },
  {
    href: "/gruppen",
    label: "Gruppen",
    icon: Users,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    flagKey: "DISCOVER_TILE_GRUPPEN",
  },
  {
    href: "/praevention",
    label: "Prävention",
    icon: Heart,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-700",
    flagKey: "DISCOVER_TILE_PRAEVENTION",
  },
  {
    href: "/waste-calendar",
    label: "Kalender",
    icon: CalendarDays,
    bgColor: "bg-orange-50",
    iconColor: "text-orange-500",
    flagKey: "DISCOVER_TILE_WASTE_CALENDAR",
  },
  {
    href: "/reports",
    label: "Mängel",
    icon: AlertTriangle,
    bgColor: "bg-violet-50",
    iconColor: "text-violet-500",
    flagKey: "DISCOVER_TILE_REPORTS",
  },
  {
    href: "/events",
    label: "Veranstaltungen",
    icon: PartyPopper,
    bgColor: "bg-pink-50",
    iconColor: "text-pink-500",
    flagKey: "DISCOVER_TILE_EVENTS",
  },
  {
    href: "/experts",
    label: "Experten",
    icon: Star,
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-600",
    flagKey: "DISCOVER_TILE_EXPERTS",
  },
];

// Weitere Kategorien (hinter "Mehr entdecken")
const secondaryItems: DiscoverItem[] = [
  {
    href: "/my-day",
    label: "Mein Tag",
    icon: Sun,
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-500",
    flagKey: "DISCOVER_TILE_MY_DAY",
  },
  {
    href: "/packages",
    label: "Pakete",
    icon: PackageOpen,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
    flagKey: "DISCOVER_TILE_PACKAGES",
  },
  {
    href: "/pflegegrad-navigator",
    label: "Pflegegrad",
    icon: ClipboardCheck,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    flagKey: "DISCOVER_TILE_PFLEGEGRAD_NAVIGATOR",
  },
  {
    href: "/whohas",
    label: "Wer hat?",
    icon: Search,
    bgColor: "bg-slate-50",
    iconColor: "text-slate-500",
    flagKey: "DISCOVER_TILE_WHOHAS",
  },
  {
    href: "/messages",
    label: "Chat",
    icon: MessageCircle,
    bgColor: "bg-sky-50",
    iconColor: "text-sky-500",
    flagKey: "DISCOVER_TILE_MESSAGES",
  },
  {
    href: "/noise",
    label: "Lärm",
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    iconColor: "text-red-400",
    flagKey: "DISCOVER_TILE_NOISE",
  },
  {
    href: "/handwerker",
    label: "Handwerker",
    icon: Wrench,
    bgColor: "bg-stone-50",
    iconColor: "text-stone-500",
    flagKey: "DISCOVER_TILE_HANDWERKER",
  },
  {
    href: "/lost-found",
    label: "Fundbüro",
    icon: Paperclip,
    bgColor: "bg-teal-50",
    iconColor: "text-teal-500",
    flagKey: "DISCOVER_TILE_LOST_FOUND",
  },
  {
    href: "/tips",
    label: "Tipps",
    icon: Lightbulb,
    bgColor: "bg-lime-50",
    iconColor: "text-lime-600",
    flagKey: "DISCOVER_TILE_TIPS",
  },
  {
    href: "/city-services",
    label: "Rathaus",
    icon: Building2,
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-500",
    flagKey: "DISCOVER_TILE_CITY_SERVICES",
  },
  {
    href: "/care/shopping",
    label: "Einkaufshilfe",
    icon: ShoppingCart,
    bgColor: "bg-cyan-50",
    iconColor: "text-cyan-500",
    flagKey: "DISCOVER_TILE_CARE_SHOPPING",
  },
  {
    href: "/care/tasks",
    label: "Aufgabentafel",
    icon: ClipboardList,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
    flagKey: "DISCOVER_TILE_CARE_TASKS",
  },
  {
    href: "/sprechstunde",
    label: "Sprechstunde",
    icon: Stethoscope,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    flagKey: "DISCOVER_TILE_SPRECHSTUNDE",
  },
];

/**
 * Filtert Tile-Liste basierend auf DB-Feature-Flags.
 * - Flag in DB enabled=true OR Flag fehlt in DB komplett: sichtbar
 * - Flag in DB enabled=false: versteckt
 *
 * Exportiert fuer Tests + Wiederverwendung.
 */
export function filterTilesByFlags<T extends { flagKey: string }>(
  items: T[],
  disabledKeys: Set<string>,
): T[] {
  return items.filter((item) => !disabledKeys.has(item.flagKey));
}

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
  const [disabledKeys, setDisabledKeys] = useState<Set<string>>(new Set());

  // Pro Mount einmal die Flags laden + welche Tiles abgeschaltet wurden ableiten.
  // Default-Verhalten: Wenn ein DISCOVER_TILE_*-Flag in der DB fehlt, gilt der
  // Tile als sichtbar (sonst waere das Dashboard leer bis Mig 192 angewendet ist).
  useEffect(() => {
    let cancelled = false;
    void getFeatureFlags().then((flags) => {
      if (cancelled) return;
      const off = new Set<string>();
      for (const flag of flags) {
        if (flag.key.startsWith("DISCOVER_TILE_") && !flag.enabled) {
          off.add(flag.key);
        }
      }
      setDisabledKeys(off);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visiblePrimary = filterTilesByFlags(primaryItems, disabledKeys);
  const visibleSecondary = filterTilesByFlags(secondaryItems, disabledKeys);

  // Wenn nichts sichtbar bleibt (Admin hat alles abgeschaltet), Section wegfallen
  if (visiblePrimary.length === 0 && visibleSecondary.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-2 font-semibold text-anthrazit">Entdecken</h2>
      <div className="grid grid-cols-4 gap-2" data-testid="discover-grid">
        {visiblePrimary.map((item) => (
          <DiscoverTile key={item.href} item={item} />
        ))}
        {expanded &&
          visibleSecondary.map((item) => (
            <DiscoverTile key={item.href} item={item} />
          ))}
      </div>
      {!expanded && visibleSecondary.length > 0 && (
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
