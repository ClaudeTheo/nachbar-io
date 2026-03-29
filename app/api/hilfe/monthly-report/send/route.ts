// POST /api/hilfe/monthly-report/send — Sammelabrechnung per E-Mail senden
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { sendMonthlyReport } from "@/modules/hilfe/services/hilfe-billing.service";

export async function POST(request: NextRequest) {
  try {
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

    const { report_id, to_email } = await request.json();
    const result = await sendMonthlyReport(
      supabase,
      user.id,
      report_id,
      to_email,
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
