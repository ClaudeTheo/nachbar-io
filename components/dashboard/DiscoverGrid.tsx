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

type TileCategory =
  | "nachbarschaft"
  | "hilfe_pflege"
  | "quartier_info"
  | "mehr";

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
  /**
   * Semantische Kategorie fuer Dashboard-Gruppierung (Plan 2026-05-11 Task 3).
   * Tiles in `mehr` sind nur sichtbar nach Klick auf "Mehr entdecken".
   */
  category: TileCategory;
}

const CATEGORY_LABELS: Record<TileCategory, string> = {
  nachbarschaft: "Nachbarschaft",
  hilfe_pflege: "Hilfe & Pflege",
  quartier_info: "Quartier-Info",
  mehr: "Mehr Funktionen",
};

// Reihenfolge der initial sichtbaren Kategorien (mehr ist hinter Mehr-Button).
const VISIBLE_CATEGORIES: TileCategory[] = [
  "nachbarschaft",
  "hilfe_pflege",
  "quartier_info",
];

// Alle Tiles in einer flachen Liste, gruppiert ueber das `category`-Feld.
// Reihenfolge im Array bestimmt Render-Reihenfolge innerhalb jeder Kategorie.
// Exportiert, damit Tests die Liste konsistent referenzieren koennen.
export const allItems: DiscoverItem[] = [
  // === Nachbarschaft (5 Tiles, immer sichtbar) ===
  {
    href: "/board",
    label: "Brett",
    icon: Clipboard,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
    flagKey: "DISCOVER_TILE_BOARD",
    category: "nachbarschaft",
  },
  {
    href: "/hilfe",
    label: "Hilfe",
    icon: HandHeart,
    bgColor: "bg-amber-50",
    iconColor: "text-alert-amber",
    flagKey: "DISCOVER_TILE_HILFE",
    category: "nachbarschaft",
  },
  {
    href: "/marketplace",
    label: "Marktplatz",
    icon: ShoppingBag,
    bgColor: "bg-green-50",
    iconColor: "text-quartier-green",
    flagKey: "DISCOVER_TILE_MARKETPLACE",
    category: "nachbarschaft",
  },
  {
    href: "/gruppen",
    label: "Gruppen",
    icon: Users,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    flagKey: "DISCOVER_TILE_GRUPPEN",
    category: "nachbarschaft",
  },
  {
    href: "/events",
    label: "Veranstaltungen",
    icon: PartyPopper,
    bgColor: "bg-pink-50",
    iconColor: "text-pink-500",
    flagKey: "DISCOVER_TILE_EVENTS",
    category: "nachbarschaft",
  },

  // === Hilfe & Pflege (5 Tiles, immer sichtbar) ===
  {
    href: "/my-day",
    label: "Mein Tag",
    icon: Sun,
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-500",
    flagKey: "DISCOVER_TILE_MY_DAY",
    category: "hilfe_pflege",
  },
  {
    href: "/care/tasks",
    label: "Aufgabentafel",
    icon: ClipboardList,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
    flagKey: "DISCOVER_TILE_CARE_TASKS",
    category: "hilfe_pflege",
  },
  {
    href: "/care/shopping",
    label: "Einkaufshilfe",
    icon: ShoppingCart,
    bgColor: "bg-cyan-50",
    iconColor: "text-cyan-500",
    flagKey: "DISCOVER_TILE_CARE_SHOPPING",
    category: "hilfe_pflege",
  },
  {
    href: "/pflegegrad-navigator",
    label: "Pflegegrad",
    icon: ClipboardCheck,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    flagKey: "DISCOVER_TILE_PFLEGEGRAD_NAVIGATOR",
    category: "hilfe_pflege",
  },
  {
    href: "/sprechstunde",
    label: "Sprechstunde",
    icon: Stethoscope,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    flagKey: "DISCOVER_TILE_SPRECHSTUNDE",
    category: "hilfe_pflege",
  },

  // === Quartier-Info (5 Tiles, immer sichtbar) ===
  {
    href: "/map",
    label: "Karte",
    icon: MapPin,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-500",
    flagKey: "DISCOVER_TILE_MAP",
    category: "quartier_info",
  },
  {
    href: "/waste-calendar",
    label: "Muellkalender",
    icon: CalendarDays,
    bgColor: "bg-orange-50",
    iconColor: "text-orange-500",
    flagKey: "DISCOVER_TILE_WASTE_CALENDAR",
    category: "quartier_info",
  },
  {
    href: "/city-services",
    label: "Rathaus",
    icon: Building2,
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-500",
    flagKey: "DISCOVER_TILE_CITY_SERVICES",
    category: "quartier_info",
  },
  {
    href: "/reports",
    label: "Mängel",
    icon: AlertTriangle,
    bgColor: "bg-violet-50",
    iconColor: "text-violet-500",
    flagKey: "DISCOVER_TILE_REPORTS",
    category: "quartier_info",
  },
  {
    href: "/praevention",
    label: "Prävention",
    icon: Heart,
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-700",
    flagKey: "DISCOVER_TILE_PRAEVENTION",
    category: "quartier_info",
  },

  // === Mehr Funktionen (9 Tiles, hinter "Mehr entdecken") ===
  {
    href: "/experts",
    label: "Experten",
    icon: Star,
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-600",
    flagKey: "DISCOVER_TILE_EXPERTS",
    category: "mehr",
  },
  {
    href: "/handwerker",
    label: "Handwerker",
    icon: Wrench,
    bgColor: "bg-stone-50",
    iconColor: "text-stone-500",
    flagKey: "DISCOVER_TILE_HANDWERKER",
    category: "mehr",
  },
  {
    href: "/leihboerse",
    label: "Leihbörse",
    icon: Repeat,
    bgColor: "bg-green-50",
    iconColor: "text-quartier-green",
    flagKey: "DISCOVER_TILE_LEIHBOERSE",
    category: "mehr",
  },
  {
    href: "/mitessen",
    label: "Mitessen",
    icon: UtensilsCrossed,
    bgColor: "bg-rose-50",
    iconColor: "text-rose-500",
    flagKey: "DISCOVER_TILE_MITESSEN",
    category: "mehr",
  },
  {
    href: "/whohas",
    label: "Wer hat?",
    icon: Search,
    bgColor: "bg-slate-50",
    iconColor: "text-slate-500",
    flagKey: "DISCOVER_TILE_WHOHAS",
    category: "mehr",
  },
  {
    href: "/packages",
    label: "Pakete",
    icon: PackageOpen,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
    flagKey: "DISCOVER_TILE_PACKAGES",
    category: "mehr",
  },
  {
    href: "/lost-found",
    label: "Fundbüro",
    icon: Paperclip,
    bgColor: "bg-teal-50",
    iconColor: "text-teal-500",
    flagKey: "DISCOVER_TILE_LOST_FOUND",
    category: "mehr",
  },
  {
    href: "/noise",
    label: "Lärm",
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    iconColor: "text-red-400",
    flagKey: "DISCOVER_TILE_NOISE",
    category: "mehr",
  },
  {
    href: "/tips",
    label: "Tipps",
    icon: Lightbulb,
    bgColor: "bg-lime-50",
    iconColor: "text-lime-600",
    flagKey: "DISCOVER_TILE_TIPS",
    category: "mehr",
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
      // min-h-[80px] erfuellt die CLAUDE.md Senior-Regel (Pflicht-Touch-Target).
      // break-words verhindert Truncation bei langen Labels (Veranstaltungen,
      // Pflegegrad, Einkaufshilfe, Muellkalender) auf 360px-Viewport.
      className={`flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-xl ${item.bgColor} p-3 transition-all duration-200 animate-card-lift hover:shadow-soft`}
    >
      <Icon className={`h-6 w-6 ${item.iconColor}`} strokeWidth={1.5} />
      <span className="text-center text-xs font-medium leading-tight text-anthrazit break-words">
        {item.label}
      </span>
    </Link>
  );
}

