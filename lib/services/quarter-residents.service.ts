// Nachbar.io — Quarter-Residents-Service
// Zentralisiert Bewohnerliste, Kontaktanfrage und Geo-Quartiersuche.
// Alle Funktionen erhalten SupabaseClient als Parameter.

import type { SupabaseClient } from "@supabase/supabase-js";
import { hashUserId, hashHouseholdId } from "@/lib/quarter/resident-hash";
import { ServiceError } from "@/lib/services/service-error";

// Maximale Anzahl gleichzeitig offener Anfragen
const MAX_PENDING_REQUESTS = 3;

// ============================================================
// Typen
// ============================================================

interface AnonymizedResident {
  number: number;
  id: string;
}

interface AddressEntry {
  address: string;
  householdId: string;
  residents: AnonymizedResident[];
}

interface CreateRequestParams {
  hashedId: string;
  householdId: string;
  message: string;
}

interface CreateRequestResult {
  connectionId: string;
  targetUserId: string;
}

interface QuarterLocationResult {
  quarter_id: string;
  quarter_name: string;
  status: string;
  action: "joined" | "seeded" | "created";
}

// ============================================================
// listResidents — Anonymisierte Bewohnerliste fuer Chat-Anfrage-Browser
// ============================================================

export async function listResidents(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ addresses: (AddressEntry | null)[] }> {
  // 1. Eigenen Haushalt + Quartier ermitteln (ueber household_members → households)
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, households(quarter_id)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!membership) {
    return { addresses: [] };
  }

  const myHouseholdId = membership.household_id;
  const quarterId = (membership.households as { quarter_id?: string } | null)
    ?.quarter_id;

  if (!quarterId) {
    return { addresses: [] };
  }

  // 2. Alle Haushalte im Quartier laden (ohne eigenen)
  const { data: households } = await supabase
    .from("households")
    .select("id, street_name, house_number")
    .eq("quarter_id", quarterId)
    .neq("id", myHouseholdId)
    .order("street_name")
    .order("house_number");

  if (!households || households.length === 0) {
    return { addresses: [] };
  }

  const householdIds = households.map((h) => h.id);

  // 3. Alle Mitglieder der fremden Haushalte laden
  const { data: members } = await supabase
    .from("household_members")
    .select("household_id, user_id")
    .in("household_id", householdIds);

  if (!members || members.length === 0) {
    return { addresses: [] };
  }

  // 4. Bestehende Verbindungen laden (accepted, pending, declined)
  const { data: connections } = await supabase
    .from("neighbor_connections")
    .select("requester_id, target_id, status")
    .or(`requester_id.eq.${userId},target_id.eq.${userId}`);

  // Set mit User-IDs, die bereits verbunden/angefragt/abgelehnt sind
  const excludedUserIds = new Set<string>();
  if (connections) {
    for (const conn of connections) {
      if (conn.requester_id === userId) {
        excludedUserIds.add(conn.target_id);
      } else {
        excludedUserIds.add(conn.requester_id);
      }
    }
  }

  // 5. Adressen mit anonymisierten Bewohnern aufbauen
  const addresses = households
    .map((household) => {
      const residents = members
        .filter(
          (m) =>
            m.household_id === household.id && !excludedUserIds.has(m.user_id),
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

  return { addresses };
}

// ============================================================
// createResidentRequest — Kontaktanfrage senden
// ============================================================

export async function createResidentRequest(
  supabase: SupabaseClient,
  userId: string,
  params: CreateRequestParams,
): Promise<CreateRequestResult> {
  const { hashedId, householdId, message } = params;

  // 1. Validierung
  if (!hashedId || typeof hashedId !== "string") {
    throw new ServiceError("hashedId ist erforderlich", 400);
  }
  if (!householdId || typeof householdId !== "string") {
    throw new ServiceError("householdId ist erforderlich", 400);
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    throw new ServiceError("Nachricht darf nicht leer sein", 400);
  }
  if (message.length > 500) {
    throw new ServiceError("Nachricht darf maximal 500 Zeichen lang sein", 400);
  }

  // 2. Spam-Check: Maximal 3 ausstehende Anfragen
  const { count: pendingCount } = await supabase
    .from("neighbor_connections")
    .select("*", { count: "exact", head: true })
    .eq("requester_id", userId)
    .eq("status", "pending");

  if (pendingCount !== null && pendingCount >= MAX_PENDING_REQUESTS) {
    throw new ServiceError(
      `Sie haben bereits ${MAX_PENDING_REQUESTS} offene Anfragen. Bitte warten Sie, bis diese beantwortet wurden.`,
      429,
    );
  }

  // 3. Eigenes Quartier ermitteln (Cross-Quarter-Schutz)
  const { data: requesterMembership } = await supabase
    .from("household_members")
    .select("household_id, households(quarter_id)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!requesterMembership) {
    throw new ServiceError("Sie gehören keinem Haushalt an", 403);
  }

  const quarterId = (
    requesterMembership.households as { quarter_id?: string } | null
  )?.quarter_id;

  if (!quarterId) {
    throw new ServiceError("Quartier nicht gefunden", 404);
  }

  // 4. Alle Haushalte im eigenen Quartier laden und gehashte householdId aufloesen
  const { data: quarterHouseholds } = await supabase
    .from("households")
    .select("id")
    .eq("quarter_id", quarterId);

  if (!quarterHouseholds || quarterHouseholds.length === 0) {
    throw new ServiceError("Haushalt nicht gefunden", 404);
  }

  // Haushalt finden, dessen Hash mit der uebergebenen householdId uebereinstimmt
  const targetHousehold = quarterHouseholds.find(
    (hh) => hashHouseholdId(hh.id) === householdId,
  );

  if (!targetHousehold) {
    throw new ServiceError("Haushalt nicht gefunden", 404);
  }

  const realHouseholdId = targetHousehold.id;

  // 5. Hash aufloesen: Alle Bewohner des Haushalts laden und Hash vergleichen
  const { data: householdMembers } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", realHouseholdId);

  if (!householdMembers || householdMembers.length === 0) {
    throw new ServiceError("Haushalt nicht gefunden", 404);
  }

  // Bewohner finden, dessen Hash mit hashedId uebereinstimmt
  const targetMember = householdMembers.find(
    (m) => hashUserId(m.user_id) === hashedId,
  );

  if (!targetMember) {
    throw new ServiceError("Bewohner nicht gefunden", 404);
  }

  // 6. Selbst-Anfrage verhindern
  if (targetMember.user_id === userId) {
    throw new ServiceError(
      "Sie können sich nicht selbst eine Anfrage senden",
      400,
    );
  }

  // 7. Verbindung erstellen (mit echter Household-ID)
  const { data: connection, error: insertError } = await supabase
    .from("neighbor_connections")
    .insert({
      requester_id: userId,
      target_id: targetMember.user_id,
      message: message.trim(),
      target_household_id: realHouseholdId,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    // UNIQUE-Constraint-Verletzung (bereits eine Anfrage/Verbindung vorhanden)
    if (insertError.code === "23505") {
      throw new ServiceError(
        "Es besteht bereits eine Verbindung oder Anfrage mit diesem Nachbarn",
        409,
      );
    }

    console.error(
      "[quarter-residents.service] Insert fehlgeschlagen:",
      insertError,
    );
    throw new ServiceError("Anfrage konnte nicht erstellt werden", 500);
  }

  const { error: contactLinkError } = await supabase
    .from("contact_links")
    .insert({
      requester_id: userId,
      addressee_id: targetMember.user_id,
      status: "pending",
      note: message.trim(),
    });

  if (contactLinkError && contactLinkError.code !== "23505") {
    console.error(
      "[quarter-residents.service] Contact-Link-Insert fehlgeschlagen:",
      contactLinkError,
    );
    throw new ServiceError("Kontaktanfrage konnte nicht erstellt werden", 500);
  }

  return {
    connectionId: connection.id,
    targetUserId: targetMember.user_id,
  };
}

// ============================================================
// findQuarterByLocation — Geo-basierte Quartier-Zuweisung fuer B2C
// ============================================================

export async function findQuarterByLocation(
  supabase: SupabaseClient,
  lat: number,
  lng: number,
): Promise<QuarterLocationResult> {
  // Validierung: Koordinaten im plausiblen Bereich
  if (isNaN(lat) || isNaN(lng)) {
    throw new ServiceError("lat und lng Parameter erforderlich", 400);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ServiceError("Ungültige Koordinaten", 400);
  }

  // 1) Aktives Quartier dessen geo_boundary den Punkt enthaelt?
  const { data: containingQuarter } = await supabase.rpc(
    "find_quarter_containing_point",
    { p_lat: lat, p_lng: lng },
  );

  if (containingQuarter && containingQuarter.length > 0) {
    return {
      quarter_id: containingQuarter[0].id,
      quarter_name: containingQuarter[0].name,
      status: containingQuarter[0].status,
      action: "joined",
    };
  }

  // 2) Aktives oder keimendes Quartier im Umkreis 2km?
  const { data: nearbySeeding } = await supabase.rpc(
    "find_nearest_seeding_quarter",
    { p_lat: lat, p_lng: lng, p_radius_m: 2000 },
  );

  if (nearbySeeding && nearbySeeding.length > 0) {
    return {
      quarter_id: nearbySeeding[0].id,
      quarter_name: nearbySeeding[0].name,
      status: nearbySeeding[0].status,
      action: "seeded",
    };
  }

  // 3) Nichts gefunden: Neuen Keim anlegen (200m-Radius)
  const { data: newQuarter, error } = await supabase
    .from("quarters")
    .insert({
      name: `Quartier ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
      status: "seeding",
      center_lat: lat,
      center_lng: lng,
      geo_center: `SRID=4326;POINT(${lng} ${lat})`,
    })
    .select("id, name, status")
    .single();

  if (error) {
    throw new ServiceError("Quartier konnte nicht erstellt werden", 500);
  }

  // Boundary setzen (200m Kreis)
  await supabase.rpc("set_quarter_boundary_circle", {
    p_quarter_id: newQuarter.id,
    p_radius_m: 200,
  });

  return {
    quarter_id: newQuarter.id,
    quarter_name: newQuarter.name,
    status: "seeding",
    action: "created",
  };
}
