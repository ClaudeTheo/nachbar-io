// app/api/caregiver/kiosk-reminders/route.ts
// Nachbar.io — Kiosk-Erinnerungen: Auflisten und Anlegen (Caregiver / Haushaltsmitglied)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
  successResponse,
  careLog,
} from "@/lib/care/api-helpers";

const MAX_TITLE_LENGTH = 80;
const MAX_REMINDERS_LIMIT = 50;
const VALID_TYPES = ["appointment", "sticky"] as const;

/**
 * GET /api/caregiver/kiosk-reminders?household_id=...
 * Erinnerungen eines Haushalts auflisten. Zugriff für Caregiver und Haushaltsmitglieder.
 */
export async function GET(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  const householdId = request.nextUrl.searchParams.get("household_id");
  if (!householdId) {
    return errorResponse("household_id ist erforderlich", 400);
  }

  // Zugriffsprüfung: Caregiver-Link ODER Haushaltsmitglied
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", user.id)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  const { data: member } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (!link && !member) {
    return errorResponse("Kein Zugriff", 403);
  }

  // Erinnerungen laden: neueste zuerst
  const { data: reminders, error } = await supabase
    .from("kiosk_reminders")
    .select(
      "id, household_id, created_by, type, title, scheduled_at, acknowledged_at, expires_at, created_at"
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(MAX_REMINDERS_LIMIT);

  if (error) {
    return errorResponse("Erinnerungen konnten nicht geladen werden", 500);
  }

  return successResponse({ reminders: reminders ?? [] });
}

/**
 * POST /api/caregiver/kiosk-reminders
 * Neue Erinnerung anlegen. Body: { household_id, type, title, scheduled_at? }
 * Nur Caregiver mit aktivem Link zum Haushalt.
 */
export async function POST(request: NextRequest) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  let body: {
    household_id?: string;
    type?: string;
    title?: string;
    scheduled_at?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiger Request-Body", 400);
  }

  const { household_id, type, title, scheduled_at } = body;

  // Pflichtfelder prüfen
  if (!household_id || !type || !title) {
    return errorResponse(
      "household_id, type und title sind erforderlich",
      400
    );
  }

  // Typ validieren
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return errorResponse(
      "type muss 'appointment' oder 'sticky' sein",
      400
    );
  }

  // Titel-Länge validieren
  if (title.length < 1 || title.length > MAX_TITLE_LENGTH) {
    return errorResponse(
      `Titel muss zwischen 1 und ${MAX_TITLE_LENGTH} Zeichen lang sein`,
      400
    );
  }

  // Termine brauchen scheduled_at
  if (type === "appointment" && !scheduled_at) {
    return errorResponse(
      "Termine (appointment) benötigen ein scheduled_at Datum",
      400
    );
  }

  // scheduled_at validieren falls angegeben
  if (scheduled_at && isNaN(Date.parse(scheduled_at))) {
    return errorResponse("scheduled_at ist kein gültiges Datum", 400);
  }

  // Zugriffsprüfung: Caregiver-Link + Bewohner im Haushalt
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id, resident_id")
    .eq("caregiver_id", user.id)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (!link) {
    return errorResponse("Kein Zugriff als Angehöriger", 403);
  }

  const { data: memberCheck } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", household_id)
    .eq("user_id", link.resident_id)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (!memberCheck) {
    return errorResponse("Bewohner gehört nicht zu diesem Haushalt", 403);
  }

  // expires_at berechnen: Termine = scheduled_at + 1h, Sticky = null
  let expiresAt: string | null = null;
  if (type === "appointment" && scheduled_at) {
    const expires = new Date(scheduled_at);
    expires.setTime(expires.getTime() + 60 * 60 * 1000); // +1 Stunde
    expiresAt = expires.toISOString();
  }

  // Erinnerung anlegen
  const { data: reminder, error } = await supabase
    .from("kiosk_reminders")
    .insert({
      household_id,
      created_by: user.id,
      type,
      title,
      scheduled_at: scheduled_at ?? null,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return errorResponse("Erinnerung konnte nicht erstellt werden", 500);
  }

  careLog("kiosk-reminders", "create", {
    userId: user.id,
    reminderId: reminder.id,
    householdId: household_id,
    type,
  });

  return successResponse({ reminder }, 201);
}
