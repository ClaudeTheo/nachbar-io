"use client";

import { useEffect, useState } from "react";
import { QuarterMap } from "@/components/QuarterMap";
import { AlertCard } from "@/components/AlertCard";
import { createClient } from "@/lib/supabase/client";
import type { Alert, Household } from "@/lib/supabase/types";

export default function MapPage() {
  const [households, setHouseholds] = useState<(Household & { alert?: Alert })[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: householdData } = await supabase
        .from("households")
        .select("*")
        .eq("verified", true);

      const { data: alertData } = await supabase
        .from("alerts")
        .select("*, user:users(display_name, avatar_url), household:households(street_name, house_number, lat, lng)")
        .in("status", ["open", "help_coming"])
        .order("created_at", { ascending: false });

      if (householdData) {
        const merged = householdData.map((h) => ({
          ...h,
          alert: (alertData as unknown as Alert[])?.find((a) => a.household_id === h.id),
        }));
        setHouseholds(merged);
      }
    }

    load();
  }, []);

  function handleMarkerClick(householdId: string) {
    const household = households.find((h) => h.id === householdId);
    if (household?.alert) {
      setSelectedAlert(household.alert);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-anthrazit">Quartierskarte</h1>

      {/* Karte */}
      <QuarterMap
        households={households}
        onMarkerClick={handleMarkerClick}
        className="h-[60vh] rounded-xl shadow-md"
      />

      {/* Legende */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-quartier-green" style={{ boxShadow: "0 0 4px #4CAF87" }} />
          Alles gut
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-alert-amber animate-pulse-alert" style={{ boxShadow: "0 0 6px #F59E0B" }} />
          Hilfe gesucht
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-success-green" style={{ boxShadow: "0 0 4px #22C55E" }} />
          Hilfe unterwegs
        </span>
      </div>

      {/* Ausgewählter Alert */}
      {selectedAlert && (
        <div className="mt-4">
          <AlertCard alert={selectedAlert} />
          <button
            onClick={() => setSelectedAlert(null)}
            className="mt-2 w-full text-center text-xs text-muted-foreground hover:underline"
          >
            Auswahl aufheben
          </button>
        </div>
      )}
    </div>
  );
}
