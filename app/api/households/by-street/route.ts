import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getHouseNumbersByStreet } from "@/lib/services/household.service";

// In-Memory Rate-Limit: max 10 Anfragen pro IP pro Minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

/**
 * GET /api/households/by-street?street=Purkersdorfer+Straße&quarter_id=...
 *
 * Gibt Hausnummern fuer eine Strasse zurueck (Registrierungs-Autocomplete).
 * Verwendet Service-Role weil Pre-Auth (unangemeldete Nutzer).
 * Abgesichert durch: Rate-Limit (10/min/IP) + nur Hausnummern (keine Bewohner-Daten).
 */
export async function GET(request: NextRequest) {
  // Rate-Limit pruefen
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warten Sie einen Moment." },
      { status: 429 },
    );
  }

  const street = request.nextUrl.searchParams.get("street");
  if (!street || street.length < 3) {
    return NextResponse.json({ houseNumbers: [] });
  }

  // Maximal 100 Zeichen fuer Street-Parameter (Injection-Schutz)
  if (street.length > 100) {
    return NextResponse.json({ houseNumbers: [] });
  }

  const adminDb = getAdminSupabase();
  const houseNumbers = await getHouseNumbersByStreet(adminDb, street);

  return NextResponse.json({ houseNumbers });
}
