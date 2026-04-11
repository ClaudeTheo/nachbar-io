// app/(app)/quartier/QuartierHubLegacy.tsx
// Legacy Quartier Hub — 6 Kacheln zur klassischen Community-Navigation.
// Phase-1 Task B-5: Nicht mehr der Default-Einstieg. Wird nur noch gerendert,
// wenn das Feature-Flag `legacy_quartier_hub` aktiv ist (Rollback-Pfad).
// Gewinner der Drift-Aufloesung ist `/quartier-info` (siehe
// docs/plans/phase1-quartier-route-decision.md im Parent-Repo).
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  ClipboardList,
  ShoppingBag,
  CalendarDays,
  MapPin,
  HandHeart,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { useQuarter } from "@/lib/quarters";

export function QuartierHubLegacy() {
  const { currentQuarter, loading: quarterLoading } = useQuarter();
  const [marketplaceCount, setMarketplaceCount] = useState<number | null>(null);
  const [eventsThisWeek, setEventsThisWeek] = useState<number | null>(null);
  const [groupsCount, setGroupsCount] = useState<number | null>(null);

  // Marktplatz-Anzahl laden
  useEffect(() => {
    if (!currentQuarter?.id) return;
    const supabase = createClient();
    async function loadMarketplaceCount() {
      try {
        const { count } = await supabase
          .from("marketplace_items")
          .select("*", { count: "exact", head: true })
          .eq("quarter_id", currentQuarter!.id)
          .eq("status", "active");
        setMarketplaceCount(count ?? 0);
      } catch {
        /* silent */
      }
    }
    loadMarketplaceCount();
  }, [currentQuarter?.id]);

  // Veranstaltungen diese Woche laden
  useEffect(() => {
    if (!currentQuarter?.id) return;
    const supabase = createClient();
    async function loadEvents() {
      try {
        const now = new Date();
        const endOfWeek = new Date();
        endOfWeek.setDate(now.getDate() + 7);
        const { count } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("quarter_id", currentQuarter!.id)
          .gte("date", now.toISOString())
          .lte("date", endOfWeek.toISOString());
        setEventsThisWeek(count ?? 0);
      } catch {
        /* silent */
      }
    }
    loadEvents();
  }, [currentQuarter?.id]);

  // Gruppen-Anzahl laden
  useEffect(() => {
    if (!currentQuarter?.id) return;
    const supabase = createClient();
    async function loadGroups() {
      try {
        const { count } = await supabase
          .from("groups")
          .select("*", { count: "exact", head: true })
          .eq("quarter_id", currentQuarter!.id);
        setGroupsCount(count ?? 0);
      } catch {
        /* silent */
      }
    }
    loadGroups();
  }, [currentQuarter?.id]);

  if (quarterLoading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[100px] bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <PageHeader
        title={
          <>
            <Building2 className="h-6 w-6 text-blue-500" /> Mein Quartier
          </>
        }
        subtitle={currentQuarter?.name ?? "Ihr Quartier"}
        backHref="/dashboard"
        backLabel="Zurück zum Dashboard"
      />

      {/* 6 Kacheln im 2-Spalten-Raster */}
      <div className="grid grid-cols-2 gap-3">
        {/* 1. Schwarzes Brett */}
        <Link
          href="/board"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-quartier-green" />
            <span className="font-semibold text-anthrazit">
              Schwarzes Brett
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Neuigkeiten</p>
        </Link>

        {/* 2. Marktplatz */}
        <Link
          href="/marketplace"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-anthrazit">Marktplatz</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {marketplaceCount !== null
              ? `${marketplaceCount} Angebote`
              : "Angebote & Gesuche"}
          </p>
        </Link>

        {/* 3. Veranstaltungen */}
        <Link
          href="/events"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-violet-500" />
            <span className="font-semibold text-anthrazit">
              Veranstaltungen
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {eventsThisWeek !== null
              ? `${eventsThisWeek} diese Woche`
              : "Events & Treffen"}
          </p>
        </Link>

        {/* 4. Karte */}
        <Link
          href="/map"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-500" />
            <span className="font-semibold text-anthrazit">Karte</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Quartier entdecken
          </p>
        </Link>

        {/* 5. Hilfe */}
        <Link
          href="/hilfe"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-anthrazit">Hilfe</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">geben & nehmen</p>
        </Link>

        {/* 6. Gruppen */}
        <Link
          href="/gruppen"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-anthrazit">Gruppen</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {groupsCount !== null ? `${groupsCount} aktiv` : "Gemeinschaft"}
          </p>
        </Link>
      </div>
    </div>
  );
}
