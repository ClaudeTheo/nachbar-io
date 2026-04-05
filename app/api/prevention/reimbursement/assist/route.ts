// POST /api/prevention/reimbursement/assist
// Angehoerigen um Hilfe bei Erstattung bitten
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const { enrollmentId, caregiverId } = await req.json();

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "enrollmentId erforderlich" },
        { status: 400 },
      );
    }

    // Pruefen ob Enrollment dem User gehoert
    const { data: enrollment } = await supabase
      .from("prevention_enrollments")
      .select("id, course_id")
      .eq("id", enrollmentId)
      .eq("user_id", user.id)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: "Einschreibung nicht gefunden" },
        { status: 404 },
      );
    }

    // Nachrichten-Benachrichtigung an Angehoerigen senden (via prevention_messages)
    const adminDb = getAdminSupabase();

    // Bewohner-Name laden
    const { data: resident } = await adminDb
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const senderName = resident?.display_name || "Ein Bewohner";

    if (caregiverId) {
      // Direkte Nachricht an gewaehlten Angehoerigen
      await adminDb.from("prevention_messages").insert({
        course_id: enrollment.course_id,
        sender_id: user.id,
        recipient_id: caregiverId,
        message_type: "system_reminder",
        subject: "Hilfe bei Erstattung",
        body: `${senderName} bittet Sie um Hilfe bei der Einreichung der Erstattung für den Präventionskurs. Bitte helfen Sie beim Einreichen der Bescheinigung bei der Krankenkasse.`,
      });
    } else {
      // An alle verknuepften Angehoerigen
      const { data: links } = await adminDb
        .from("caregiver_links")
        .select("caregiver_id")
        .eq("resident_id", user.id)
        .is("revoked_at", null);

      if (links && links.length > 0) {
        const messages = links.map((link) => ({
          course_id: enrollment.course_id,
          sender_id: user.id,
          recipient_id: link.caregiver_id,
          message_type: "system_reminder" as const,
          subject: "Hilfe bei Erstattung",
          body: `${senderName} bittet Sie um Hilfe bei der Einreichung der Erstattung für den Präventionskurs. Bitte helfen Sie beim Einreichen der Bescheinigung bei der Krankenkasse.`,
        }));

        await adminDb.from("prevention_messages").insert(messages);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reimbursement assist error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
