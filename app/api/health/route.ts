import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Einfacher Health-Check fuer Kiosk-Connectivity-Monitoring.
 * Kein Auth noetig — nur Erreichbarkeit pruefen.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

// HEAD-Requests (vom Kiosk-Watchdog genutzt)
export async function HEAD() {
  return new Response(null, { status: 200 });
}
