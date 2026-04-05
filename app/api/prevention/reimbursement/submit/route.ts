// POST /api/prevention/reimbursement/submit
// Erstattung als eingereicht markieren
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateEnrollment } from "@/modules/praevention/services/enrollments.service";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const { enrollmentId, method } = await req.json();

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "enrollmentId erforderlich" },
        { status: 400 },
      );
    }

    const validMethods = [
      "app_upload",
      "web_upload",
      "email",
      "postal",
      "relative_assisted",
    ];
    if (method && !validMethods.includes(method)) {
      return NextResponse.json(
        { error: "Ungültige Einreichungsmethode" },
        { status: 400 },
      );
    }

    // Pruefen ob Enrollment dem User gehoert
    const { data: enrollment } = await supabase
      .from("prevention_enrollments")
      .select("id, reimbursement_started_at")
      .eq("id", enrollmentId)
      .eq("user_id", user.id)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: "Einschreibung nicht gefunden" },
        { status: 404 },
      );
    }

    await updateEnrollment(enrollmentId, {
      reimbursement_submitted_at: new Date().toISOString(),
      reimbursement_method: method || "app_upload",
      reimbursement_reminder_enabled: true,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reimbursement submit error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
