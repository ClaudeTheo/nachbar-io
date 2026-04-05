// POST /api/prevention/reimbursement/start
// Erstattungs-Prozess starten — setzt reimbursement_started_at
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

    const { enrollmentId, insuranceConfigId } = await req.json();

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "enrollmentId erforderlich" },
        { status: 400 },
      );
    }

    // Pruefen ob Enrollment dem User gehoert
    const { data: enrollment } = await supabase
      .from("prevention_enrollments")
      .select("id, completed_at, certificate_generated, insurance_config_id")
      .eq("id", enrollmentId)
      .eq("user_id", user.id)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: "Einschreibung nicht gefunden" },
        { status: 404 },
      );
    }

    if (!enrollment.certificate_generated) {
      return NextResponse.json(
        { error: "Zertifikat muss zuerst ausgestellt werden" },
        { status: 400 },
      );
    }

    const updates: Record<string, string> = {
      reimbursement_started_at: new Date().toISOString(),
    };

    if (insuranceConfigId) {
      updates.insurance_config_id = insuranceConfigId;
    }

    await updateEnrollment(enrollmentId, updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reimbursement start error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
