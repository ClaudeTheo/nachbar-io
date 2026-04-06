// API-Route: GET /api/postfach/[id]
// Buerger-Thread-Detail: Root + alle Antworten entschluesselt laden

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { decryptCivicField } from "@/lib/civic/encryption";

export async function GET(
  _request: NextRequest,
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

  const admin = getAdminSupabase();

  // 2. Root-Nachricht laden
  const { data: root, error: rootError } = await admin
    .from("civic_messages")
    .select(
      "id, org_id, citizen_user_id, subject, body_encrypted, status, created_at, thread_id, direction, citizen_read_until",
    )
    .eq("id", id)
    .single();

  if (rootError || !root) {
    return NextResponse.json(
      { error: "Nachricht nicht gefunden" },
      { status: 404 },
    );
  }

  // 3. Pruefen: Thread gehoert diesem Buerger
  if (root.citizen_user_id !== user.id) {
    return NextResponse.json(
      { error: "Keine Berechtigung" },
      { status: 403 },
    );
  }

  // 4. Pruefen: Ist Root (thread_id = id)
  if (root.thread_id !== root.id) {
    return NextResponse.json(
      { error: "Nachricht nicht gefunden" },
      { status: 404 },
    );
  }

  // 5. Antworten laden
  const { data: replies } = await admin
    .from("civic_messages")
    .select("id, body_encrypted, created_at, direction")
    .eq("thread_id", id)
    .neq("id", id)
    .order("created_at", { ascending: true });

  // 6. Org-Name resolven
  const { data: org } = await admin
    .from("civic_organizations")
    .select("name")
    .eq("id", root.org_id)
    .single();

  // 7. Alle entschluesseln
  const messages = [root, ...(replies ?? [])].map((msg) => {
    let body: string;
    try {
      body = decryptCivicField(msg.body_encrypted);
    } catch {
      body = "[Entschluesselung fehlgeschlagen]";
    }
    return {
      id: msg.id,
      direction: msg.direction,
      body,
      created_at: msg.created_at,
    };
  });

  // 8. Unread-Count berechnen
  const staffReplies = (replies ?? []).filter(
    (r) => r.direction === "staff_to_citizen",
  );
  const citizenReadUntil = (root as Record<string, unknown>).citizen_read_until as string | null;
  const unreadCount = citizenReadUntil
    ? staffReplies.filter((r) => new Date(r.created_at) > new Date(citizenReadUntil)).length
    : staffReplies.length;

  return NextResponse.json({
    subject: root.subject,
    status: root.status,
    org_name: org?.name ?? "Unbekannt",
    messages,
    unread_count: unreadCount,
  });
}

export async function PATCH(
  _request: NextRequest,
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

  const admin = getAdminSupabase();

  // 2. Root laden + Ownership pruefen
  const { data: root } = await admin
    .from("civic_messages")
    .select("id, citizen_user_id, thread_id")
    .eq("id", id)
    .single();

  if (!root || root.citizen_user_id !== user.id || root.thread_id !== root.id) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  // 3. citizen_read_until auf jetzt setzen
  await admin
    .from("civic_messages")
    .update({ citizen_read_until: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ marked: true });
}
