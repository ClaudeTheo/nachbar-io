import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";

export async function GET(request: NextRequest) {
  const authResult = await authenticateDevice(request);
  if (isAuthError(authResult)) return authResult;
  const { device, supabase } = authResult;

  const now = new Date().toISOString();

  // Aktive Sticky Notes (nicht bestätigt)
  const { data: stickies } = await supabase
    .from("kiosk_reminders")
    .select("id, title, created_at")
    .eq("household_id", device.household_id)
    .eq("type", "sticky")
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  // Anstehende Termine (nächste 7 Tage, nicht abgelaufen)
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: appointments } = await supabase
    .from("kiosk_reminders")
    .select("id, title, scheduled_at, expires_at")
    .eq("household_id", device.household_id)
    .eq("type", "appointment")
    .is("acknowledged_at", null)
    .gte("scheduled_at", now)
    .lte("scheduled_at", in7Days)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  // Nächster Termin innerhalb 15 Minuten (für Popup)
  const in15Min = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const upcomingPopup =
    (appointments ?? []).find(
      (a) => a.scheduled_at && a.scheduled_at <= in15Min
    ) ?? null;

  return NextResponse.json({
    stickies: stickies ?? [],
    appointments: appointments ?? [],
    upcomingPopup,
  });
}
