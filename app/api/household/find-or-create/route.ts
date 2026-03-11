import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSecureCode } from "@/lib/invite-codes";

// Ungefaehre Koordinaten pro Strasse (Mitte der Strasse)
const STREET_COORDS: Record<string, { lat: number; lng: number }> = {
  "Purkersdorfer Straße": { lat: 47.5631, lng: 7.9480 },
  "Sanarystraße": { lat: 47.5619, lng: 7.9480 },
  "Oberer Rebberg": { lat: 47.5604, lng: 7.9480 },
};

/**
 * POST /api/household/find-or-create
 * Sucht einen Haushalt anhand von Strasse und Hausnummer.
 * Wenn nicht vorhanden, wird ein neuer Haushalt angelegt.
 * Gibt die household_id zurueck.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { streetName, houseNumber } = body;

    if (!streetName || !houseNumber) {
      return NextResponse.json(
        { error: "Straße und Hausnummer sind erforderlich." },
        { status: 400 }
      );
    }

    const trimmedHouseNumber = String(houseNumber).trim();
    if (!trimmedHouseNumber) {
      return NextResponse.json(
        { error: "Hausnummer darf nicht leer sein." },
        { status: 400 }
      );
    }

    // Strasse validieren
    const validStreets = Object.keys(STREET_COORDS);
    if (!validStreets.includes(streetName)) {
      return NextResponse.json(
        { error: "Unbekannte Straße." },
        { status: 400 }
      );
    }

    // Service-Role-Client fuer Schreibzugriff
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server-Konfigurationsfehler." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Versuch: Bestehenden Haushalt finden
    const { data: existing } = await supabase
      .from("households")
      .select("id, street_name, house_number")
      .eq("street_name", streetName)
      .eq("house_number", trimmedHouseNumber)
      .single();

    if (existing) {
      return NextResponse.json({
        householdId: existing.id,
        streetName: existing.street_name,
        houseNumber: existing.house_number,
        created: false,
      });
    }

    // 2. Neuen Haushalt anlegen
    const coords = STREET_COORDS[streetName];
    // Leicht versetzten Laengengrad basierend auf Hausnummer fuer Kartenspread
    const houseNum = parseInt(trimmedHouseNumber, 10) || 0;
    const lngOffset = houseNum * 0.0005;

    const inviteCode = generateSecureCode();

    const { data: newHousehold, error: insertError } = await supabase
      .from("households")
      .insert({
        street_name: streetName,
        house_number: trimmedHouseNumber,
        lat: coords.lat,
        lng: coords.lng + lngOffset,
        verified: false,
        invite_code: inviteCode,
      })
      .select("id, street_name, house_number")
      .single();

    if (insertError) {
      console.error("Haushalt-Erstellung fehlgeschlagen:", insertError);
      return NextResponse.json(
        { error: "Haushalt konnte nicht erstellt werden." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      householdId: newHousehold.id,
      streetName: newHousehold.street_name,
      houseNumber: newHousehold.house_number,
      created: true,
    });
  } catch (err) {
    console.error("Unerwarteter Fehler:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler." },
      { status: 500 }
    );
  }
}
