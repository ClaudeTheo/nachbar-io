// API: POST /api/escalation/sos
// SOS Event-Splitting: sos_opened (nur Audit-Log) vs sos_alerted (Audit + Push an Angehörige)
// Auth: Device-Token (x-device-token Header), NICHT Supabase-Session
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service-Client erstellen (umgeht RLS — Kiosk hat keine User-Session)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// Device-Token pruefen: Erst kiosk_devices Tabelle, dann ENV-Fallback
async function verifyDevice(
  supabase: ReturnType<typeof createClient>,
  deviceId: string,
  deviceToken: string
): Promise<{ valid: boolean; userId?: string }> {
  // Versuch 1: kiosk_devices Tabelle (Produktionsbetrieb)
  try {
    const { data: device } = await supabase
      .from("kiosk_devices")
      .select("id, user_id, device_token")
      .eq("device_id", deviceId)
      .eq("device_token", deviceToken)
      .maybeSingle();

    if (device) {
      return { valid: true, userId: device.user_id };
    }
  } catch {
    // Tabelle existiert noch nicht — Fallback nutzen
  }

  // Versuch 2: ENV-Fallback (Pilotphase, einzelnes Kiosk-Gerät)
  const envToken = process.env.KIOSK_DEVICE_TOKEN;
  if (envToken && deviceToken === envToken) {
    return { valid: true };
  }

  return { valid: false };
}

// Gueltige Event-Typen
const VALID_EVENT_TYPES = ["sos_opened", "sos_alerted"] as const;
type SosEventType = (typeof VALID_EVENT_TYPES)[number];

// Deduplizierungs-Fenster in Minuten
const DEDUP_WINDOW_MINUTES = 10;

export async function POST(req: NextRequest) {
  // 1. Token-Header pruefen
  const deviceToken = req.headers.get("x-device-token");
  if (!deviceToken) {
    return NextResponse.json(
      { error: "Device-Token fehlt (x-device-token Header)" },
      { status: 401 }
    );
  }

  // 2. Body parsen
  let body: { deviceId?: string; event_type?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger JSON-Body" },
      { status: 400 }
    );
  }

  const { deviceId, event_type, userId: bodyUserId } = body;

  if (!deviceId) {
    return NextResponse.json(
      { error: "deviceId fehlt im Body" },
      { status: 400 }
    );
  }

  // 3. Device verifizieren
  const supabase = getServiceClient();
  const { valid, userId: deviceUserId } = await verifyDevice(
    supabase,
    deviceId,
    deviceToken
  );

  if (!valid) {
    return NextResponse.json(
      { error: "Ungültiges Gerät oder Token" },
      { status: 403 }
    );
  }

  // 4. event_type validieren
  if (!event_type || !VALID_EVENT_TYPES.includes(event_type as SosEventType)) {
    return NextResponse.json(
      { error: "Ungültiger event_type — erlaubt: sos_opened, sos_alerted" },
      { status: 400 }
    );
  }

  // User-ID aus Body oder Device-Mapping
  const userId = bodyUserId || deviceUserId;

  // 5. Verarbeitung nach Event-Typ
  if (event_type === "sos_opened") {
    // Nur Audit-Log, KEINE Push-Benachrichtigung
    await supabase.from("org_audit_log").insert({
      action: "sos_opened",
      target_user_id: userId || null,
      details: JSON.stringify({
        deviceId,
        timestamp: new Date().toISOString(),
      }),
    });

    return NextResponse.json({ logged: true });
  }

  // --- sos_alerted: Dedup + Eskalation + Push ---

  // 6. Deduplizierung: gleicher User + sos_alerted in letzten 10 Minuten?
  const dedupCutoff = new Date(
    Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { data: existing } = await supabase
    .from("escalation_events")
    .select("id, event_type, created_at")
    .eq("user_id", userId || "")
    .eq("event_type", "sos_alerted")
    .gt("created_at", dedupCutoff)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Bereits benachrichtigt (10-Min-Sperre)" },
      { status: 429 }
    );
  }

  // 7. Eskalation eintragen
  await supabase.from("escalation_events").insert({
    user_id: userId || null,
    event_type: "sos_alerted",
    details: JSON.stringify({
      deviceId,
      timestamp: new Date().toISOString(),
    }),
  });

  // 8. Audit-Log
  await supabase.from("org_audit_log").insert({
    action: "sos_alerted",
    target_user_id: userId || null,
    details: JSON.stringify({
      deviceId,
      timestamp: new Date().toISOString(),
    }),
  });

  // 9. Angehörige laden (aktive caregiver_links)
  const { data: caregiverLinks } = await supabase
    .from("caregiver_links")
    .select("caregiver_id")
    .eq("resident_id", userId || "")
    .is("revoked_at", null);

  const caregivers = caregiverLinks || [];

  // 10. Push-Intent protokollieren (push_queue existiert noch nicht → Audit-Log)
  if (caregivers.length > 0) {
    await supabase.from("org_audit_log").insert({
      action: "sos_push_intent",
      target_user_id: userId || null,
      details: JSON.stringify({
        caregiver_ids: caregivers.map(
          (c: { caregiver_id: string }) => c.caregiver_id
        ),
        title: "SOS ausgelöst",
        body: "Notfallmappe wird angezeigt — bitte prüfen.",
        type: "sos_alert",
        timestamp: new Date().toISOString(),
      }),
    });
  }

  return NextResponse.json({
    alerted: true,
    caregiver_count: caregivers.length,
  });
}
