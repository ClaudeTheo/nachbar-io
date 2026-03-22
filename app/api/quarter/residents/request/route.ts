// app/api/quarter/residents/request/route.ts
// Nachbar.io — Kontaktanfrage senden (Chat-Anfrage-Browser)
// Spam-Schutz: max. 3 ausstehende Anfragen pro Nutzer
// Hash-Aufloesung: Anonyme ID → echter User via HMAC-Vergleich

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";

// Hash-Geheimnis — muss identisch sein mit GET /api/quarter/residents
const HASH_SECRET =
  process.env.RESIDENT_HASH_SECRET || "nachbar-io-resident-hash-2026";

/** Erzeugt eine anonymisierte 16-Zeichen-Hex-ID aus der User-UUID */
function hashUserId(userId: string): string {
  return createHmac("sha256", HASH_SECRET)
    .update(userId)
    .digest("hex")
    .slice(0, 16);
}

// Maximale Anzahl gleichzeitig offener Anfragen
const MAX_PENDING_REQUESTS = 3;

export async function POST(request: NextRequest) {
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

  // 4. Hash aufloesen: Alle Bewohner des Haushalts laden und Hash vergleichen
  const { data: householdMembers } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);

  if (!householdMembers || householdMembers.length === 0) {
    return NextResponse.json(
      { error: "Haushalt nicht gefunden" },
      { status: 404 }
    );
  }

  // Bewohner finden, dessen Hash mit hashedId uebereinstimmt
  const targetMember = householdMembers.find(
    (m) => hashUserId(m.user_id) === hashedId
  );

  if (!targetMember) {
    return NextResponse.json(
      { error: "Bewohner nicht gefunden" },
      { status: 404 }
    );
  }

  // 5. Selbst-Anfrage verhindern
  if (targetMember.user_id === user.id) {
    return NextResponse.json(
      { error: "Sie können sich nicht selbst eine Anfrage senden" },
      { status: 400 }
    );
  }

  // 6. Verbindung erstellen
  const { data: connection, error: insertError } = await supabase
    .from("neighbor_connections")
    .insert({
      requester_id: user.id,
      target_id: targetMember.user_id,
      message: message.trim(),
      target_household_id: householdId,
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

  // 7. Notification senden (fire-and-forget)
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
