import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { alertId } = body;

  if (!alertId || typeof alertId !== "string") {
    return NextResponse.json({ error: "alertId fehlt oder ungueltig" }, { status: 400 });
  }

  // UUID-Format validieren (N6: alertId als UUID validieren)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(alertId)) {
    return NextResponse.json({ error: "alertId muss eine gueltige UUID sein" }, { status: 400 });
  }

  // Token-Auth: Authorization-Header > Body > Query-Param
  const authResult = await authenticateDevice(request, body);
  if (isAuthError(authResult)) return authResult;
  const { device, supabase } = authResult;

  // Alert als gesehen markieren
  const { error: ackError } = await supabase
    .from("alert_responses")
    .insert({
      alert_id: alertId,
      household_id: device.household_id,
      response_type: "seen",
      note: "Gesehen via reTerminal E1001",
    });

  if (ackError) {
    return NextResponse.json({ error: "Bestätigung fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
