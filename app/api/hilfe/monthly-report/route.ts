// GET /api/hilfe/monthly-report?resident_id=X&month=2026-03 — Sammelabrechnung laden
// POST /api/hilfe/monthly-report — Sammelabrechnung generieren + PDF speichern
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listMonthlyReports,
  generateMonthlyReportForResident,
} from "@/modules/hilfe/services/hilfe-billing.service";

export async function GET(request: NextRequest) {
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

    const residentId = request.nextUrl.searchParams.get("resident_id");
    const month = request.nextUrl.searchParams.get("month");

    const reports = await listMonthlyReports(
      supabase,
      user.id,
      residentId,
      month,
    );
    return NextResponse.json(reports);
  } catch (error) {
    return handleServiceError(error);
  }
}

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

    const { resident_id, month_year } = await request.json();
    const report = await generateMonthlyReportForResident(
      supabase,
      user.id,
      resident_id,
      month_year,
    );
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
