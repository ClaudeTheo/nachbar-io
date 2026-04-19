// app/api/device/pair/start/route.ts
// Welle B Task B3: Senior-Geraet startet QR-Pairing
// Plan: docs/plans/2026-04-19-senior-app-stufe1-implementation.md
//
// Unauthenticated POST. Senior-Geraet ruft beim Start auf, bekommt
// einen Pair-Token (JWT, 10 min TTL), zeigt diesen als QR-Code an.
// Rate-Limit: /api/device/* = 30 req/min/IP (lib/rate-limit.ts).

import { NextResponse, type NextRequest } from "next/server";
import { createPairingToken } from "@/lib/device-pairing/token";

const MAX_DEVICE_ID_LEN = 128;
const MAX_USER_AGENT_LEN = 256;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "ungueltiger JSON-Body" },
      { status: 400 },
    );
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Body muss ein Objekt sein" },
      { status: 400 },
    );
  }
  const raw = body as Record<string, unknown>;
  const device_id = typeof raw.device_id === "string" ? raw.device_id : null;
  const user_agent =
    typeof raw.user_agent === "string" ? raw.user_agent : undefined;

  if (!device_id || device_id.length === 0) {
    return NextResponse.json(
      { error: "device_id erforderlich" },
      { status: 400 },
    );
  }
  if (device_id.length > MAX_DEVICE_ID_LEN) {
    return NextResponse.json({ error: "device_id zu lang" }, { status: 400 });
  }
  if (user_agent && user_agent.length > MAX_USER_AGENT_LEN) {
    return NextResponse.json({ error: "user_agent zu lang" }, { status: 400 });
  }

  const { token, payload } = await createPairingToken({
    device_id,
    user_agent,
  });

  return NextResponse.json({
    token,
    pair_id: payload.pair_id,
    device_id,
    expires_in: payload.exp - payload.iat,
  });
}
