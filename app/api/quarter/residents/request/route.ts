// app/api/quarter/residents/request/route.ts
// Nachbar.io — Kontaktanfrage senden (Chat-Anfrage-Browser)
// Spam-Schutz: max. 3 ausstehende Anfragen pro Nutzer
// Hash-Aufloesung: Anonyme ID → echter User via HMAC-Vergleich
// Quarter-Scope: Haushalt wird nur im eigenen Quartier gesucht (Cross-Quarter-Schutz)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashUserId, hashHouseholdId } from "@/lib/quarter/resident-hash";

// Maximale Anzahl gleichzeitig offener Anfragen
const MAX_PENDING_REQUESTS = 3;

export async function POST(request: NextRequest) {
  // 1. Authentifizierung prüfen
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

  // 2. Body parsen und validieren
  let body: { hashedId?: string; householdId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges JSON-Format" },
      { status: 400 }
    );
  }

  const { hashedId, householdId, message } = body;

  if (!hashedId || typeof hashedId !== "string") {
    return NextResponse.json(
      { error: "hashedId ist erforderlich" },
      { status: 400 }
    );
  }

  if (!householdId || typeof householdId !== "string") {
    return NextResponse.json(
      { error: "householdId ist erforderlich" },
      { status: 400 }
    );
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Nachricht darf nicht leer sein" },
      { status: 400 }
    );
  }

  if (message.length > 500) {
    return NextResponse.json(
      { error: "Nachricht darf maximal 500 Zeichen lang sein" },
      { status: 400 }
    );
  }

  // 3. Spam-Check: Maximal 3 ausstehende Anfragen
  const { count: pendingCount } = await supabase
    .from("neighbor_connections")
    .select("*", { count: "exact", head: true })
    .eq("requester_id", user.id)
    .eq("status", "pending");

  if (pendingCount !== null && pendingCount >= MAX_PENDING_REQUESTS) {
    return NextResponse.json(
      {
        error: `Sie haben bereits ${MAX_PENDING_REQUESTS} offene Anfragen. Bitte warten Sie, bis diese beantwortet wurden.`,
      },
      { status: 429 }
    );
  }

  // 4. Eigenes Quartier ermitteln (Cross-Quarter-Schutz)
  const { data: requesterMembership } = await supabase
    .from("household_members")
    .select("household_id, households(quarter_id)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!requesterMembership) {
    return NextResponse.json(
      { error: "Sie gehören keinem Haushalt an" },
      { status: 403 }
    );
  }

  const quarterId = (
    requesterMembership.households as { quarter_id?: string } | null
  )?.quarter_id;

  if (!quarterId) {
    return NextResponse.json(
      { error: "Quartier nicht gefunden" },
      { status: 404 }
    );
  }

  // 5. Alle Haushalte im eigenen Quartier laden und gehashte householdId auflösen
  const { data: quarterHouseholds } = await supabase
    .from("households")
    .select("id")
    .eq("quarter_id", quarterId);

  if (!quarterHouseholds || quarterHouseholds.length === 0) {
    return NextResponse.json(
      { error: "Haushalt nicht gefunden" },
      { status: 404 }
    );
  }

  // Haushalt finden, dessen Hash mit der übergebenen householdId übereinstimmt
  const targetHousehold = quarterHouseholds.find(
    (hh) => hashHouseholdId(hh.id) === householdId
  );

  if (!targetHousehold) {
    return NextResponse.json(
      { error: "Haushalt nicht gefunden" },
      { status: 404 }
    );
  }

  const realHouseholdId = targetHousehold.id;

  // 6. Hash auflösen: Alle Bewohner des Haushalts laden und Hash vergleichen
  const { data: householdMembers } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", realHouseholdId);

  if (!householdMembers || householdMembers.length === 0) {
    return NextResponse.json(
      { error: "Haushalt nicht gefunden" },
      { status: 404 }
    );
  }

  // Bewohner finden, dessen Hash mit hashedId übereinstimmt
  const targetMember = householdMembers.find(
    (m) => hashUserId(m.user_id) === hashedId
  );

  if (!targetMember) {
    return NextResponse.json(
      { error: "Bewohner nicht gefunden" },
      { status: 404 }
    );
  }

  // 7. Selbst-Anfrage verhindern
  if (targetMember.user_id === user.id) {
    return NextResponse.json(
      { error: "Sie können sich nicht selbst eine Anfrage senden" },
      { status: 400 }
    );
  }

  // 8. Verbindung erstellen (mit echter Household-ID)
  const { data: connection, error: insertError } = await supabase
    .from("neighbor_connections")
    .insert({
      requester_id: user.id,
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
      return NextResponse.json(
        { error: "Es besteht bereits eine Verbindung oder Anfrage mit diesem Nachbarn" },
        { status: 409 }
      );
    }

    console.error(
      "[api/quarter/residents/request] Insert fehlgeschlagen:",
      insertError
    );
    return NextResponse.json(
      { error: "Anfrage konnte nicht erstellt werden" },
      { status: 500 }
    );
  }

  // 9. Notification senden (fire-and-forget)
  // Nutzt die interne /api/notifications/create Route (gleiche Session/Cookies)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${appUrl}/api/notifications/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: request.headers.get("cookie") || "",
    },
    body: JSON.stringify({
      userId: targetMember.user_id,
      type: "connection_request",
      title: "Neue Kontaktanfrage",
      body: "Ein Nachbar möchte mit Ihnen in Kontakt treten",
      referenceId: connection.id,
      referenceType: "neighbor_connection",
    }),
  }).catch(() => {
    // Notification-Fehler ignorieren — Hauptaktion war erfolgreich
  });

  return NextResponse.json(
    { success: true, connectionId: connection.id },
    { status: 201 }
  );
}
