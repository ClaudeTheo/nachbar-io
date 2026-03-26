// Nachbar.io — Companion Quartier-Kontext Loader
// Laedt aktuelle Quartierdaten aus Supabase fuer den Companion

import { createClient } from "@/lib/supabase/server";
import type { QuarterContext } from "./system-prompt";

/**
 * Laedt den Quartier-Kontext fuer einen bestimmten Nutzer.
 * Nutzt die Kette: household_members → households → quarters + quarter_collection_areas → waste_collection_dates.
 * Gibt Standardwerte zurueck, wenn Abfragen fehlschlagen.
 */
export async function loadQuarterContext(
  userId: string,
): Promise<QuarterContext> {
  const defaults: QuarterContext = {
    quarterName: "Unbekanntes Quartier",
    wasteDate: [],
    events: [],
    bulletinPosts: [],
    meals: [],
  };

  try {
    const supabase = await createClient();

    // 1. Quartier-ID und Name ermitteln (ueber household_members → households → quarters)
    const { data: membership } = await supabase
      .from("household_members")
      .select("household:households!inner(quarter_id)")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (!membership?.household) return defaults;

    const household = Array.isArray(membership.household)
      ? membership.household[0]
      : membership.household;
    const quarterId = (household as { quarter_id: string }).quarter_id;

    // Quartier-Name laden
    const { data: quarter } = await supabase
      .from("quarters")
      .select("name")
      .eq("id", quarterId)
      .single();

    const quarterName = quarter?.name ?? defaults.quarterName;

    // 2-4 parallel laden: Muelltermine, Events, Schwarzes Brett
    const todayStr = new Date().toISOString().split("T")[0];
    const _nowIso = new Date().toISOString();

    // Abfuhrgebiete fuer dieses Quartier ermitteln
    const { data: areaLinks } = await supabase
      .from("quarter_collection_areas")
      .select("area_id")
      .eq("quarter_id", quarterId);

    const areaIds = (areaLinks ?? []).map(
      (a: { area_id: string }) => a.area_id,
    );

    const [wasteRes, eventsRes, postsRes, mealsRes] = await Promise.all([
      // Naechste 3 Muelltermine (source-driven)
      areaIds.length > 0
        ? supabase
            .from("waste_collection_dates")
            .select("collection_date, waste_type")
            .in("area_id", areaIds)
            .gte("collection_date", todayStr)
            .eq("is_cancelled", false)
            .order("collection_date", { ascending: true })
            .limit(3)
        : Promise.resolve({ data: null, error: null }),

      // Naechste 3 Events
      supabase
        .from("events")
        .select("title, event_date")
        .eq("quarter_id", quarterId)
        .gte("event_date", todayStr)
        .order("event_date", { ascending: true })
        .limit(3),

      // Letzte 5 Schwarzes-Brett-Beitraege (help_requests mit category='board')
      supabase
        .from("help_requests")
        .select("title, category")
        .eq("quarter_id", quarterId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5),

      // Aktive Mitess-Angebote (max 3)
      supabase
        .from("shared_meals")
        .select("title, type, servings, meal_date")
        .eq("quarter_id", quarterId)
        .eq("status", "active")
        .gte("meal_date", todayStr)
        .order("meal_date", { ascending: true })
        .limit(3),
    ]);

    // Ergebnisse zusammenbauen
    const wasteDate = (wasteRes.data ?? []).map(
      (w: { collection_date: string; waste_type: string }) => ({
        date: w.collection_date,
        type: w.waste_type,
      }),
    );

    const events = (eventsRes.data ?? []).map(
      (e: { title: string; event_date: string }) => ({
        title: e.title,
        date: e.event_date,
      }),
    );

    const bulletinPosts = (postsRes.data ?? []).map(
      (p: { title: string; category: string }) => ({
        title: p.title,
        category: p.category,
      }),
    );

    const meals = (mealsRes.data ?? []).map(
      (m: {
        title: string;
        type: string;
        servings: number;
        meal_date: string;
      }) => ({
        title: m.title,
        type: m.type,
        servings: m.servings,
        meal_date: m.meal_date,
      }),
    );

    return { quarterName, wasteDate, events, bulletinPosts, meals };
  } catch (error) {
    console.error(
      "[companion/context-loader] Fehler beim Laden des Quartier-Kontexts:",
      error,
    );
    return defaults;
  }
}