function CategorySection({
  category,
  tiles,
}: {
  category: TileCategory;
  tiles: DiscoverItem[];
}) {
  if (tiles.length === 0) return null;
  return (
    <div className="mt-4 first:mt-0" data-testid={`category-${category}`}>
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        {CATEGORY_LABELS[category]}
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((item) => (
          <DiscoverTile key={item.href} item={item} />
        ))}
      </div>
    </div>
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

  const visibleTiles = filterTilesByFlags(allItems, disabledKeys);
  const tilesByCategory = (cat: TileCategory) =>
    visibleTiles.filter((t) => t.category === cat);

  const visibleCount = visibleTiles.length;
  const mehrTiles = tilesByCategory("mehr");

  // Wenn nichts sichtbar bleibt (Admin hat alles abgeschaltet), Section wegfallen
  if (visibleCount === 0) {
    return null;
  }

  return (
    <section data-testid="discover-grid">
      <h2 className="mb-2 font-semibold text-anthrazit">Entdecken</h2>

      {VISIBLE_CATEGORIES.map((cat) => (
        <CategorySection key={cat} category={cat} tiles={tilesByCategory(cat)} />
      ))}

      {expanded && mehrTiles.length > 0 && (
        <CategorySection category="mehr" tiles={mehrTiles} />
      )}

      {!expanded && mehrTiles.length > 0 && (
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
