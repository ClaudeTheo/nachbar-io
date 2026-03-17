import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/device/weather";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";

// Kategorie-Label fuer das Device
const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: "Infrastruktur",
  events: "Veranstaltung",
  administration: "Verwaltung",
  weather: "Wetter",
  waste: "Entsorgung",
  other: "Sonstiges",
};

// Tageszeit-abhaengige Begruessung (Berlin-Timezone)
function getGreeting(): string {
  const berlinTime = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin", hour: "numeric", hour12: false });
  const hour = parseInt(berlinTime, 10);
  if (hour >= 22 || hour < 5) return "Gute Nacht";
  if (hour < 10) return "Guten Morgen";
  if (hour < 14) return "Guten Tag";
  if (hour < 18) return "Guten Nachmittag";
  return "Guten Abend";
}

export async function GET(request: NextRequest) {
  // Token-Auth: Authorization-Header > Query-Param (deprecated)
  const authResult = await authenticateDevice(request);
  if (isAuthError(authResult)) return authResult;
  const { device, supabase } = authResult;

  // User-ID + Name des Haushalt-Eigentümers ermitteln
  const { data: member } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", device.household_id)
    .not("verified_at", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const userId = member?.user_id ?? null;

  // Display-Name des Nutzers laden
  let userName = "";
  if (userId) {
    const { data: userProfile } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", userId)
      .single();
    userName = userProfile?.display_name ?? "";
  }

  // Notfall-Kategorien
  const emergencyCategories = ["fire", "medical", "crime"];

  // Heutiges Datum in Berlin-Timezone (nicht UTC) fuer korrekte Tagesgrenze
  const todayBerlin = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }); // YYYY-MM-DD

  // Parallele Abfragen (inkl. Welle-2-Daten: Fotos + Erinnerungen)
  const [weather, alertsResult, careCheckinResult, legacyCheckinResult, newsResult, photosCountResult, remindersResult] = await Promise.all([
    getWeather(),

    // Offene Alerts im Quartier (letzte 24h)
    supabase
      .from("alerts")
      .select("id, category, title, description, status, is_emergency, created_at")
      .in("status", ["open", "helping"])
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10),

    // Care-Checkin heute (neues System)
    userId
      ? supabase
          .from("care_checkins")
          .select("id, status, completed_at, scheduled_at")
          .eq("senior_id", userId)
          .not("completed_at", "is", null)
          .gte("completed_at", todayBerlin)
          .order("completed_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null, error: null }),

    // Fallback: Legacy senior_checkins
    supabase
      .from("senior_checkins")
      .select("id, checked_in_at")
      .eq("user_id", device.household_id)
      .gte("checked_in_at", todayBerlin)
      .order("checked_in_at", { ascending: false })
      .limit(1),

    // Quartiernews (Relevanz >= 5, letzte 14 Tage)
    supabase
      .from("news_items")
      .select("id, original_title, ai_summary, category, relevance_score, published_at, created_at")
      .gte("relevance_score", 5)
      .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(5),

    // Welle 2: Anzahl sichtbarer Fotos
    supabase
      .from("kiosk_photos")
      .select("id", { count: "exact", head: true })
      .eq("household_id", device.household_id)
      .eq("visible", true),

    // Welle 2: Aktive Erinnerungen (Stickies + Termine)
    supabase
      .from("kiosk_reminders")
      .select("id, type")
      .eq("household_id", device.household_id)
      .is("acknowledged_at", null)
      .limit(50),
  ]);

  // DB-Fehler loggen (nicht-fatal)
  if (alertsResult.error) console.error("[device/status] Alerts-Abfrage fehlgeschlagen:", alertsResult.error.message);
  if (careCheckinResult?.error) console.error("[device/status] Care-Checkin-Abfrage fehlgeschlagen:", careCheckinResult.error.message);
  if (legacyCheckinResult.error) console.error("[device/status] Legacy-Checkin-Abfrage fehlgeschlagen:", legacyCheckinResult.error.message);
  if (newsResult.error) console.error("[device/status] News-Abfrage fehlgeschlagen:", newsResult.error.message);

  const alerts = (alertsResult.data || []).map((a: Record<string, unknown>) => ({
    id: a.id,
    category: a.category,
    title: a.title || a.category,
    body: a.description || "",
    isEmergency: a.is_emergency || emergencyCategories.includes(a.category as string),
    createdAt: a.created_at,
  }));

  // Check-in: Care-System hat Vorrang, sonst Legacy
  const careCheckinData = careCheckinResult?.data as
    | { id: string; status: string; completed_at: string; scheduled_at: string }[]
    | null;
  const legacyCheckin = legacyCheckinResult.data?.[0]?.checked_in_at || null;
  const lastCheckin = careCheckinData && careCheckinData.length > 0
    ? careCheckinData[0].completed_at
    : legacyCheckin;

  // News fuer das Device aufbereiten
  const news = (newsResult.data || []).map((n: Record<string, unknown>) => ({
    id: n.id,
    title: n.original_title,
    summary: n.ai_summary,
    category: n.category,
    categoryLabel: CATEGORY_LABELS[n.category as string] ?? "Sonstiges",
    relevance: n.relevance_score,
    publishedAt: n.published_at ?? n.created_at,
  }));

  // Welle 2: Zaehler aufbereiten
  const remindersData = remindersResult.data ?? [];
  const photosCount = photosCountResult.count ?? 0;
  const remindersCount = remindersData.length;
  const stickiesCount = remindersData.filter((r: { type: string }) => r.type === "sticky").length;
  const appointmentsToday = remindersData.filter((r: { type: string }) => r.type === "appointment").length;

  return NextResponse.json({
    weather,
    alerts,
    lastCheckin,
    nextAppointment: null,
    unreadCount: alerts.length,
    news,
    newsCount: news.length,
    userName,
    greeting: getGreeting(),
    // Welle 2
    photosCount,
    remindersCount,
    stickiesCount,
    appointmentsToday,
  });
}
