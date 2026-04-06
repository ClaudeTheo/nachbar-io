// API-Route: GET /api/postfach/[id]/attachments/[attachmentId]
// Buerger-Download: Prueft Ownership, generiert Signed URL, 302 Redirect

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createSignedDownloadUrl } from "@/lib/civic/attachment-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id, attachmentId } = await params;

  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const admin = getAdminSupabase();

  // 2. Root-Nachricht laden + Ownership pruefen
  const { data: root } = await admin
    .from("civic_messages")
    .select("id, citizen_user_id, thread_id")
    .eq("id", id)
    .single();

  if (!root || root.citizen_user_id !== user.id || root.thread_id !== root.id) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  // 3. Attachment laden
  const { data: attachment } = await admin
    .from("civic_message_attachments")
    .select("id, message_id, storage_path, filename")
    .eq("id", attachmentId)
    .single();

  if (!attachment) {
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
  }

  // 4. Pruefen: Attachment-Message gehoert zu diesem Thread
  const { data: msg } = await admin
    .from("civic_messages")
    .select("id")
    .eq("id", attachment.message_id)
    .eq("thread_id", id)
    .single();

  if (!msg) {
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
  }

  // 5. Signed URL generieren + Redirect
  const { url, error } = await createSignedDownloadUrl(admin, attachment.storage_path);
  if (error || !url) {
    return NextResponse.json({ error: error ?? "Download fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.redirect(url);
}
