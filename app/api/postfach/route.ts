// API-Route: POST /api/postfach
// Buerger sendet eine Nachricht an die zustaendige Kommune
// Serverseitige Verschluesselung — kein Secret im Browser

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { encryptCivicField } from "@/lib/civic/encryption";

const MAX_MESSAGES_PER_DAY = 5;

export async function POST(request: NextRequest) {
  // 1. User aus Server-Session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  // 2. Request-Body validieren
  let body: { subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltiger Request-Body" },
      { status: 400 },
    );
  }

  const subject = body.subject?.trim();
  const messageBody = body.body?.trim();

  if (!subject || subject.length < 3 || subject.length > 200) {
    return NextResponse.json(
      { error: "Betreff muss zwischen 3 und 200 Zeichen lang sein" },
      { status: 400 },
    );
  }
  if (!messageBody || messageBody.length < 10 || messageBody.length > 2000) {
    return NextResponse.json(
      { error: "Nachricht muss zwischen 10 und 2000 Zeichen lang sein" },
      { status: 400 },
    );
  }

  const admin = getAdminSupabase();

  // 3. Quarter-ID des Buergers ueber Haushalt ermitteln
  //    (Users-Tabelle hat kein quarter_id — Zuordnung laeuft ueber household_members → households)
  const { data: membership } = await admin
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", user.id)
    .not("verified_at", "is", null)
    .limit(1)
    .single();

  const quarterId = (
    membership?.households as unknown as { quarter_id: string } | null
  )?.quarter_id;

  if (!quarterId) {
    return NextResponse.json(
      { error: "Kein Quartier zugeordnet. Bitte zuerst einem Haushalt beitreten." },
      { status: 400 },
    );
  }

  // 4. Kommune ueber Quarter -> Org Mapping finden
  const { data: orgs } = await admin
    .from("civic_organizations")
    .select("id, name")
    .contains("assigned_quarters", [quarterId])
    .eq("verification_status", "verified")
    .limit(1);

  if (!orgs || orgs.length === 0) {
    return NextResponse.json(
      { error: "Ihre Kommune nutzt nachbar.io noch nicht." },
      { status: 404 },
    );
  }

  const org = orgs[0];

  // 5. Rate-Limit: max 5 Nachrichten pro Tag
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await admin
    .from("civic_messages")
    .select("id", { count: "exact", head: true })
    .eq("citizen_user_id", user.id)
    .gte("created_at", today.toISOString());

  if (count !== null && count >= MAX_MESSAGES_PER_DAY) {
    return NextResponse.json(
      {
        error: `Tageslimit erreicht. Maximal ${MAX_MESSAGES_PER_DAY} Nachrichten pro Tag.`,
      },
      { status: 429 },
    );
  }

  // 6. Body serverseitig verschluesseln
  const bodyEncrypted = encryptCivicField(messageBody);

  // 7. Nachricht in civic_messages speichern
  const { data: message, error } = await admin
    .from("civic_messages")
    .insert({
      org_id: org.id,
      citizen_user_id: user.id,
      subject,
      body_encrypted: bodyEncrypted,
    })
    .select("id, subject, status, created_at")
    .single();

  if (error) {
    console.error("[postfach] Insert fehlgeschlagen:", error.message);
    return NextResponse.json(
      { error: "Nachricht konnte nicht gesendet werden." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { message, org_name: org.name },
    { status: 201 },
  );
}
