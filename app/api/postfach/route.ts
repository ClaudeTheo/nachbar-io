// API-Route: GET + POST /api/postfach
// GET: Eigene Threads des Buergers auflisten
// POST: Buerger sendet eine Nachricht an die zustaendige Kommune

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { encryptCivicField } from "@/lib/civic/encryption";

const MAX_MESSAGES_PER_DAY = 5;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const admin = getAdminSupabase();

  // Alle Nachrichten des Buergers laden (als Thread-Owner)
  const { data, error } = await admin
    .from("civic_messages")
    .select("id, subject, status, created_at, org_id, thread_id, direction, citizen_read_until")
    .eq("citizen_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allMessages = data ?? [];

  // Nur Roots (thread_id = id)
  const roots = allMessages.filter((m) => m.thread_id === m.id);

  // Org-IDs sammeln + Namen resolven
  const orgIds = [...new Set(roots.map((r) => r.org_id))];
  const { data: orgs } = await admin
    .from("civic_organizations")
    .select("id, name")
    .in("id", orgIds);
  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  // Pro Root: Antwort-Info + Unread-Count
  const threads = roots.map((root) => {
    const staffReplies = allMessages.filter(
      (m) => m.thread_id === root.id && m.id !== root.id && m.direction === "staff_to_citizen",
    );
    const citizenReadUntil = (root as Record<string, unknown>).citizen_read_until as string | null;
    const unreadCount = citizenReadUntil
      ? staffReplies.filter((r) => new Date(r.created_at) > new Date(citizenReadUntil)).length
      : staffReplies.length;

    return {
      id: root.id,
      subject: root.subject,
      status: root.status,
      created_at: root.created_at,
      org_name: orgMap.get(root.org_id) ?? "Unbekannt",
      has_reply: staffReplies.length > 0,
      unread_count: unreadCount,
    };
  });

  return NextResponse.json(threads);
}

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

  // 7. Nachricht in civic_messages speichern (thread_id = id = Selbstreferenz)
  const messageId = crypto.randomUUID();
  const { data: message, error } = await admin
    .from("civic_messages")
    .insert({
      id: messageId,
      org_id: org.id,
      citizen_user_id: user.id,
      subject,
      body_encrypted: bodyEncrypted,
      thread_id: messageId,
      direction: "citizen_to_staff",
      sender_user_id: user.id,
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
