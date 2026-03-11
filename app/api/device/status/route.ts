import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeather } from "@/lib/device/weather";

// Service-Role Client (Token-basierte Auth, kein User-Session nötig)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert");
  }
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token.length < 16 || token.length > 128 || !/^[a-f0-9]+$/i.test(token)) {
    return NextResponse.json({ error: "Ungueltiges Token-Format" }, { status: 401 });
  }

  const supabase = getSupabase();

  // Token validieren und Haushalt ermitteln
  const { data: device, error: tokenError } = await supabase
    .from("device_tokens")
    .select("id, household_id")
    .eq("token", token)
    .single();

  if (tokenError || !device) {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 401 });
  }

  // Last-seen aktualisieren
  await supabase
    .from("device_tokens")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  // Notfall-Kategorien
  const emergencyCategories = ["fire", "medical", "crime"];

  // Parallele Abfragen
  const [weather, alertsResult, checkinResult] = await Promise.all([
    getWeather(),
    // Offene Alerts im Quartier (letzte 24h)
    supabase
      .from("alerts")
      .select("id, category, title, description, status, is_emergency, created_at")
      .in("status", ["open", "helping"])
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    // Heutiger Check-in (senior_checkins Tabelle)
    supabase
      .from("senior_checkins")
      .select("id, checked_in_at")
      .eq("user_id", device.household_id)
      .gte("checked_in_at", new Date().toISOString().split("T")[0])
      .order("checked_in_at", { ascending: false })
      .limit(1),
  ]);

  const alerts = (alertsResult.data || []).map((a: Record<string, unknown>) => ({
    id: a.id,
    category: a.category,
    title: a.title || a.category,
    body: a.description || "",
    isEmergency: a.is_emergency || emergencyCategories.includes(a.category as string),
    createdAt: a.created_at,
  }));

  const lastCheckin = checkinResult.data?.[0]?.checked_in_at || null;

  return NextResponse.json({
    weather,
    alerts,
    lastCheckin,
    nextAppointment: null,
    unreadCount: alerts.length,
  });
}
