// GET /api/hilfe/yearly-report?year=2026&type=helper|resident&format=pdf|csv
// Jahresabrechnung als PDF oder CSV herunterladen
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  parseYearlyReportParams,
  getYearlyReport,
} from "@/modules/hilfe/services/yearly-report.service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 },
      );

    const params = parseYearlyReportParams(request.nextUrl.searchParams);
    const result = await getYearlyReport(supabase, user.id, params);

    return new NextResponse(result.data as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    return handleServiceError(error);
  }
}
