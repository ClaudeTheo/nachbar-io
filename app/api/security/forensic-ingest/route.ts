// POST /api/security/forensic-ingest — Interner Endpunkt fuer Forensik-Logging
// Wird von der Edge-Middleware aufgerufen, laeuft in Node.js Runtime.
// Auth: Interner Secret (CRON_SECRET), nicht oeffentlich zugaenglich.

import { NextRequest, NextResponse } from "next/server";
import { writeForensicRecord } from "@/lib/security/forensic-storage";
import type { TrapType } from "@/lib/security/config";

// Node.js Runtime erzwingen (Crypto braucht Node.js)
export const runtime = "nodejs";

const VALID_TRAP_TYPES = new Set([
  "fake_admin",
  "honeypot",
  "enumeration",
  "idor",
  "brute_force",
  "scanner_header",
  "cron_probe",
]);

export async function POST(request: NextRequest) {
  // Auth: Nur mit internem Secret
  const secret = request.headers.get("x-forensic-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const body = await request.json();

    // Validierung
    if (!body.ip || typeof body.ip !== "string") {
      return NextResponse.json({ error: "ip required" }, { status: 400 });
    }
    if (!body.trapType || !VALID_TRAP_TYPES.has(body.trapType)) {
      return NextResponse.json({ error: "invalid trapType" }, { status: 400 });
    }

    await writeForensicRecord({
      eventId: body.eventId ?? undefined,
      ip: body.ip,
      userAgent: body.userAgent ?? null,
      requestUrl: body.requestUrl ?? "/unknown",
      requestMethod: body.requestMethod ?? "GET",
      responseStatus: body.responseStatus ?? undefined,
      trapType: body.trapType as TrapType,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forensic-ingest] Fehler:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
