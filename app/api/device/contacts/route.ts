// GET /api/device/contacts — Kontaktliste fuer Kiosk-Terminal (Videoanruf)
// Gibt alle aktiven Caregiver-Links mit Namen/Avatar zurueck

import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";

export async function GET(request: NextRequest) {
  // Device-Auth: Token aus Header/Query
  const authResult = await authenticateDevice(request);
  if (isAuthError(authResult)) return authResult;
  const { device, supabase } = authResult;

  // Bewohner des Haushalts finden
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", device.household_id);

  const residentIds = (members ?? []).map((m: { user_id: string }) => m.user_id);

  if (residentIds.length === 0) {
    return NextResponse.json({ contacts: [] });
  }

  // Aktive Caregiver-Links mit User-Daten joinen
  const { data: links } = await supabase
    .from("caregiver_links")
    .select(`
      id,
      caregiver_id,
      auto_answer_allowed,
      auto_answer_start,
      auto_answer_end,
      users!caregiver_links_caregiver_id_fkey(display_name, avatar_url)
    `)
    .in("resident_id", residentIds)
    .is("revoked_at", null);

  const contacts = (links ?? []).map((link: Record<string, unknown>) => {
    const user = link.users as { display_name?: string; avatar_url?: string | null } | null;
    return {
      id: link.id,
      caregiver_id: link.caregiver_id,
      caregiver_name: user?.display_name ?? "Unbekannt",
      caregiver_avatar: user?.avatar_url ?? null,
      auto_answer_allowed: link.auto_answer_allowed,
      auto_answer_start: link.auto_answer_start,
      auto_answer_end: link.auto_answer_end,
    };
  });

  return NextResponse.json({ contacts });
}
