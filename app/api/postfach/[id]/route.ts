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
      "id, org_id, citizen_user_id, subject, body_encrypted, status, created_at, thread_id, direction",
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

  return NextResponse.json({
    subject: root.subject,
    status: root.status,
    org_name: org?.name ?? "Unbekannt",
    messages,
  });
}
