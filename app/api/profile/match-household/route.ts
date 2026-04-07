import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/profile/match-household
 * Server-seitiges Household-Matching: Nimmt Strassenname + Hausnummer,
 * sucht das passende Household im Quartier des eingeloggten Users.
 *
 * DSGVO-konform: Gibt nur die household_id zurueck, NICHT alle Adressen.
 * Ersetzt das unsichere Client-seitige Dropdown (BUG-23).
 */
export async function POST(request: NextRequest) {
  try {
    // Auth pruefen
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const body = await request.json();
    const { street_name, house_number } = body;

    if (!street_name || !house_number) {
      return NextResponse.json(
        { error: "Strassenname und Hausnummer erforderlich" },
        { status: 400 },
      );
    }

    // Quartier des Users ermitteln
    const admin = getAdminSupabase();
    const { data: membership } = await admin
      .from("household_members")
      .select("household_id, households!inner(quarter_id)")
      .eq("user_id", user.id)
      .maybeSingle();

    // Quartier-ID aus aktuellem Haushalt oder User-Profil
    let quarterId: string | null = null;
    if (membership?.households) {
      const hh = membership.households as unknown as { quarter_id: string };
      quarterId = hh.quarter_id;
    }

    if (!quarterId) {
      // Fallback: quarter_id aus User-Profil
      const { data: profile } = await admin
        .from("users")
        .select("quarter_id")
        .eq("id", user.id)
        .maybeSingle();
      quarterId = profile?.quarter_id ?? null;
    }

    if (!quarterId) {
      return NextResponse.json(
        { error: "Kein Quartier zugewiesen" },
        { status: 400 },
      );
    }

    // Household suchen: Exakter Match auf Strasse + Hausnummer im Quartier
    const normalizedStreet = street_name.trim().toLowerCase();
    const normalizedHouse = house_number.trim().toLowerCase();

    const { data: matches } = await admin
      .from("households")
      .select("id, street_name, house_number")
      .eq("quarter_id", quarterId)
      .ilike("street_name", normalizedStreet)
      .ilike("house_number", normalizedHouse)
      .limit(1);

    if (matches && matches.length > 0) {
      return NextResponse.json({
        household_id: matches[0].id,
        street_name: matches[0].street_name,
        house_number: matches[0].house_number,
      });
    }

    // Kein exakter Match — unscharfe Suche (Strasse enthält den Suchbegriff)
    const { data: fuzzyMatches } = await admin
      .from("households")
      .select("id, street_name, house_number")
      .eq("quarter_id", quarterId)
      .ilike("street_name", `%${normalizedStreet}%`)
      .ilike("house_number", normalizedHouse)
      .limit(3);

    if (fuzzyMatches && fuzzyMatches.length === 1) {
      return NextResponse.json({
        household_id: fuzzyMatches[0].id,
        street_name: fuzzyMatches[0].street_name,
        house_number: fuzzyMatches[0].house_number,
      });
    }

    if (fuzzyMatches && fuzzyMatches.length > 1) {
      // Mehrere Treffer — nur Strassen zurueckgeben, keine IDs (Datensparsamkeit)
      return NextResponse.json(
        { error: "Mehrere Adressen gefunden. Bitte genauer eingeben.", matches: fuzzyMatches.length },
        { status: 300 },
      );
    }

    return NextResponse.json(
      { error: "Adresse nicht im Quartier gefunden. Bitte prüfen Sie Ihre Eingabe." },
      { status: 404 },
    );
  } catch (error) {
    console.error("[match-household] Fehler:", error);
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 },
    );
  }
}
