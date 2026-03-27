import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/households/by-street?street=Purkersdorfer+Straße
 *
 * Gibt alle Hausnummern für eine Straße zurück.
 * Wird im Registrierungsformular für Autocomplete verwendet.
 * Verwendet Service-Role um RLS zu umgehen (unangemeldete Nutzer).
 */
export async function GET(request: NextRequest) {
  const street = request.nextUrl.searchParams.get("street");

  if (!street) {
    return NextResponse.json({ houseNumbers: [] });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ houseNumbers: [] });
  }

  const adminDb = createClient(url, key);

  const { data, error } = await adminDb
    .from("households")
    .select("house_number")
    .eq("street_name", street)
    .order("house_number");

  if (error) {
    console.error("Hausnummern-Abfrage fehlgeschlagen:", error);
    return NextResponse.json({ houseNumbers: [] });
  }

  // Hausnummern natürlich sortieren (1, 2, 3, ... 10, 11, ... statt 1, 10, 11, 2, ...)
  const houseNumbers = (data || [])
    .map((h) => h.house_number)
    .sort((a, b) => {
      const numA = parseInt(a, 10) || 0;
      const numB = parseInt(b, 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

  return NextResponse.json({ houseNumbers });
}
