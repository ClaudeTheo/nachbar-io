// GET + POST /api/prevention/messages
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getMessagesForUser,
  sendIndividual,
  markAsRead,
} from "@/modules/praevention/services/messages.service";

// GET — Eigene Nachrichten laden
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const courseId = request.nextUrl.searchParams.get("courseId") ?? undefined;
  const messages = await getMessagesForUser(user.id, courseId);
  return NextResponse.json(messages);
}

// POST — Einzelnachricht senden (Kursleiter) oder als gelesen markieren
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  let body: {
    action?: "send" | "markRead";
    courseId?: string;
    recipientId?: string;
    subject?: string;
    message?: string;
    messageId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Format" }, { status: 400 });
  }

  if (body.action === "markRead" && body.messageId) {
    await markAsRead(body.messageId);
    return NextResponse.json({ success: true });
  }

  // Einzelnachricht senden
  if (!body.courseId || !body.recipientId || !body.message) {
    return NextResponse.json(
      { error: "courseId, recipientId und message sind erforderlich" },
      { status: 400 },
    );
  }

  // Kursleiter-Berechtigung pruefen
  const { data: course } = await supabase
    .from("prevention_courses")
    .select("id")
    .eq("id", body.courseId)
    .eq("instructor_id", user.id)
    .maybeSingle();

  if (!course) {
    return NextResponse.json(
      { error: "Nur Kursleiter duerfen Nachrichten senden" },
      { status: 403 },
    );
  }

  const msg = await sendIndividual(
    body.courseId,
    user.id,
    body.recipientId,
    body.subject ?? "",
    body.message,
  );

  return NextResponse.json(msg, { status: 201 });
}
