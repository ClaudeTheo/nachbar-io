import { NextRequest, NextResponse } from "next/server";
import { authenticateDevice, isAuthError } from "@/lib/device/auth";

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Anfrage-Format" }, { status: 400 });
  }

  // Token-Auth: Authorization-Header > Body > Query-Param
  const authResult = await authenticateDevice(request, body);
  if (isAuthError(authResult)) return authResult;
  const { device, supabase } = authResult;

  // Payload validieren
  const ramPercent = body.ram_percent;
  const cpuTemp = body.cpu_temp;
  const restartCount = body.restart_count ?? 0;

  if (typeof ramPercent !== "number" || ramPercent < 0 || ramPercent > 100) {
    return NextResponse.json({ error: "ram_percent muss zwischen 0 und 100 liegen" }, { status: 400 });
  }
  if (typeof cpuTemp !== "number" || !Number.isFinite(cpuTemp) || cpuTemp < -40 || cpuTemp > 150) {
    return NextResponse.json({ error: "cpu_temp muss eine endliche Zahl zwischen -40 und 150 sein" }, { status: 400 });
  }
  if (typeof restartCount !== "number" || !Number.isInteger(restartCount) || restartCount < 0 || restartCount > 32767) {
    return NextResponse.json({ error: "restart_count muss eine nicht-negative Ganzzahl sein (max 32767)" }, { status: 400 });
  }

  // Heartbeat in DB speichern
  const { error } = await supabase.from("device_heartbeats").insert({
    device_token_id: device.id,
    ram_percent: Math.round(ramPercent),
    cpu_temp_celsius: cpuTemp,
    restart_count: restartCount,
  });

  if (error) {
    console.error("[device/heartbeat] Insert fehlgeschlagen:", error);
    return NextResponse.json({ error: "Heartbeat speichern fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
