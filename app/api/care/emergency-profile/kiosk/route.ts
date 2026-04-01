// API: GET /api/care/emergency-profile/kiosk
// Kiosk-Endpoint: Gibt entschlüsselte Level-1 Notfalldaten zurück
// Auth: Device-Token (x-device-token Header), NICHT Supabase-Session
// Nur Level-1 (Rettungsdienst-relevante Daten), Level-2/3 werden NICHT ausgeliefert
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/modules/care/services/crypto";

// Service-Client erstellen (umgeht RLS — Kiosk hat keine User-Session)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// Device-Token pruefen: Erst kiosk_devices Tabelle, dann ENV-Fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyDevice(
  supabase: any,
  deviceId: string,
  deviceToken: string,
): Promise<{ valid: boolean; userId?: string }> {
  // Versuch 1: kiosk_devices Tabelle (fuer Produktionsbetrieb)
  try {
    const { data: device } = (await supabase
      .from("kiosk_devices")
      .select("id, user_id, device_token")
      .eq("device_id", deviceId)
      .eq("device_token", deviceToken)
      .maybeSingle()) as {
      data: { id: string; user_id: string; device_token: string } | null;
    };

    if (device) {
      return { valid: true, userId: device.user_id };
    }
  } catch {
    // Tabelle existiert noch nicht — Fallback nutzen
  }

  // Versuch 2: ENV-Fallback (Pilotphase, einzelnes Kiosk-Geraet)
  const envToken = process.env.KIOSK_DEVICE_TOKEN;
  if (envToken && deviceToken === envToken) {
    return { valid: true };
  }

  return { valid: false };
}

export async function GET(req: NextRequest) {
  // URL-Parameter parsen (kompatibel mit Tests und Next.js Runtime)
  const url = new URL(req.url);

  // 1. Token-Header pruefen
  const deviceToken = req.headers.get("x-device-token");
  if (!deviceToken) {
    return NextResponse.json(
      { error: "Device-Token fehlt (x-device-token Header)" },
      { status: 401 },
    );
  }

  // 2. deviceId Parameter pruefen
  const deviceId = url.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json(
      { error: "deviceId Parameter fehlt" },
      { status: 400 },
    );
  }

  // 3. Device verifizieren
  const supabase = getServiceClient();
  const { valid, userId: deviceUserId } = await verifyDevice(
    supabase,
    deviceId,
    deviceToken,
  );

  if (!valid) {
    return NextResponse.json(
      { error: "Ungültiges Gerät oder Token" },
      { status: 403 },
    );
  }

  // 4. userId aus Query-Param oder Device-Mapping
  const userId = url.searchParams.get("userId") || deviceUserId;

  if (!userId) {
    return NextResponse.json(
      { error: "Kein Bewohner zugeordnet (userId fehlt)" },
      { status: 400 },
    );
  }

  // 5. Notfallprofil laden
  const { data: profile } = await supabase
    .from("emergency_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const cachedAt = new Date().toISOString();

  // 6. Audit-Log schreiben (jeder Zugriff wird protokolliert)
  await supabase.from("org_audit_log").insert({
    action: "kiosk_emergency_profile_access",
    target_user_id: userId,
    details: JSON.stringify({
      deviceId,
      hasProfile: !!profile,
      timestamp: cachedAt,
    }),
  });

  // 7. Kein Profil vorhanden
  if (!profile || !profile.level1_encrypted) {
    return NextResponse.json({ empty: true, cachedAt });
  }

  // 8. Level-1 entschluesseln (NUR Level-1 — Level-2/3 werden ignoriert)
  try {
    const level1 = JSON.parse(decrypt(profile.level1_encrypted));

    return NextResponse.json({
      fullName: level1.fullName || null,
      dateOfBirth: level1.dateOfBirth || null,
      bloodType: level1.bloodType || null,
      allergies: level1.allergies || null,
      medications: level1.medications || null,
      implants: level1.implants || null,
      emergencyContact1: level1.emergencyContact1 || null,
      emergencyContact2: level1.emergencyContact2 || null,
      cachedAt,
    });
  } catch (error) {
    console.error("Notfallprofil-Entschlüsselung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Entschlüsselung fehlgeschlagen" },
      { status: 500 },
    );
  }
}
