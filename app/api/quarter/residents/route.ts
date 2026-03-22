// app/api/quarter/residents/route.ts
// Nachbar.io — Anonymisierte Bewohnerliste fuer Chat-Anfrage-Browser
// Gibt Adressen mit anonymisierten Bewohnern (gehashte IDs) zurueck
// Filtert: eigener Haushalt, bereits verbundene, ausstehende/abgelehnte Anfragen

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashUserId, hashHouseholdId } from "@/lib/quarter/resident-hash";

export async function GET(_request: NextRequest) {
  // 1. Authentifizierung pruefen
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 }
    );
  }

  // 2. Eigenen Haushalt + Quartier ermitteln (ueber household_members → households)
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, households(quarter_id)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    // User gehoert keinem Haushalt an → leere Liste
    return NextResponse.json({ addresses: [] });
  }

  const myHouseholdId = membership.household_id;
  const quarterId = (
    membership.households as { quarter_id?: string } | null
  )?.quarter_id;

  if (!quarterId) {
    return NextResponse.json({ addresses: [] });
  }

  // 3. Alle Haushalte im Quartier laden (ohne eigenen)
  const { data: households } = await supabase
    .from("households")
    .select("id, street_name, house_number")
    .eq("quarter_id", quarterId)
    .neq("id", myHouseholdId)
    .order("street_name")
    .order("house_number");

  if (!households || households.length === 0) {
    return NextResponse.json({ addresses: [] });
  }

  const householdIds = households.map((h) => h.id);

  // 4. Alle Mitglieder der fremden Haushalte laden
  const { data: members } = await supabase
    .from("household_members")
    .select("household_id, user_id")
    .in("household_id", householdIds);

  if (!members || members.length === 0) {
    return NextResponse.json({ addresses: [] });
  }

  // 5. Bestehende Verbindungen laden (accepted, pending, declined)
  const { data: connections } = await supabase
    .from("neighbor_connections")
    .select("requester_id, target_id, status")
    .or(
      `requester_id.eq.${user.id},target_id.eq.${user.id}`
    );

  // Set mit User-IDs, die bereits verbunden/angefragt/abgelehnt sind
  const excludedUserIds = new Set<string>();
  if (connections) {
    for (const conn of connections) {
      // Beide Richtungen: wenn ich Anfragender bin → target ausschliessen
      // Wenn ich Ziel bin → requester ausschliessen
      if (conn.requester_id === user.id) {
        excludedUserIds.add(conn.target_id);
      } else {
        excludedUserIds.add(conn.requester_id);
      }
    }
  }

  // 6. Adressen mit anonymisierten Bewohnern aufbauen
  const addresses = households
    .map((household) => {
      // Bewohner dieses Haushalts filtern + nach user_id sortieren (stabile Nummerierung)
      const residents = members
        .filter(
          (m) =>
            m.household_id === household.id &&
            !excludedUserIds.has(m.user_id)
        )
        .sort((a, b) => a.user_id.localeCompare(b.user_id))
        .map((m, index) => ({
          number: index + 1,
          id: hashUserId(m.user_id),
        }));

      if (residents.length === 0) return null;

      return {
        address: `${household.street_name} ${household.house_number}`,
        householdId: hashHouseholdId(household.id),
        residents,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ addresses });
}
