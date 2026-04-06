// API-Route: POST /api/postfach/[id]/antwort
// Buerger antwortet im bestehenden Thread

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { encryptCivicField } from "@/lib/civic/encryption";

const MAX_MESSAGES_PER_DAY = 5;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  // 2. Request-Body validieren
  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltiger Request-Body" },
      { status: 400 },
    );
  }

  const messageBody = body.body?.trim();
  if (!messageBody || messageBody.length < 10 || messageBody.length > 2000) {
    return NextResponse.json(
      { error: "Antwort muss zwischen 10 und 2000 Zeichen lang sein" },
      { status: 400 },
    );
  }

  const admin = getAdminSupabase();

  // 3. Root-Nachricht laden
  const { data: root, error: rootError } = await admin
    .from("civic_messages")
    .select("id, org_id, citizen_user_id, subject, thread_id")
    .eq("id", id)
    .single();

  if (rootError || !root) {
    return NextResponse.json(
      { error: "Nachricht nicht gefunden" },
      { status: 404 },
    );
  }

  // 4. Pruefen: Thread gehoert diesem Buerger
  if (root.citizen_user_id !== user.id) {
    return NextResponse.json(
      { error: "Keine Berechtigung" },
      { status: 403 },
    );
  }

  // 5. Pruefen: Ist Root (thread_id = id)
  if (root.thread_id !== root.id) {
    return NextResponse.json(
      { error: "Antworten nur auf Haupt-Nachrichten moeglich" },
      { status: 400 },
    );
  }

  // 6. Rate-Limit: 5 Nachrichten/Antworten pro Tag gesamt
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

  // 7. Body verschluesseln
  const bodyEncrypted = encryptCivicField(messageBody);

  // 8. Antwort einfuegen
  const replyId = crypto.randomUUID();
  const { data: reply, error: insertError } = await admin
    .from("civic_messages")
    .insert({
      id: replyId,
      org_id: root.org_id,
      citizen_user_id: root.citizen_user_id,
      subject: root.subject,
      body_encrypted: bodyEncrypted,
      thread_id: root.id,
      direction: "citizen_to_staff",
      sender_user_id: user.id,
      status: "sent",
    })
    .select("id, created_at")
    .single();

  if (insertError) {
    console.error("[postfach/antwort] Insert fehlgeschlagen:", insertError.message);
    return NextResponse.json(
      { error: "Antwort konnte nicht gesendet werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: reply }, { status: 201 });
}
